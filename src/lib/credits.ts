import { supabaseAdmin } from './supabase'

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

export async function addCredits(phoneNumber: string, amount: number = 1): Promise<boolean> {
  const phone = normalizePhone(phoneNumber)
  const existing = await getCredits(phone)

  if (existing === 0) {
    const { error } = await supabaseAdmin
      .from('cv_credits')
      .insert({ phone_number: phone, credits: amount })
    return !error
  } else {
    const { error } = await supabaseAdmin
      .from('cv_credits')
      .update({ credits: existing + amount, updated_at: new Date().toISOString() })
      .eq('phone_number', phone)
    return !error
  }
}

export async function deductCredit(phoneNumber: string): Promise<boolean> {
  const phone = normalizePhone(phoneNumber)
  const current = await getCredits(phone)
  if (current <= 0) return false
  const { error } = await supabaseAdmin
    .from('cv_credits')
    .update({ credits: current - 1, updated_at: new Date().toISOString() })
    .eq('phone_number', phone)
  return !error
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
