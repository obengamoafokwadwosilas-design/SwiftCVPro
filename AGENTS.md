# SwiftCVPro — Agent Notes

Next.js 14 App Router, TypeScript. AI-generated CV/cover-letter builder for
the Ghanaian market — email-link identity (no passwords), Paystack
payments, Supabase for storage.

Run `supabase_email_identity.sql`, then `supabase_guest_identity.sql`, in the
Supabase SQL Editor before deploying (the second is required by the
browser-identity release: guest columns, `merge_customers()` and the
`customer_merges` trail). The old phone-based tables remain for legacy data;
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

6. **Google sign-in talks to Google directly — Supabase Auth is not involved**
   (`app/api/auth/google/start` and `/callback`, helpers in
   `src/lib/googleAuth.ts`). It used to go through Supabase Auth as an OAuth
   broker, but then Google's consent screen showed `<project>.supabase.co`
   instead of this site; going direct makes it show our own domain. It needs
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel, and the redirect
   URI `https://www.remarkablecv.com/api/auth/google/callback` registered on
   the OAuth client in Google Cloud. The app session is the existing
   `scv_access` cookie from `customerAuth.ts`; Google sign-in resolves to the
   same `customers` row by email that the email-link flow uses. Don't wire RLS
   to `auth.uid()` or read `auth.users` — every table is keyed on
   `customers.id`. Google refuses OAuth inside embedded in-app browsers
   (WhatsApp/Facebook/Instagram webviews), so the email link must stay as the
   fallback sign-in. **The Google button is currently hidden** (owner's call:
   with the browser as the account, sign-in is rarely needed and the email link
   covers it) — the routes and credentials stay; to restore it, render
   `GoogleSignInButton` again in `CVHistoryModal.tsx` (see the comment there).

7. **The browser is the account until an email is proved ("use first, identify
   later").** Nobody is asked for an email until the last page of the builder,
   and that email is only a *receipt address* (`customers.contact_email` on a
   guest row) plus the job-alerts tick — it is never an identity and is never
   used to look up an account. Ownership of CVs and credits is a signed
   `scv_guest` cookie (`src/lib/guestCookie.ts`, `guest.ts`): a `customers`
   row with `is_guest = true` and a synthetic `g-<hash>@guest.remarkablecv.invalid`
   address. `currentAccess()` returns the signed-in member if there is one, else
   this browser's guest (`access.guest`); routes that act for the visitor call
   `resolveOwner()`, which creates the guest on first use. Credits are spent and
   documents downloaded by that owner, so someone who just paid downloads
   immediately and a stranger typing your address gets nothing of yours.
   Proving an email (emailed link / Google / PIN) *merges* the guest into the
   member row via `merge_customers()` (`adoptBrowserGuest`,
   `adoptGuestsByContact`). Do not "simplify" this back to email-as-identity,
   do not add an endpoint that answers differently for a known address than an
   unknown one, and do not make a guest "signed in" (PINs, the account page and
   the session endpoint's `email` are members-only). A payment's owner is
   recorded in the Paystack metadata and followed through `customer_merges`
   (`liveOwnerId`) if that guest was merged before the payment confirmed.
   The last page has two buttons: "Build my CV" (`intent: 'build'` — pay first,
   never silently falls back to a free preview) and "See a free preview first"
   (`intent: 'preview'`). An unpaid document shows a protected preview
   (watermark outside `#cv-print-area`, copy/print blocked); that is a deterrent
   only — the PDF and Word files are served only for paid documents. **Edit is
   open before paying** (owner's call: people won't pay until their details are
   right); copying out of the editor's fields (`[data-cv-editor]`) is blocked
   while unpaid, typing and pasting in are not.

8. **On phones the results page is a slim top bar (☰ Menu, logo, CV / Letter)
   plus a fixed bottom bar (Edit · Templates · Colour · Unlock/Download)**, so
   the CV gets the screen between them. Templates and Colour open a panel with
   no backdrop on purpose — the CV above changes live as they tap. The zoom view
   shows a *copy of the laid-out page* (`innerHTML` of `#cv-print-area`), not a
   second `CVPreview`: CVPreview measures on-screen sizes for its page breaks,
   so a second live copy rendered while scaled lays its pages out wrong. Desktop
   keeps the original layout (sidebar, Preview/Edit toggle, top Download).

9. **How the PDF page-break problem was finally fixed — keep all five parts.**
   The root cause: page breaks were *planned* in the user's browser but the PDF
   is *drawn* by Api2Pdf's own Chrome, and tiny height differences between the
   two pushed the last line past a fixed-height page box, which sliced it.
   1. **Flow pagination for 14 of 16 designs** (`flowPaginate: true` →
      `getFlowPdfConfig` → the flow branch of `buildPdfHtml`): the PDF is one
      continuous document and the PDF renderer chooses the breaks itself
      (`[data-flow-block] { break-inside: avoid }`, `[data-flow-head]
      { break-after: avoid }`, per-sheet `@page` margins). The engine that
      decides a break is the one that draws it, so clipping is impossible by
      construction; per-page decorations repeat as `position: fixed`.
   2. **Only Meridian and Sterling still use the packer** (two-column with a
      per-page sidebar, which flow can't express). They rely on: metric-
      compatible font fallbacks (item 5 — a Cambria/Georgia fallback once
      swelled text ~20% and clipped), `packBottomSafety: 58`,
      `FINAL_RENDER_GUARD = 18`, `PACK_TOLERANCE = 0`, a heading always placed
      together with its first item, and the ground-truth correction pass that
      re-measures the real on-screen document.
   3. **Every wrappable item is its own block** (`safeBullet`, `summaryChunks`,
      skills/languages rows) so a break can never fall inside one.
   4. **Webfonts are awaited before export** (`document.fonts.ready`, and the
      `data-pagination-ready` flag) so the plan and the PDF use the same font.
   5. **The plan is measured, never hard-coded**: font sizes can change freely
      as long as the font *stacks* stay metric-compatible — the paginator and
      the PDF renderer both re-measure. Changing a font family, not a size, is
      what breaks pagination.
   **The squeeze** (`SQUEEZE_LAST_PAGE`, `SQUEEZE_CSS` in `Paginated`): when
   the converged plan's last page is ≤30% full, the CV is laid out once more
   with line-height 1.4 on the content blocks (`[data-cvb]`, text size
   unchanged) and kept only if it removes a page; otherwise normal spacing is
   restored. `data-tight` and the rule travel inside `#cv-print-area`, so the
   preview, the plan and the PDF all use the same spacing. One attempt per
   CV/template (`squeezeRef.tried`), and `data-pagination-ready` is only set
   after the decision, so export never captures a half-decided layout.
   To check a change without spending Api2Pdf credit, render the captured
   export HTML with local Chrome (puppeteer-core) and test every template for
   page count and text past a page box. The tag `before-cv-font-bump` marks the
   last commit before the CV text sizes were raised.

## Conventions already in place
- No comments explaining *what* code does — only *why*, when non-obvious.
- Don't add speculative abstractions, feature flags, or "just in case"
  error handling for states that can't occur.
- `git commit` messages in this repo are detailed on purpose (rationale +
  what was verified) — match that style rather than one-liners.
