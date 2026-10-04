# SwiftCVPro — Agent Notes

Next.js 14 App Router, TypeScript. AI-generated CV/cover-letter builder for
the Ghanaian market — email-link identity (no passwords), Paystack
payments, Supabase for storage.

Run `supabase_email_identity.sql` in the Supabase SQL Editor before deploying
the email identity flow. The old phone-based tables remain for legacy data;
new customers, credits, history, sessions and payments use the new tables.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build (also runs `tsc` via Next's build)
- `npx tsc --noEmit` — type-check only, fast, run this after any change
- No test suite exists yet.

## Environment variables it needs to run for real
Without these, most routes fail closed (by design — see `src/lib/supabase.ts`,
which throws rather than silently degrading if the Supabase key is missing).

- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only, bypasses RLS
- `ANTHROPIC_API_KEY` — CV/letter generation
- `PAYSTACK_SECRET_KEY` / `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `API2PDF_API_KEY` — PDF rendering (a paid, metered account — do not hammer it with test downloads)
- `RESEND_API_KEY` / `RECOVERY_EMAIL_FROM` — access links and receipts
- `NEXT_PUBLIC_BASE_URL` — canonical URL used in emailed access links
- `ADMIN_SECRET` — gates `/admin` and `/api/admin/*`

If you don't have real values, most UI/logic work can proceed without them —
just expect DB-backed routes (credits, history, payments, PIN) to fail
closed rather than crash.

## Things that look like bugs but are deliberate — please don't "fix" these without asking

1. **Meridian and Sterling templates leave a gap when a bullet doesn't fit
   a page**, instead of splitting it mid-bullet. This was a conscious
   trade-off (see git log: "Fix the real cause of Meridian/Sterling
   clipping"). The alternative (converting them to flow pagination like the
   other 14 templates) would drop the sidebar to page-1-only — a visual
   change the owner explicitly declined. Don't "fix" the gap without
   discussing that trade-off first.

2. **`TESTING_MODE` flags do not exist anymore** — they were removed on
   purpose (credit checks were being bypassed in production). If you see
   any reintroduced, that's a regression, not a feature.

3. **Payment packages are the single source of truth in `src/lib/packages.ts`**
   — GH₵ amounts in pesewas for Paystack. Currently active: Career Ready 39
   — 1 CV (id `single`), Standout Cover Letter 19 — 1 cover letter (id
   `coverletter`), Job Hunter Pack 99 — 3 CVs + 1 cover letter (id
   `hunter`), Job Hunter Max 179 — 6 CVs + 2 cover letters (id
   `huntermax`). No package is flagged `recommended` — a steered "best
   value" pick decides for the customer instead of letting them choose, so
   each paid tier gets its own accent colour instead (teal/indigo/gold —
   see `TIER_ICON_COLOR` in the build and preview pages, and the
   `accent-*` classes in `landing.html`); `single` stays neutral grey
   everywhere. All four show at once on the landing page in a single
   `.pricing-grid` (4 columns on desktop, 2 on tablet, a swipeable
   horizontal strip on mobile) — there is no "view more" toggle hiding any
   of them. The bundle pricing is intentionally close to the per-unit price (e.g.
   Job Hunter Pack's 3 CVs cost only ~GH₵12 less per CV than buying Career
   Ready three times) — this is deliberate, not a missed discount: a deeper
   cut makes it cheap for a group of friends to split one purchase instead
   of each paying individually. The public landing page
   (`public/landing.html`) must mirror the *active* set exactly — it has
   drifted out of sync before and caused a real pricing mismatch bug.

4. **Cover letters use a fixed traditional Ghanaian formal layout**
   (sender block right, recipient block, "Dear Sir/Madam,", bold subject,
   justified body, "Yours faithfully" + name) — not a Western cover-letter
   style, and not template-selectable like CVs. See `src/lib/coverLetter.ts`
   and the `buildFormalCoverLetter` branch in `app/api/export-docx/route.ts`.

5. **The PDF pipeline is genuinely fragile to font-fallback drift.**
   PDFs are rendered by Api2Pdf (a *separate* remote Chrome instance) from
   HTML built in `app/preview/page.tsx`'s `buildPdfHtml`. If a font stack's
   fallback fonts render text a different size than the primary webfont,
   the page-break plan (computed in the browser) can drift from what
   Api2Pdf actually draws, causing clipped or gapped pages. Keep font
   stacks metric-compatible (see `BODY_SERIF`/`BODY_SANS` in
   `src/components/CVPreview.tsx` for the reasoning) if you touch fonts.

6. **Google sign-in (`/account`, `app/api/auth/google/callback`) uses Supabase
   Auth (GoTrue) only as a disposable OAuth broker** — it does the Google
   handshake and hands back a verified email, then its session is discarded
   immediately. The real app session is still the existing `scv_access`
   cookie from `customerAuth.ts`; Google sign-in resolves to the same
   `customers` row by email that the email-link flow already uses. Don't
   wire RLS to `auth.uid()` or read `auth.users` — that would require
   migrating every table off `customers.id` and isn't needed.

## Conventions already in place
- No comments explaining *what* code does — only *why*, when non-obvious.
- Don't add speculative abstractions, feature flags, or "just in case"
  error handling for states that can't occur.
- `git commit` messages in this repo are detailed on purpose (rationale +
  what was verified) — match that style rather than one-liners.
