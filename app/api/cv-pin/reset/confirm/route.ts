export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/credits'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPin, hashOtp, isValidPinFormat } from '@/lib/pin'

// Confirms the emailed OTP and sets a new PIN in one step. The OTP row is
// marked used immediately on a correct match so it can never be replayed.
export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, otp, newPin } = await req.json()
    if (!phoneNumber || !otp) return NextResponse.json({ error: 'Phone number and code are required.' }, { status: 400 })
    if (!newPin || !isValidPinFormat(newPin)) return NextResponse.json({ error: 'New PIN must be exactly 4 digits.' }, { status: 400 })
    const phone = normalizePhone(phoneNumber)
    const otpHash = hashOtp(String(otp).trim())

    const { data: resetRow } = await supabaseAdmin
      .from('pin_resets')
      .select('id, expires_at, used')
      .eq('phone_number', phone)
      .eq('otp_hash', otpHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!resetRow) return NextResponse.json({ error: 'Incorrect or expired code.' }, { status: 401 })
    if (resetRow.used) return NextResponse.json({ error: 'This code has already been used. Request a new one.' }, { status: 401 })
    if (new Date(resetRow.expires_at) < new Date()) return NextResponse.json({ error: 'This code has expired. Request a new one.' }, { status: 401 })

    // Mark used first — if the PIN update below fails, the code still can't
    // be replayed; the user just requests a fresh one.
    await supabaseAdmin.from('pin_resets').update({ used: true }).eq('id', resetRow.id)

    const { error } = await supabaseAdmin.from('customer_pins').update({
      pin_hash: hashPin(newPin),
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    }).eq('phone_number', phone)

    if (error) {
      console.error('cv-pin/reset/confirm update error:', error)
      return NextResponse.json({ error: 'Could not set new PIN.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('cv-pin/reset/confirm error:', error)
    return NextResponse.json({ error: 'Could not set new PIN.' }, { status: 500 })
  }
}
