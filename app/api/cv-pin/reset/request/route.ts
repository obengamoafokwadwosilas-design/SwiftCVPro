export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { normalizePhone } from '@/lib/credits'
import { supabaseAdmin } from '@/lib/supabase'
import { generateOtp, hashOtp, OTP_EXPIRY_MINUTES } from '@/lib/pin'

// Real recovery: emails a one-time 6-digit code to the address on file. This
// replaces the reference implementation's approach — a silent 48-hour timer
// with no OTP and no notification to the account owner, which meant anyone
// who merely knew a phone number could queue a reset with the real owner
// never finding out. Here, nothing changes until the person with access to
// that inbox enters the code themselves.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email recovery is not configured. Please contact support.' }, { status: 500 })
    }
    const { phoneNumber } = await req.json()
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    const phone = normalizePhone(phoneNumber)

    const { data: row } = await supabaseAdmin
      .from('customer_pins')
      .select('email')
      .eq('phone_number', phone)
      .maybeSingle()

    if (!row) return NextResponse.json({ error: 'No PIN is set for this number.' }, { status: 404 })
    if (!row.email) return NextResponse.json({ error: 'No recovery email is on file for this number. There is no way to reset this PIN — you can still access your history with the PIN you have, or contact support.' }, { status: 400 })

    const otp = generateOtp()
    const { error: insertErr } = await supabaseAdmin.from('pin_resets').insert({
      phone_number: phone,
      otp_hash: hashOtp(otp),
      expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString(),
    })
    if (insertErr) {
      console.error('pin_resets insert error:', insertErr)
      return NextResponse.json({ error: 'Could not start PIN reset.' }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailErr } = await resend.emails.send({
      from: 'Remarkable CV <onboarding@resend.dev>',
      to: row.email,
      subject: 'Your Remarkable CV PIN reset code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Reset your history PIN</h2>
          <p style="color: #64748b; line-height: 1.6;">Use this code to set a new PIN. It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 20px; background: #f0fdf9; border-radius: 12px; margin: 20px 0;">${otp}</div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">If you didn't request this, you can ignore this email — your PIN will not change unless this code is entered.</p>
        </div>
      `,
    })
    if (emailErr) {
      console.error('Resend send error:', emailErr)
      return NextResponse.json({ error: 'Could not send the reset email.' }, { status: 500 })
    }

    // Deliberately vague about the exact email address in the response (it's
    // already known to the account owner) — avoids confirming account details
    // to whoever is at this endpoint.
    return NextResponse.json({ ok: true, message: 'A reset code has been sent to the email on file.' })
  } catch (error) {
    console.error('cv-pin/reset/request error:', error)
    return NextResponse.json({ error: 'Could not start PIN reset.' }, { status: 500 })
  }
}
