-- ============================================================
-- Run this in your Supabase SQL editor.
-- Adds: idempotent payment tracking, CV history, and the optional
-- phone+PIN history-access system. Safe to run more than once
-- (every statement is IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── cv_credits: add the cover-letter counter if it isn't already there ──
-- (referenced by src/lib/credits.ts; included here so this file is a
-- complete, from-scratch source of truth even though it may already
-- exist in your live database from earlier manual setup.)
alter table cv_credits add column if not exists cover_letter_credits integer not null default 0;


-- ============================================================
-- PAYMENTS — idempotency for Paystack webhook/verify.
-- ============================================================
-- The webhook inserts a row here BEFORE crediting anything, using
-- `on conflict (paystack_reference) do nothing`. If Paystack retries a
-- webhook delivery (which it does), the second insert is a no-op and
-- the route skips crediting — closing the double-credit hole that
-- existed with no idempotency check at all.
create table if not exists payments (
  id                 bigserial primary key,
  phone_number       text not null,
  paystack_reference text not null unique,
  package_id         text not null,
  amount             integer not null,   -- pesewas, as confirmed by Paystack
  cv_credits         integer not null default 0,
  cl_credits         integer not null default 0,
  created_at         timestamptz not null default now()
);
create index if not exists payments_phone_idx on payments (phone_number, created_at desc);

alter table payments enable row level security;
drop policy if exists "service role only" on payments;
create policy "service role only" on payments for all using (false);


-- ============================================================
-- CV HISTORY — every generation, saved permanently.
-- ============================================================
-- raw_input stores what the user originally typed/pasted/uploaded-derived
-- text (plus cvType and which input method), so "Duplicate" can pre-fill
-- the builder without needing to reverse-engineer the generated output.
create table if not exists cv_history (
  id             bigserial primary key,
  phone_number   text not null,
  cv_type        text not null,
  template_id    text not null,
  accent_color   text,
  label          text,                -- optional user-editable job-title label
  generated_cv   jsonb not null,       -- the full GeneratedCV as shown/downloaded
  raw_input      jsonb not null,       -- { inputMethod, rawContent | formData, jobDescription }
  created_at     timestamptz not null default now()
);
create index if not exists cv_history_phone_idx on cv_history (phone_number, created_at desc);

alter table cv_history enable row level security;
drop policy if exists "service role only" on cv_history;
create policy "service role only" on cv_history for all using (false);


-- ============================================================
-- CUSTOMER PINS — optional history-access PIN, phone-keyed.
-- ============================================================
-- pin_hash is `scrypt` salt:hash (see app/api/cv-pin/set/route.ts) — never
-- plaintext. failed_attempts/locked_until enforce rate limiting on verify,
-- unlike the reference implementation this was adapted from, which had none.
create table if not exists customer_pins (
  phone_number    text primary key,
  pin_hash        text not null,
  email           text,               -- required to set a PIN; used for reset OTP
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table customer_pins enable row level security;
drop policy if exists "service role only" on customer_pins;
create policy "service role only" on customer_pins for all using (false);


-- ============================================================
-- PIN RESETS — real email-OTP recovery (not a silent timer).
-- ============================================================
-- otp_hash is a sha256 hash of the 6-digit code, never stored plaintext.
-- A row expires after a short window; `used` prevents replay.
create table if not exists pin_resets (
  id             bigserial primary key,
  phone_number   text not null,
  otp_hash       text not null,
  expires_at     timestamptz not null,
  used           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists pin_resets_phone_idx on pin_resets (phone_number, created_at desc);

alter table pin_resets enable row level security;
drop policy if exists "service role only" on pin_resets;
create policy "service role only" on pin_resets for all using (false);


-- ============================================================
-- ATOMIC CREDIT RPCs — replace the read-then-write race in
-- src/lib/credits.ts's addCredits/deductCredit (two near-simultaneous
-- calls for the same phone could otherwise lose an update) with a
-- single atomic UPDATE/UPSERT, matching the pattern already used by
-- grant_cover_letter_credit / deduct_cover_letter_credit below.
-- ============================================================
create or replace function add_cv_credits(p_phone text, p_amount integer)
returns integer as $$
declare
  remaining integer;
begin
  insert into cv_credits (phone_number, credits)
  values (p_phone, p_amount)
  on conflict (phone_number)
  do update set credits = cv_credits.credits + p_amount, updated_at = now()
  returning credits into remaining;
  return remaining;
end;
$$ language plpgsql;

create or replace function deduct_cv_credit(p_phone text)
returns integer as $$
declare
  remaining integer;
begin
  update cv_credits set credits = credits - 1, updated_at = now()
  where phone_number = p_phone and credits > 0
  returning credits into remaining;
  if remaining is null then return -1; end if;
  return remaining;
end;
$$ language plpgsql;

-- Already referenced by src/lib/credits.ts — included here so this file is
-- a complete source of truth even if these were created manually before.
create or replace function grant_cover_letter_credit(p_phone text, p_amount integer default 1)
returns integer as $$
declare
  remaining integer;
begin
  insert into cv_credits (phone_number, credits, cover_letter_credits)
  values (p_phone, 0, p_amount)
  on conflict (phone_number)
  do update set cover_letter_credits = cv_credits.cover_letter_credits + p_amount, updated_at = now()
  returning cover_letter_credits into remaining;
  return remaining;
end;
$$ language plpgsql;

create or replace function deduct_cover_letter_credit(p_phone text)
returns integer as $$
declare
  remaining integer;
begin
  update cv_credits set cover_letter_credits = cover_letter_credits - 1, updated_at = now()
  where phone_number = p_phone and cover_letter_credits > 0
  returning cover_letter_credits into remaining;
  if remaining is null then return -1; end if;
  return remaining;
end;
$$ language plpgsql;
