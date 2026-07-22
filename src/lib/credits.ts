import { supabaseAdmin } from './supabase'
import type { Package } from './packages'

// Normalise phone — strips spaces, converts 0XX to +233XX
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('0')) cleaned = '+233' + cleaned.slice(1)
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned
  return cleaned
}

export async function getCredits(phoneNumber: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('cv_credits')
    .select('credits')
    .eq('phone_number', normalizePhone(phoneNumber))
    .single()
  if (error || !data) return 0
  return data.credits
}

// Atomic (single SQL statement via add_cv_credits RPC — see
// supabase_history_and_payments.sql) — safe against two concurrent
// purchases for the same phone number, unlike a read-then-write update.
export async function addCredits(phoneNumber: string, amount: number = 1): Promise<boolean> {
  const phone = normalizePhone(phoneNumber)
  const { error } = await supabaseAdmin.rpc('add_cv_credits', { p_phone: phone, p_amount: amount })
  return !error
}

// Atomic (single SQL statement via deduct_cv_credit RPC) — safe against two
// simultaneous requests both trying to spend the same last credit.
export async function deductCredit(phoneNumber: string): Promise<boolean> {
  const phone = normalizePhone(phoneNumber)
  const { data, error } = await supabaseAdmin.rpc('deduct_cv_credit', { p_phone: phone })
  if (error) return false
  return (data as number) >= 0
}

export async function hasCredits(phoneNumber: string): Promise<boolean> {
  return (await getCredits(phoneNumber)) > 0
}

// ── Cover-letter entitlement ─────────────────────────────────────
// A separate counter from the main CV credits. Granted (1) whenever a
// paid CV is generated; redeemed by the "+ Cover Letter" flow so the
// first matching cover letter per paid CV is free.

export async function getCoverLetterCredits(phoneNumber: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('cv_credits')
    .select('cover_letter_credits')
    .eq('phone_number', normalizePhone(phoneNumber))
    .single()
  if (error || !data) return 0
  return data.cover_letter_credits || 0
}

export async function hasCoverLetterCredit(phoneNumber: string): Promise<boolean> {
  return (await getCoverLetterCredits(phoneNumber)) > 0
}

// Grant one cover-letter entitlement. Atomic (single SQL statement via
// grant_cover_letter_credit) — creates the row if the phone has none yet.
export async function grantCoverLetterCredit(phoneNumber: string, amount: number = 1): Promise<boolean> {
  const phone = normalizePhone(phoneNumber)
  const { error } = await supabaseAdmin.rpc('grant_cover_letter_credit', { p_phone: phone, p_amount: amount })
  return !error
}

// Deduct one cover-letter entitlement. Atomic (single SQL statement via
// deduct_cover_letter_credit) — safe against two simultaneous requests
// both trying to spend the same last credit. Returns false if none left.
export async function deductCoverLetterCredit(phoneNumber: string): Promise<boolean> {
  const phone = normalizePhone(phoneNumber)
  const { data, error } = await supabaseAdmin.rpc('deduct_cover_letter_credit', { p_phone: phone })
  if (error) return false
  return (data as number) >= 0
}

// ── Idempotent package crediting ──────────────────────────────────
// Shared by the Paystack webhook AND the client-facing verify-payment
// route, so both confirmation paths use IDENTICAL logic — whichever one
// reaches Paystack/Supabase first wins, the other becomes a harmless
// no-op. Never call addCredits/grantCoverLetterCredit directly for a
// payment; always go through this so every path is guarded the same way.
export async function creditPackageIfNew(
  phone: string,
  reference: string,
  pkg: Package,
  amount: number
): Promise<{ credited: boolean; duplicate: boolean; error?: string }> {
  // Insert the reference into `payments` FIRST. Its UNIQUE constraint means
  // a second caller for the same reference (a webhook retry, or the webhook
  // and a client verify racing each other) fails here and skips crediting.
  const { error: insertErr } = await supabaseAdmin.from('payments').insert({
    phone_number: phone,
    paystack_reference: reference,
    package_id: pkg.id,
    amount,
    cv_credits: pkg.cv,
    cl_credits: pkg.cl,
  })
  if (insertErr) {
    if (insertErr.code === '23505') return { credited: false, duplicate: true }
    return { credited: false, duplicate: false, error: insertErr.message }
  }

  const okCv = await addCredits(phone, pkg.cv)
  const okCl = pkg.cl > 0 ? await grantCoverLetterCredit(phone, pkg.cl) : true
  if (!okCv || !okCl) return { credited: false, duplicate: false, error: 'Failed to add credits' }
  return { credited: true, duplicate: false }
}
