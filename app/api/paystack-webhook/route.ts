export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { creditPackageIfNew, liveOwnerId } from '@/lib/credits'
import { packageByAmount } from '@/lib/packages'
import { sendCustomerLink } from '@/lib/customerMail'
import { mailTargetFor } from '@/lib/customerAuth'
import { alertOwner } from '@/lib/alerts'
import { creditEditPayment } from '@/lib/aiEdits'

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

    const ownerId = event.data?.metadata?.owner_id
    if (!ownerId) {
      console.error('No customer ID in webhook metadata')
      return NextResponse.json({ error: 'No ownerId number' }, { status: 400 })
    }
    const reference: string | undefined = event.data?.reference
    if (!reference) {
      console.error('No reference in webhook payload — cannot guard against double-crediting')
      return NextResponse.json({ error: 'No reference' }, { status: 400 })
    }

    // A GH₵5 AI-edit pack is credited to its document, never as a package.
    if (event.data?.metadata?.kind === 'ai_edits') {
      const edits = await creditEditPayment({ reference, amount: Number(event.data?.amount), currency: event.data?.currency, ownerId, historyId: event.data?.metadata?.history_id })
      if (!edits.ok) return NextResponse.json({ error: edits.error }, { status: 500 })
      return NextResponse.json({ received: true, duplicate: edits.duplicate })
    }

    // Resolve the package from the amount PAYSTACK confirms was charged — never
    // from client metadata — so a tampered request can't claim more than it paid.
    if (event.data?.currency !== 'GHS') return NextResponse.json({ error: 'Invalid payment currency.' }, { status: 400 })
    const amount = Number(event.data?.amount)
    const pkg = packageByAmount(amount)
    if (!pkg) {
      // Unknown amount: don't guess credits. Tell the owner so it gets reconciled.
      await alertOwner('PAID but amount not recognised (webhook)', `reference ${reference}, amount ${amount} pesewas`)
      return NextResponse.json({ error: 'Unrecognised package amount' }, { status: 400 })
    }

    // Shared with /api/verify-payment — whichever confirmation path reaches
    // this first wins; the other becomes a harmless no-op (see credits.ts).
    const creditTo = await liveOwnerId(ownerId)
    if (!creditTo) return NextResponse.json({ error: 'Payment customer could not be found.' }, { status: 400 })
    const result = await creditPackageIfNew(creditTo, reference, pkg, amount)
    // A guest that never left a receipt address has nowhere to mail; that is not a failure.
    const mailTarget = await mailTargetFor(creditTo)
    if (mailTarget && (result.credited || result.duplicate)) {
      try { await sendCustomerLink(mailTarget, { reference, amount, packageName: pkg.name }) } catch (error) {
        console.error('Receipt delivery failed; webhook will retry:', error)
        return NextResponse.json({ error: 'Receipt delivery needs retry.' }, { status: 503 })
      }
    }
    if (result.duplicate) {
      console.log(`Webhook: reference ${reference} already processed, skipping`)
      return NextResponse.json({ received: true, duplicate: true })
    }
    if (!result.credited) {
      await alertOwner('PAID but credits NOT added (webhook)', `reference ${reference}, package ${pkg.id}: ${result.error || 'unknown'}`)
      return NextResponse.json({ error: result.error || 'Failed to add credits' }, { status: 500 })
    }

    console.log(`Package ${pkg.id} → ${ownerId}: +${pkg.cv} CV, +${pkg.cl} cover-letter`)
    return NextResponse.json({ success: true })

  } catch (error) {
    await alertOwner('Paystack webhook crashed', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
