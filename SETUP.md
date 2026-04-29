# SwiftCVPro — Setup Guide

## 1. Install dependencies
```bash
npm install
```

## 2. Environment variables
```bash
cp .env.local.example .env.local
```
Then fill in all values in `.env.local`. See below for where to get each key.

## 3. Supabase — run this SQL once
Go to your Supabase project → SQL Editor → paste and run:

```sql
create table cv_credits (
  phone_number text primary key,
  credits integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cv_credits_updated_at
  before update on cv_credits
  for each row execute procedure update_updated_at();
```

## 4. Run locally
```bash
npm run dev
```
Visit http://localhost:3000

## 5. Deploy to Vercel
```bash
npm install -g vercel
vercel
```
Add all environment variables in Vercel dashboard → Settings → Environment Variables.

## 6. Paystack webhook
After deploying, go to Paystack Dashboard → Settings → Webhooks.
Add your webhook URL:
```
https://your-domain.com/api/paystack-webhook
```
Enable the `charge.success` event.

## 7. Encrypt prompts (after final testing)
Once everything is working and tested, encrypt `src/lib/prompts.ts`
using the AES-256-CBC pattern from SwiftEssayPro.

---

## Where to get your keys

| Key | Where |
|-----|-------|
| ANTHROPIC_API_KEY | console.anthropic.com → API Keys |
| SUPABASE_URL | supabase.com → project → Settings → API |
| SUPABASE_ANON_KEY | supabase.com → project → Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | supabase.com → project → Settings → API |
| PAYSTACK_SECRET_KEY | dashboard.paystack.com → Settings → API Keys |
| PAYSTACK_PUBLIC_KEY | dashboard.paystack.com → Settings → API Keys |
