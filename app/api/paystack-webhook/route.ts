export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { addCredits, grantCoverLetterCredit, normalizePhone } from '@/lib/credits'
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

    // Resolve the package from the amount PAYSTACK confirms was charged — never
    // from client metadata — so a tampered request can't claim more than it paid.
    const amount = Number(event.data?.amount)
    const pkg = packageByAmount(amount)
    if (!pkg) {
      // Unknown amount: don't guess credits. Log loudly for reconciliation.
      console.error(`Paystack charge for unrecognised amount ${amount} (phone ${phone}) — no credits granted`)
      return NextResponse.json({ error: 'Unrecognised package amount' }, { status: 400 })
    }

    // Grant CV credits, then cover-letter credits (only if the pack includes any).
    const okCv = await addCredits(phone, pkg.cv)
    const okCl = pkg.cl > 0 ? await grantCoverLetterCredit(phone, pkg.cl) : true
    if (!okCv || !okCl) {
      console.error(`Failed to add credits for ${phone} (pkg ${pkg.id}, cv:${okCv} cl:${okCl})`)
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
    }

    console.log(`Package ${pkg.id} → ${phone}: +${pkg.cv} CV, +${pkg.cl} cover-letter`)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
