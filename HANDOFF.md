# SwiftCVPro — AI Handoff Prompt

## What This Is
SwiftCVPro is a Ghana-focused AI CV generation SaaS built on Next.js 14, Supabase, Paystack, and Claude API (Sonnet). Users pay once (30 GHS / $5 USD), generate a professional CV, edit it in-session, pick a template, and download as PDF or Word. No login required. Credits tied to phone number.

## Stack
- **Frontend/Backend:** Next.js 14 (App Router) — deployed on Vercel
- **AI:** Claude claude-sonnet-4-20250514 via Anthropic API
- **Database:** Supabase — one table: `cv_credits` (phone_number, credits)
- **Payments:** Paystack (MTN MoMo, Vodafone Cash, Card) — Ghana-first
- **PDF Export:** Puppeteer + @sparticuz/chromium
- **Word Export:** docx (npm)
- **File Extraction:** pdf-parse (PDF), mammoth (DOCX), Claude Vision (images/screenshots)
- **Fonts:** DM Sans + Cormorant Garamond (Google Fonts)

## User Flow
```
Landing page (prototype.html in /public)
→ /build — Step 1: Choose CV type (Professional / Targeted / Academic / Cover Letter)
→ /build — Step 2: Share details (Upload file OR Fill form)
→ /build — Step 3: Phone number → Paystack payment → Generate
→ /preview — Preview CV, switch templates, edit sections, regenerate with AI, download
```

## Key Files
```
src/
  app/
    build/page.tsx          ← Full 3-step form (Step 1, 2, 3)
    preview/page.tsx        ← Preview + Edit + Download
    api/
      extract-content/      ← PDF/DOCX/Image → text
      generate/             ← Claude CV generation
      regenerate/           ← Section rewriting
      export-pdf/           ← Puppeteer PDF (5 templates)
      export-docx/          ← Word export (5 templates)
      paystack-webhook/     ← Adds credits after payment
      check-credits/        ← Phone number credit lookup
  lib/
    prompts.ts              ← All Claude prompts (ENCRYPT BEFORE LAUNCH)
    credits.ts              ← Supabase credit functions
    supabase.ts             ← Supabase client
  types/index.ts            ← All TypeScript types
public/
  prototype.html            ← Complete HTML prototype (landing + app flow)
```

## CV Types
- **professional** — General CV for any job
- **targeted** — Tailored to a specific job description
- **academic** — For lecturers, researchers, postgrad applicants
- **cover_letter** — Application letter

## Templates (5 — no sidebar)
- bold-header (default) — Blue full-width header
- classic — Centered serif, clean rules
- minimal — Name-left contact-right, skill tags
- accent — Amber left bar, warm tone
- academic — Georgia serif, small-caps headers (auto-selected for academic CVs)

## Environment Variables Needed
```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PAYSTACK_SECRET_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
NEXT_PUBLIC_APP_URL
CREDITS_PER_PAYMENT=1
```

## Supabase Setup (run once)
```sql
create table cv_credits (
  phone_number text primary key,
  credits integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## What Still Needs Doing
1. **Landing page as Next.js component** — currently `prototype.html` in /public serves the HTML prototype. Needs to be converted to a proper Next.js page at `/` with all CTAs routing to `/build?type=professional` etc.
2. **Paystack webhook registration** — register `/api/paystack-webhook` in Paystack dashboard after deployment
3. **Test all 5 PDF templates** end to end with real data
4. **Test all 5 DOCX templates** in Word for Windows and Mac
5. **Prompt encryption** — after final testing, encrypt `src/lib/prompts.ts` using AES-256-CBC (same pattern as SwiftEssayPro project)
6. **Rate limiting** — add to `/api/generate` route (max 5 per phone per hour)
7. **Error handling UI** — improve user-facing error messages on the build page

## Design System
- Navy `#0a0f1a` nav background
- Teal `#0d9488` primary accent
- Teal light `#14b8a6` for highlights
- `#f8fafc` page background
- Cormorant Garamond for display headings
- DM Sans for body text
- Tagline: "Expertly Crafted. Instantly Delivered."

## Important Business Rules
- Credits deducted ONLY after successful generation — never on failure
- Phone numbers normalized to +233XXXXXXXXX format
- CV data stored only in sessionStorage — deleted when tab closes
- Academic CV auto-selects Academic template on preview page
- Job description box only shown for Targeted CV and Cover Letter types
- Upload accepts PDF, DOCX, JPG, PNG, WEBP (screenshots, WhatsApp forwards)

## To Run Locally
```bash
npm install
cp .env.local.example .env.local
# fill in keys
npm run dev
```
