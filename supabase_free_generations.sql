-- Free-preview generation cap: lets anyone generate a CV/cover letter for
-- free (no paid credits required) up to a small cap, enforced against BOTH
-- phone number and email independently, so hitting the cap on either
-- identity blocks further free generation on that identity. A paying
-- customer (real credits > 0) bypasses this entirely — see src/lib/
-- freeGenerations.ts and the callers in app/api/generate/route.ts and
-- app/api/generate-cover-letter/route.ts.
--
-- Deliberately NOT built on src/lib/rateLimit.ts's in-memory map: that map
-- is per-process and Vercel serverless instances don't share memory, so it
-- can't enforce a real "5 free, ever" ceiling. This needs to live in
-- Postgres, the same way credits themselves are enforced.
--
-- Run this once in the Supabase SQL editor, same convention as
-- supabase_setup.sql / supabase_history_and_payments.sql (no migration
-- tool in this project).

create table if not exists free_generation_usage (
  identity_type  text not null check (identity_type in ('phone','email')),
  identity_value text not null,
  cv_uses        integer not null default 0,
  cl_uses        integer not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (identity_type, identity_value)
);

alter table free_generation_usage enable row level security;
drop policy if exists "service role only" on free_generation_usage;
create policy "service role only" on free_generation_usage for all using (false);

-- Atomically checks both identities against the cap and, if under it,
-- records the use against both rows in one transaction. `for update` locks
-- the two rows for the duration of the transaction so two concurrent calls
-- for the same phone or email serialize correctly, the same race-safety
-- goal as the existing deduct_cv_credit RPC (which uses a single-statement
-- UPDATE...WHERE instead, sufficient there since it only ever touches one
-- row per call).
--
-- Returns the new use count (1-indexed) on success, or -1 if either
-- identity is already at/over the cap.
create or replace function consume_free_generation(
  p_phone text,
  p_email text,
  p_is_cover_letter boolean,
  p_cap integer
) returns integer as $$
declare
  phone_uses integer;
  email_uses integer;
begin
  insert into free_generation_usage (identity_type, identity_value)
    values ('phone', p_phone) on conflict do nothing;
  insert into free_generation_usage (identity_type, identity_value)
    values ('email', p_email) on conflict do nothing;

  select case when p_is_cover_letter then cl_uses else cv_uses end into phone_uses
    from free_generation_usage where identity_type = 'phone' and identity_value = p_phone for update;
  select case when p_is_cover_letter then cl_uses else cv_uses end into email_uses
    from free_generation_usage where identity_type = 'email' and identity_value = p_email for update;

  if phone_uses >= p_cap or email_uses >= p_cap then
    return -1;
  end if;

  if p_is_cover_letter then
    update free_generation_usage set cl_uses = cl_uses + 1, updated_at = now()
      where (identity_type, identity_value) in (('phone', p_phone), ('email', p_email));
  else
    update free_generation_usage set cv_uses = cv_uses + 1, updated_at = now()
      where (identity_type, identity_value) in (('phone', p_phone), ('email', p_email));
  end if;

  return greatest(phone_uses, email_uses) + 1;
end;
$$ language plpgsql;
