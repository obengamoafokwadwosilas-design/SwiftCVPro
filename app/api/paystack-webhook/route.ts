export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { creditPackageIfNew } from '@/lib/credits'
import { packageByAmount } from '@/lib/packages'
import { supabaseAdmin } from '@/lib/supabase'
import { sendCustomerLink } from '@/lib/customerMail'
import { requireOwner } from '@/lib/customerAuth'

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

    // Resolve the package from the amount PAYSTACK confirms was charged — never
    // from client metadata — so a tampered request can't claim more than it paid.
    if (event.data?.currency !== 'GHS') return NextResponse.json({ error: 'Invalid payment currency.' }, { status: 400 })
    const amount = Number(event.data?.amount)
    const pkg = packageByAmount(amount)
    if (!pkg) {
      // Unknown amount: don't guess credits. Log loudly for reconciliation.
      console.error(`Paystack charge for unrecognised amount ${amount} (ownerId ${ownerId}) — no credits granted`)
      return NextResponse.json({ error: 'Unrecognised package amount' }, { status: 400 })
    }

    // Shared with /api/verify-payment — whichever confirmation path reaches
    // this first wins; the other becomes a harmless no-op (see credits.ts).
    const { data: customer } = await supabaseAdmin.from('customers').select('id, email').eq('id', ownerId).single()
    if (!customer) return NextResponse.json({ error: 'Payment customer could not be found.' }, { status: 400 })
    const result = await creditPackageIfNew(ownerId, reference, pkg, amount)
    if (result.credited || result.duplicate) {
      try { await sendCustomerLink(customer, { reference, amount, packageName: pkg.name }) } catch (error) {
        console.error('Receipt delivery failed; webhook will retry:', error)
        return NextResponse.json({ error: 'Receipt delivery needs retry.' }, { status: 503 })
      }
    }
    if (result.duplicate) {
      console.log(`Webhook: reference ${reference} already processed, skipping`)
      return NextResponse.json({ received: true, duplicate: true })
    }
    if (!result.credited) {
      console.error(`Failed to credit ${ownerId} (pkg ${pkg.id}, ref ${reference}): ${result.error}`)
      return NextResponse.json({ error: result.error || 'Failed to add credits' }, { status: 500 })
    }

    console.log(`Package ${pkg.id} → ${ownerId}: +${pkg.cv} CV, +${pkg.cl} cover-letter`)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
