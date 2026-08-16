import { supabaseAdmin } from './supabase'
import { normalizePhone } from './phone'

// How many free generations one identity (phone OR email) gets before
// needing paid credits. Two, not one — a single unlucky first generation
// (messy input, awkward phrasing) shouldn't be someone's only look at the
// product; they never get a second first impression otherwise. The
// abuse-resistance comes from requiring a fresh phone AND fresh email to
// unlock more, not from starving legitimate users down to one try. Tune
// here only; nothing else references these numbers.
export const FREE_CV_CAP = 2
export const FREE_COVER_LETTER_CAP = 2

// Records one free generation against BOTH the phone and email identities,
// atomically, via consume_free_generation (see supabase_free_generations.sql).
// Returns allowed:false if EITHER identity is already at its cap — a
// determined free-rider can't dodge the cap by only cycling one of the two.
//
// Callers must check hasCredits/hasCoverLetterCredit FIRST and skip this
// entirely for paying customers — this cap only exists to bound cost from
// non-paying traffic, not to limit anyone who's already bought credits.
export async function consumeFreeGeneration(
  phoneNumber: string,
  email: string,
  isCoverLetterDoc: boolean
): Promise<{ allowed: boolean; used: number }> {
  const phone = normalizePhone(phoneNumber)
  const normalizedEmail = email.trim().toLowerCase()
  const cap = isCoverLetterDoc ? FREE_COVER_LETTER_CAP : FREE_CV_CAP

  const { data, error } = await supabaseAdmin.rpc('consume_free_generation', {
    p_phone: phone,
    p_email: normalizedEmail,
    p_is_cover_letter: isCoverLetterDoc,
    p_cap: cap,
  })
  // Fail OPEN, deliberately. This cap only bounds our own API cost from
  // non-paying traffic — it is NOT what protects revenue; the download
  // paywall (app/api/export-pdf, app/api/export-docx) does that, and it
  // still applies no matter what happens here. Failing closed would turn any
  // hiccup in this one query — or this table/RPC simply not existing yet —
  // into a total outage of the core funnel for every non-paying visitor,
  // while the worst case of failing open is some extra generation cost with
  // every download still fully gated. Logged loudly so it can't go unnoticed.
  if (error) {
    console.error('consume_free_generation failed — free-generation cap NOT enforced for this request:', error.message)
    return { allowed: true, used: 0 }
  }
  const used = data as number
  return used === -1 ? { allowed: false, used: cap } : { allowed: true, used }
}

// Gives back a use taken by consumeFreeGeneration when the generation it was
// taken for then failed. The use has to be taken up front (so parallel
// requests can't all slip past the cap at once), which means without this a
// server-side failure would silently cost someone one of their few free
// tries and give them nothing back. Best-effort: a failed refund is logged,
// never surfaced, and never blocks the error response the user is waiting on.
export async function refundFreeGeneration(
  phoneNumber: string,
  email: string,
  isCoverLetterDoc: boolean
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc('refund_free_generation', {
      p_phone: normalizePhone(phoneNumber),
      p_email: email.trim().toLowerCase(),
      p_is_cover_letter: isCoverLetterDoc,
    })
    if (error) console.error('refund_free_generation failed:', error.message)
  } catch (err) {
    console.error('refund_free_generation threw:', err)
  }
}
