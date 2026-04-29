export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { addCredits, normalizePhone } from '@/lib/credits'

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
    const creditsToAdd = parseInt(process.env.CREDITS_PER_PAYMENT || '1')
    const success = await addCredits(phone, creditsToAdd)

    if (!success) {
      console.error('Failed to add credits for', phone)
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
    }

    console.log(`Credits added: ${creditsToAdd} → ${phone}`)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
