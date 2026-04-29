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
