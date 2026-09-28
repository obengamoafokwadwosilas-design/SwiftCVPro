-- Run once in Supabase SQL editor before deploying the email-based application.
-- Legacy phone tables are retained; no test data is deleted or silently assigned to an email.
begin;
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  created_at timestamptz not null default now()
);
create table if not exists public.customer_credits (
  owner_id uuid primary key references public.customers(id),
  credits integer not null default 0 check (credits >= 0),
  cover_letter_credits integer not null default 0 check (cover_letter_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.customer_history (
  id bigserial primary key,
  owner_id uuid not null references public.customers(id),
  cv_type text not null, template_id text not null, accent_color text, label text,
  generated_cv jsonb not null, raw_input jsonb not null,
  download_paid boolean not null default false,
  draft_hash text,
  created_at timestamptz not null default now()
);
create index if not exists customer_history_owner_idx on public.customer_history(owner_id, created_at desc);
create table if not exists public.customer_payments (
  id bigserial primary key,
  owner_id uuid not null references public.customers(id),
  paystack_reference text not null unique, package_id text not null,
  amount integer not null, cv_credits integer not null, cl_credits integer not null,
  created_at timestamptz not null default now()
);
create table if not exists public.customer_pins_v2 (
  owner_id uuid primary key references public.customers(id),
  pin_hash text not null, updated_at timestamptz not null default now()
);
create table if not exists public.customer_pin_attempts (
  bucket text primary key, failures integer not null default 0, locked_until timestamptz
);
create table if not exists public.customer_access_links (
  token_hash text primary key, owner_id uuid not null references public.customers(id),
  expires_at timestamptz not null, used_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.customer_sessions (
  token_hash text primary key, owner_id uuid not null references public.customers(id),
  expires_at timestamptz not null, persistent boolean not null default false,
  verified_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.customer_send_limits (bucket text primary key, last_sent_at timestamptz not null);
create table if not exists public.customer_marketing_preferences (
  owner_id uuid primary key references public.customers(id), opted_in boolean not null default false,
  verified boolean not null default false, consent_text text not null, updated_at timestamptz not null default now()
);
create table if not exists public.customer_generation_usage (
  bucket text primary key, cv_uses integer not null default 0, cl_uses integer not null default 0,
  window_start timestamptz not null default now()
);

create or replace function public.reserve_customer_send(p_bucket text, p_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into customer_send_limits values(p_bucket, now())
  on conflict(bucket) do update set last_sent_at = now()
  where customer_send_limits.last_sent_at < now() - make_interval(secs => p_seconds);
  get diagnostics n = row_count;
  return n = 1;
end; $$;

create or replace function public.consume_customer_link(p_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare customer_id uuid;
begin
  update customer_access_links set used_at = now()
  where token_hash = p_hash and used_at is null and expires_at > now()
  returning owner_id into customer_id;
  if customer_id is not null then
    update customer_marketing_preferences set verified = true where owner_id = customer_id and opted_in;
  end if;
  return customer_id;
end; $$;

create or replace function public.record_customer_pin_attempt(p_bucket text, p_correct boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare r customer_pin_attempts;
begin
  insert into customer_pin_attempts(bucket) values(p_bucket) on conflict do nothing;
  select * into r from customer_pin_attempts where bucket = p_bucket for update;
  if r.locked_until > now() then return false; end if;
  if p_correct then
    update customer_pin_attempts set failures = 0, locked_until = null where bucket = p_bucket;
    return true;
  end if;
  update customer_pin_attempts set failures = case when r.failures >= 4 then 0 else r.failures + 1 end,
    locked_until = case when r.failures >= 4 then now() + interval '15 minutes' else null end where bucket = p_bucket;
  return false;
end; $$;

create or replace function public.adjust_customer_credit(p_owner uuid, p_cv integer, p_cl integer)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into customer_credits(owner_id) values(p_owner) on conflict do nothing;
  update customer_credits set credits = credits + p_cv, cover_letter_credits = cover_letter_credits + p_cl, updated_at = now()
    where owner_id = p_owner and credits + p_cv >= 0 and cover_letter_credits + p_cl >= 0;
  return found;
end; $$;

create or replace function public.credit_customer_payment(p_owner uuid, p_reference text, p_package text, p_amount integer, p_cv integer, p_cl integer)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into customer_payments(owner_id, paystack_reference, package_id, amount, cv_credits, cl_credits)
    values(p_owner, p_reference, p_package, p_amount, p_cv, p_cl) on conflict(paystack_reference) do nothing;
  if not found then return false; end if;
  if not adjust_customer_credit(p_owner, p_cv, p_cl) then
    raise exception 'Credit allocation failed';
  end if;
  return true;
end; $$;

create or replace function public.pay_customer_document(p_owner uuid, p_id bigint, p_cover boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare r customer_history;
begin
  select * into r from customer_history where id = p_id and owner_id = p_owner for update;
  if not found or (r.cv_type = 'cover_letter') <> p_cover then return false; end if;
  if r.download_paid then return true; end if;
  if not adjust_customer_credit(p_owner, case when p_cover then 0 else -1 end, case when p_cover then -1 else 0 end) then return false; end if;
  update customer_history set download_paid = true where id = p_id;
  return true;
end; $$;

create or replace function public.consume_customer_preview(p_email text, p_ip text, p_cover boolean, p_cap integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare e customer_generation_usage; i customer_generation_usage;
begin
  -- Stable lock order prevents concurrent requests from bypassing either limit.
  insert into customer_generation_usage(bucket) values('email:' || p_email) on conflict do nothing;
  insert into customer_generation_usage(bucket) values('ip:' || p_ip) on conflict do nothing;
  select * into e from customer_generation_usage where bucket = 'email:' || p_email for update;
  select * into i from customer_generation_usage where bucket = 'ip:' || p_ip for update;
  if i.window_start < now() - interval '1 hour' then
    update customer_generation_usage set cv_uses = 0, cl_uses = 0, window_start = now() where bucket = i.bucket;
    i.cv_uses := 0; i.cl_uses := 0;
  end if;
  if (case when p_cover then e.cl_uses else e.cv_uses end) >= p_cap
    or i.cv_uses + i.cl_uses >= 20 then return false; end if;
  update customer_generation_usage set cv_uses = cv_uses + case when p_cover then 0 else 1 end,
    cl_uses = cl_uses + case when p_cover then 1 else 0 end where bucket in (e.bucket, i.bucket);
  return true;
end; $$;
create or replace function public.refund_customer_preview(p_email text, p_ip text, p_cover boolean)
returns void language sql security definer set search_path = public as $$
  update customer_generation_usage set cv_uses = greatest(0, cv_uses - case when p_cover then 0 else 1 end),
    cl_uses = greatest(0, cl_uses - case when p_cover then 1 else 0 end)
    where bucket in ('email:' || p_email, 'ip:' || p_ip);
$$;

do $$
declare t text; f regprocedure;
begin
  foreach t in array array['customers','customer_credits','customer_history','customer_payments','customer_pins_v2',
    'customer_pin_attempts','customer_access_links','customer_sessions','customer_send_limits','customer_marketing_preferences','customer_generation_usage']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  for f in select oid::regprocedure from pg_proc where pronamespace = 'public'::regnamespace and proname in
    ('reserve_customer_send','consume_customer_link','record_customer_pin_attempt','adjust_customer_credit',
     'credit_customer_payment','pay_customer_document','consume_customer_preview','refund_customer_preview')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
revoke all on sequence public.customer_history_id_seq, public.customer_payments_id_seq from anon, authenticated;
grant usage, select on sequence public.customer_history_id_seq, public.customer_payments_id_seq to service_role;
commit;
