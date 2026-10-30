-- AI edits ("Edit with RemarkableCV"): every saved CV gets one free AI edit,
-- and GH₵5 buys two more for that CV. Additive only — nothing existing is
-- changed. Run once in the Supabase SQL Editor. Until it has been run, the app
-- simply doesn't offer AI edits (the status check finds nothing and the
-- option stays hidden), so it is safe to deploy before or after.
begin;

alter table public.customer_history
  add column if not exists ai_edits_used integer not null default 0,
  add column if not exists ai_edits_bought integer not null default 0;

-- One row per paid edit pack. The unique Paystack reference is what makes
-- crediting happen exactly once, however many times a payment is confirmed.
create table if not exists public.customer_ai_edit_payments (
  id bigserial primary key,
  owner_id uuid not null references public.customers(id),
  history_id bigint not null references public.customer_history(id),
  paystack_reference text not null unique,
  amount integer not null, edits integer not null,
  created_at timestamptz not null default now()
);

-- Edits left on a document (null when it isn't this owner's).
create or replace function public.ai_edits_left(p_owner uuid, p_id bigint)
returns integer language plpgsql security definer set search_path = public as $$
declare r customer_history;
begin
  select * into r from customer_history where id = p_id and owner_id = p_owner;
  if not found then return null; end if;
  return greatest(1 + r.ai_edits_bought - r.ai_edits_used, 0);
end; $$;

-- Uses one edit, atomically: false when none are left or the document isn't theirs.
create or replace function public.take_ai_edit(p_owner uuid, p_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare r customer_history;
begin
  select * into r from customer_history where id = p_id and owner_id = p_owner for update;
  if not found then return false; end if;
  if r.ai_edits_used >= 1 + r.ai_edits_bought then return false; end if;
  update customer_history set ai_edits_used = ai_edits_used + 1 where id = p_id;
  return true;
end; $$;

-- Hands an edit back when the AI call failed.
create or replace function public.refund_ai_edit(p_owner uuid, p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update customer_history set ai_edits_used = greatest(ai_edits_used - 1, 0) where id = p_id and owner_id = p_owner;
end; $$;

-- Credits a paid pack, once per Paystack reference: false if that reference
-- was already credited. Raises (rolling the payment row back) if the document
-- can't be found, so a payment is never recorded without its edits.
create or replace function public.credit_ai_edits(p_owner uuid, p_id bigint, p_reference text, p_amount integer, p_edits integer)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into customer_ai_edit_payments(owner_id, history_id, paystack_reference, amount, edits)
    values(p_owner, p_id, p_reference, p_amount, p_edits) on conflict(paystack_reference) do nothing;
  if not found then return false; end if;
  update customer_history set ai_edits_bought = ai_edits_bought + p_edits where id = p_id and owner_id = p_owner;
  if not found then raise exception 'Document not found for AI edit credit'; end if;
  return true;
end; $$;

-- Same locking-down as the rest of the customer tables: only the server's
-- service role can touch them.
alter table public.customer_ai_edit_payments enable row level security;
revoke all on public.customer_ai_edit_payments from anon, authenticated;
grant all on public.customer_ai_edit_payments to service_role;
revoke all on sequence public.customer_ai_edit_payments_id_seq from anon, authenticated;
grant usage, select on sequence public.customer_ai_edit_payments_id_seq to service_role;

do $$
declare f regprocedure;
begin
  for f in select oid::regprocedure from pg_proc where pronamespace = 'public'::regnamespace and proname in
    ('ai_edits_left','take_ai_edit','refund_ai_edit','credit_ai_edits')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

commit;
