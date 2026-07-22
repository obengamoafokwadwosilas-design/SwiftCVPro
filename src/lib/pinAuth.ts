import { supabaseAdmin } from './supabase'
import { verifyPinHash, isValidPinFormat, MAX_PIN_ATTEMPTS, PIN_LOCKOUT_MINUTES } from './pin'

// The one place that actually checks a PIN against the database, with rate
// limiting enforced. Both /api/cv-pin/verify (the modal's own "unlock" step)
// AND every CV-history route call this directly — a client cannot bypass
// the lockout by skipping the separate verify call and hitting a history
// route straight with guesses, because the history route enforces the same
// check itself rather than trusting that verify was called first.
export async function checkHistoryAccess(
  phone: string,
  pin: string | undefined
): Promise<{ ok: boolean; error?: string; status: number }> {
  const { data: row } = await supabaseAdmin
    .from('customer_pins')
    .select('pin_hash, failed_attempts, locked_until')
    .eq('phone_number', phone)
    .maybeSingle()

  // No PIN set for this phone — the owner chose phone-only access. Nothing
  // further to check.
  if (!row) return { ok: true, status: 200 }

  if (!pin) return { ok: false, error: 'This number is protected by a PIN.', status: 401 }
  if (!isValidPinFormat(pin)) return { ok: false, error: 'Enter a 4-digit code.', status: 400 }

  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    const minsLeft = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000)
    return { ok: false, error: `Too many attempts. Try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}.`, status: 429 }
  }

  if (verifyPinHash(pin, row.pin_hash)) {
    await supabaseAdmin.from('customer_pins').update({ failed_attempts: 0, locked_until: null }).eq('phone_number', phone)
    return { ok: true, status: 200 }
  }

  const attempts = (row.failed_attempts || 0) + 1
  const update: Record<string, unknown> = { failed_attempts: attempts }
  if (attempts >= MAX_PIN_ATTEMPTS) {
    update.locked_until = new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60000).toISOString()
    update.failed_attempts = 0
  }
  await supabaseAdmin.from('customer_pins').update(update).eq('phone_number', phone)

  if (attempts >= MAX_PIN_ATTEMPTS) {
    return { ok: false, error: `Too many attempts. Try again in ${PIN_LOCKOUT_MINUTES} minutes.`, status: 429 }
  }
  return { ok: false, error: 'Incorrect PIN.', status: 401 }
}
