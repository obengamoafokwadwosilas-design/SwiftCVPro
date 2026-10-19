export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { currentAccess, resolveOwner } from '@/lib/customerAuth'
import { setGuestContact } from '@/lib/guest'
import { isValidEmail, normalizeEmail } from '@/lib/email'
import { clientIp, rateLimit } from '@/lib/rateLimit'
import { PACKAGES } from '@/lib/packages'

// Creates a Paystack transaction server-side and returns the hosted
// checkout URL + popup access code. Needed (rather than the client-only
// inline.js popup alone) so in-app browsers — WhatsApp/Facebook/Instagram
// webviews, where the popup iframe is known to fail — can be sent straight
// to the hosted authorization_url instead.
//
// What is bought is credited to whoever owns THIS browser (or the signed-in
// member), recorded here in the transaction metadata. The typed email is the
// address Paystack and the receipt use; it never decides whose credits grow, so
// paying in a stranger's name hands nobody their account.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment is not configured. Please contact support.' }, { status: 500 })
    }

    const { email, packageId } = await req.json()
    const typedEmail = normalizeEmail(email)

    const pkg = PACKAGES.find(p => p.id === packageId)
    if (!pkg) return NextResponse.json({ error: 'Unknown package.' }, { status: 400 })

    if (!rateLimit('payment:' + clientIp(req), 10, 60000).allowed) return NextResponse.json({ error: 'Please wait before starting another payment.' }, { status: 429 })

    const existing = await currentAccess()
    if (!existing && !isValidEmail(typedEmail)) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    const owner = existing || await resolveOwner()
    if (owner.guest && isValidEmail(typedEmail) && typedEmail !== owner.email) await setGuestContact(owner.id, typedEmail)
    const payerEmail = isValidEmail(typedEmail) ? typedEmail : owner.email
    if (!payerEmail) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

    // 128 random bits: a reference is also a claim ticket, so it must not be guessable.
    const reference = `scv-${crypto.randomBytes(16).toString('hex')}`
    const origin = req.nextUrl.origin

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: payerEmail,
        amount: pkg.amount,
        currency: 'GHS',
        reference,
        callback_url: `${origin}/payment-return`,
        metadata: { owner_id: owner.id, package_id: pkg.id },
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.status) {
      console.error('Paystack initialize failed:', data)
      return NextResponse.json({ error: data.message || 'Could not start payment.' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference,
    })
  } catch (error) {
    console.error('initiate-payment error:', error)
    return NextResponse.json({ error: 'Could not start payment.' }, { status: 500 })
  }
}
