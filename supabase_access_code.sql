-- Run once in the Supabase SQL editor, BEFORE deploying the access-code release.
-- Additive and re-runnable: existing rows keep working (old PINs are still
-- accepted and upgraded to the new hash on their next successful sign-in).
--
-- Access codes (the 4-digit code that protects CVs and credits) follow the
-- RemarkableSOP rules: lock out guessing per email (5 tries, 15 minutes,
-- doubling each time, up to 24 hours) and per network address (30 failures in
-- 15 minutes), and a merge never loses or replaces a code.
begin;

alter table public.customer_pin_attempts add column if not exists lock_count integer not null default 0;
alter table public.customer_pin_attempts add column if not exists window_started timestamptz;

-- One attempt against both buckets. Returns true only for a correct code while
-- neither bucket is locked. A correct code clears the email bucket's history.
create or replace function public.record_access_code_attempt(p_bucket text, p_ip_bucket text, p_correct boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare r customer_pin_attempts; ip customer_pin_attempts;
begin
  insert into customer_pin_attempts(bucket) values (p_bucket) on conflict do nothing;
  insert into customer_pin_attempts(bucket) values (p_ip_bucket) on conflict do nothing;
  -- Lock both rows in a fixed order so two attempts can't deadlock.
  perform 1 from customer_pin_attempts where bucket in (p_bucket, p_ip_bucket) order by bucket for update;
  select * into r  from customer_pin_attempts where bucket = p_bucket;
  select * into ip from customer_pin_attempts where bucket = p_ip_bucket;

  if ip.window_started is null or ip.window_started < now() - interval '15 minutes' then
    update customer_pin_attempts set failures = 0, window_started = now() where bucket = p_ip_bucket;
    ip.failures := 0;
  end if;

  if r.locked_until > now() or ip.failures >= 30 then return false; end if;

  if p_correct then
    update customer_pin_attempts set failures = 0, locked_until = null, lock_count = 0 where bucket = p_bucket;
    return true;
  end if;

  update customer_pin_attempts set failures = failures + 1 where bucket = p_ip_bucket;
  if r.failures + 1 >= 5 then
    update customer_pin_attempts
       set failures = 0,
           locked_until = now() + least(interval '15 minutes' * power(2, r.lock_count), interval '24 hours'),
           lock_count = r.lock_count + 1
     where bucket = p_bucket;
  else
    update customer_pin_attempts set failures = r.failures + 1 where bucket = p_bucket;
  end if;
  return false;
end; $$;

revoke all on function public.record_access_code_attempt(text, text, boolean) from public, anon, authenticated;
grant execute on function public.record_access_code_attempt(text, text, boolean) to service_role;

-- Same as before, plus: the guest's access code moves to the account it merges
-- into when that account has none, so proving an email never loses the code.
-- An account that already has a code keeps its own (a merge never replaces one).
create or replace function public.merge_customers(p_from uuid, p_to uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c customer_credits; m customer_marketing_preferences;
begin
  if p_from is null or p_to is null or p_from = p_to then return; end if;
  perform 1 from customers where id in (p_from, p_to) order by id for update;
  if not exists (select 1 from customers where id = p_from and is_guest) then return; end if;
  if not exists (select 1 from customers where id = p_to) then return; end if;

  select * into c from customer_credits where owner_id = p_from for update;
  if found then
    insert into customer_credits(owner_id) values (p_to) on conflict do nothing;
    update customer_credits
       set credits = credits + c.credits,
           cover_letter_credits = cover_letter_credits + c.cover_letter_credits,
           updated_at = now()
     where owner_id = p_to;
    delete from customer_credits where owner_id = p_from;
  end if;

  update customer_history  set owner_id = p_to where owner_id = p_from;
  update customer_payments set owner_id = p_to where owner_id = p_from;

  select * into m from customer_marketing_preferences where owner_id = p_from;
  if found then
    if exists (select 1 from customer_marketing_preferences where owner_id = p_to) then
      update customer_marketing_preferences
         set opted_in = opted_in or m.opted_in, updated_at = now()
       where owner_id = p_to;
      delete from customer_marketing_preferences where owner_id = p_from;
    else
      update customer_marketing_preferences set owner_id = p_to where owner_id = p_from;
    end if;
  end if;

  insert into customer_pins_v2(owner_id, pin_hash, updated_at)
    select p_to, pin_hash, updated_at from customer_pins_v2 where owner_id = p_from
    on conflict (owner_id) do nothing;

  insert into customer_merges(from_id, to_id) values (p_from, p_to) on conflict (from_id) do update set to_id = excluded.to_id, merged_at = now();
  delete from customer_sessions     where owner_id = p_from;
  delete from customer_access_links where owner_id = p_from;
  delete from customer_pins_v2      where owner_id = p_from;
  delete from customers             where id = p_from;
end; $$;

revoke all on function public.merge_customers(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_customers(uuid, uuid) to service_role;

commit;
