export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/credits'
import { PACKAGES } from '@/lib/packages'

// Creates a Paystack transaction server-side and returns the hosted
// checkout URL + popup access code. Needed (rather than the client-only
// inline.js popup alone) so in-app browsers — WhatsApp/Facebook/Instagram
// webviews, where the popup iframe is known to fail — can be sent straight
// to the hosted authorization_url instead.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment is not configured. Please contact support.' }, { status: 500 })
    }

    const { phoneNumber, packageId } = await req.json()
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })

    const pkg = PACKAGES.find(p => p.id === packageId)
    if (!pkg) return NextResponse.json({ error: 'Unknown package.' }, { status: 400 })

    const phone = normalizePhone(phoneNumber)
    const reference = `scv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const origin = req.nextUrl.origin

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `${phone.replace('+', '')}@extraordinarycv.com`,
        amount: pkg.amount,
        currency: 'GHS',
        reference,
        callback_url: `${origin}/payment-return`,
        metadata: { phone_number: phone, package_id: pkg.id },
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
