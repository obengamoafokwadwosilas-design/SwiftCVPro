-- Run this in your Supabase SQL editor

create table if not exists cv_credits (
  phone_number  text primary key,
  credits       integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fast lookups
create index if not exists cv_credits_phone_idx on cv_credits (phone_number);

-- Row level security — only service role can read/write
alter table cv_credits enable row level security;

-- No public access — all operations go through service role key in API routes
create policy "service role only" on cv_credits
  for all using (false);
