export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { creditPackageIfNew, normalizePhone } from '@/lib/credits'
import { packageByAmount } from '@/lib/packages'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.error('Invalid Paystack signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)

    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true })
    }

    const phoneNumber = event.data?.metadata?.phone_number
    if (!phoneNumber) {
      console.error('No phone number in webhook metadata')
      return NextResponse.json({ error: 'No phone number' }, { status: 400 })
    }
    const phone = normalizePhone(phoneNumber)
    const reference: string | undefined = event.data?.reference
    if (!reference) {
      console.error('No reference in webhook payload — cannot guard against double-crediting')
      return NextResponse.json({ error: 'No reference' }, { status: 400 })
    }

    // Resolve the package from the amount PAYSTACK confirms was charged — never
    // from client metadata — so a tampered request can't claim more than it paid.
    const amount = Number(event.data?.amount)
    const pkg = packageByAmount(amount)
    if (!pkg) {
      // Unknown amount: don't guess credits. Log loudly for reconciliation.
      console.error(`Paystack charge for unrecognised amount ${amount} (phone ${phone}) — no credits granted`)
      return NextResponse.json({ error: 'Unrecognised package amount' }, { status: 400 })
    }

    // Shared with /api/verify-payment — whichever confirmation path reaches
    // this first wins; the other becomes a harmless no-op (see credits.ts).
    const result = await creditPackageIfNew(phone, reference, pkg, amount)
    if (result.duplicate) {
      console.log(`Webhook: reference ${reference} already processed, skipping`)
      return NextResponse.json({ received: true, duplicate: true })
    }
    if (!result.credited) {
      console.error(`Failed to credit ${phone} (pkg ${pkg.id}, ref ${reference}): ${result.error}`)
      return NextResponse.json({ error: result.error || 'Failed to add credits' }, { status: 500 })
    }

    console.log(`Package ${pkg.id} → ${phone}: +${pkg.cv} CV, +${pkg.cl} cover-letter`)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
