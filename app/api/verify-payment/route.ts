export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { creditPackageIfNew, normalizePhone } from '@/lib/credits'
import { packageByAmount } from '@/lib/packages'

// Client-facing confirmation path — used (a) as the manual "Verify payment"
// fallback when the Paystack popup was blocked and the user paid in a new
// tab, and (b) on /payment-return after an in-app-browser hosted-checkout
// redirect. Re-derives the package from Paystack's CONFIRMED amount (never
// trusts anything the client sent) and shares the same idempotent-crediting
// guard as the webhook — whichever of the two reaches Supabase first wins.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment is not configured.' }, { status: 500 })
    }
    const { reference } = await req.json()
    if (!reference) return NextResponse.json({ error: 'Missing reference.' }, { status: 400 })

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const data = await res.json()
    if (!res.ok || !data.status) {
      return NextResponse.json({ error: data.message || 'Could not verify payment.' }, { status: 502 })
    }

    const tx = data.data
    if (tx.status !== 'success') {
      return NextResponse.json({ success: false, status: tx.status || 'unknown' })
    }

    const phoneNumber = tx.metadata?.phone_number
    if (!phoneNumber) {
      console.error(`verify-payment: no phone in metadata for reference ${reference}`)
      return NextResponse.json({ error: 'Payment succeeded but has no phone on file. Contact support.' }, { status: 500 })
    }
    const phone = normalizePhone(phoneNumber)

    const amount = Number(tx.amount)
    const pkg = packageByAmount(amount)
    if (!pkg) {
      console.error(`verify-payment: unrecognised amount ${amount} for reference ${reference}`)
      return NextResponse.json({ error: 'Payment succeeded but the amount was not recognised. Contact support.' }, { status: 500 })
    }

    const result = await creditPackageIfNew(phone, reference, pkg, amount)
    if (!result.credited && !result.duplicate) {
      return NextResponse.json({ error: result.error || 'Failed to add credits.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phoneNumber: phone,
      package: pkg.id,
      cv_credits: pkg.cv,
      cl_credits: pkg.cl,
      alreadyProcessed: result.duplicate,
    })
  } catch (error) {
    console.error('verify-payment error:', error)
    return NextResponse.json({ error: 'Could not verify payment.' }, { status: 500 })
  }
}
