export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { customerForEmail } from '@/lib/customerAuth'
import { clientIp, rateLimit } from '@/lib/rateLimit'
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

    const { email, packageId } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

    const pkg = PACKAGES.find(p => p.id === packageId)
    if (!pkg) return NextResponse.json({ error: 'Unknown package.' }, { status: 400 })

    if (!rateLimit('payment:' + clientIp(req), 10, 60000).allowed) return NextResponse.json({ error: 'Please wait before starting another payment.' }, { status: 429 })
    const customer = await customerForEmail(email)
    const reference = `scv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const origin = req.nextUrl.origin

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customer.email,
        amount: pkg.amount,
        currency: 'GHS',
        reference,
        callback_url: `${origin}/payment-return`,
        metadata: { owner_id: customer.id, package_id: pkg.id },
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
