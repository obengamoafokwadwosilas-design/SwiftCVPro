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
  // Fail closed: an error talking to Supabase means we can't confirm this
  // is within the free cap, so don't let it through unchecked.
  if (error) return { allowed: false, used: cap }
  const used = data as number
  return used === -1 ? { allowed: false, used: cap } : { allowed: true, used }
}
