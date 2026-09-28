export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { creditPackageIfNew } from '@/lib/credits'
import { packageByAmount } from '@/lib/packages'
import { supabaseAdmin } from '@/lib/supabase'
import { sendCustomerLink } from '@/lib/customerMail'
import { requireOwner } from '@/lib/customerAuth'

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

    const ownerId = tx.metadata?.owner_id
    if (!ownerId) {
      console.error(`verify-payment: no ownerId in metadata for reference ${reference}`)
      return NextResponse.json({ error: 'Payment succeeded but has no customer on file. Contact support.' }, { status: 500 })
    }

    if (tx.currency !== 'GHS') return NextResponse.json({ error: 'Invalid payment currency.' }, { status: 400 })
    const amount = Number(tx.amount)
    const pkg = packageByAmount(amount)
    if (!pkg) {
      console.error(`verify-payment: unrecognised amount ${amount} for reference ${reference}`)
      return NextResponse.json({ error: 'Payment succeeded but the amount was not recognised. Contact support.' }, { status: 500 })
    }

    const { data: customer } = await supabaseAdmin.from('customers').select('id, email').eq('id', ownerId).single()
    if (!customer) return NextResponse.json({ error: 'Payment customer could not be found.' }, { status: 400 })
    const result = await creditPackageIfNew(ownerId, reference, pkg, amount)
    if (!result.credited && !result.duplicate) {
      return NextResponse.json({ error: result.error || 'Failed to add credits.' }, { status: 500 })
    }

    try { await sendCustomerLink(customer, { reference, amount, packageName: pkg.name }) } catch (error) { console.error('Payment receipt needs retry:', error) }
    return NextResponse.json({
      verificationRequired: !await requireOwner(ownerId),
      success: true,
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
