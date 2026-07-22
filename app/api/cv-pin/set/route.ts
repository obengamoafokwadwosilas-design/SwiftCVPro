export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/credits'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPin, verifyPinHash, isValidPinFormat } from '@/lib/pin'

// Sets or changes the history-access PIN. An email is REQUIRED whenever a
// PIN is set — it's the only way /api/cv-pin/reset can ever recover it, so a
// PIN with no recovery email would be a permanent lockout waiting to happen.
export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, pin, email, oldPin } = await req.json()
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    if (!pin || !isValidPinFormat(pin)) return NextResponse.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 })
    const cleanEmail = String(email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required so your PIN can be recovered if forgotten.' }, { status: 400 })
    }
    const phone = normalizePhone(phoneNumber)

    const { data: existing } = await supabaseAdmin
      .from('customer_pins')
      .select('pin_hash')
      .eq('phone_number', phone)
      .maybeSingle()

    // Changing an existing PIN requires the current one.
    if (existing) {
      if (!oldPin || !isValidPinFormat(oldPin)) {
        return NextResponse.json({ error: 'Your current PIN is required to change it.' }, { status: 401 })
      }
      if (!verifyPinHash(oldPin, existing.pin_hash)) {
        return NextResponse.json({ error: 'Current PIN is incorrect.' }, { status: 401 })
      }
    }

    const pinHash = hashPin(pin)
    const { error } = await supabaseAdmin.from('customer_pins').upsert({
      phone_number: phone,
      pin_hash: pinHash,
      email: cleanEmail,
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      console.error('cv-pin/set upsert error:', error)
      return NextResponse.json({ error: 'Could not save PIN.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('cv-pin/set error:', error)
    return NextResponse.json({ error: 'Could not save PIN.' }, { status: 500 })
  }
}
