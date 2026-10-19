-- Run once in the Supabase SQL editor, BEFORE deploying the browser-identity release.
-- Additive and re-runnable: no existing row or column is changed or removed.
--
-- A "guest" is a customers row owned by a browser (signed cookie), not by an
-- email address. Guests hold the CVs and credits made in that browser until the
-- customer proves an email (emailed link / Google), at which point
-- merge_customers() folds the guest into that email's account.
begin;

alter table public.customers add column if not exists is_guest boolean not null default false;
-- The address typed at the last page: receipt, recovery link and notifications.
-- It is NOT an identity and is never used to look up an account.
alter table public.customers add column if not exists contact_email text;
create index if not exists customers_guest_contact_idx on public.customers (contact_email) where is_guest;

-- Where a merged-away guest went. A payment started by a guest can still be
-- confirmed after that guest signed in elsewhere and was merged; the late
-- confirmation follows this trail instead of failing on a row that is gone.
create table if not exists public.customer_merges (
  from_id uuid primary key,
  to_id uuid not null references public.customers(id),
  merged_at timestamptz not null default now()
);
alter table public.customer_merges enable row level security;
revoke all on public.customer_merges from anon, authenticated;
grant all on public.customer_merges to service_role;

create or replace function public.merge_customers(p_from uuid, p_to uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c customer_credits; m customer_marketing_preferences;
begin
  if p_from is null or p_to is null or p_from = p_to then return; end if;
  -- Lock both rows in a fixed order so two merges can't deadlock.
  perform 1 from customers where id in (p_from, p_to) order by id for update;
  -- Only a guest is ever merged away; a real account is never deleted here.
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

  insert into customer_merges(from_id, to_id) values (p_from, p_to) on conflict (from_id) do update set to_id = excluded.to_id, merged_at = now();
  delete from customer_sessions     where owner_id = p_from;
  delete from customer_access_links where owner_id = p_from;
  delete from customer_pins_v2      where owner_id = p_from;
  delete from customers             where id = p_from;
end; $$;

revoke all on function public.merge_customers(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_customers(uuid, uuid) to service_role;

commit;
