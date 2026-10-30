export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { setGuestContact } from '@/lib/guest'
import { isValidEmail, normalizeEmail } from '@/lib/email'
import { clientIp, rateLimit } from '@/lib/rateLimit'
import { AI_EDIT_PACK } from '@/lib/packages'
import { aiEditsLeft } from '@/lib/aiEdits'

// Starts the GH₵5 payment for more AI edits on one document. Same shape as
// /api/initiate-payment; the transaction's metadata names the document and
// marks it as an edit pack so the webhook and /api/verify-payment credit it as
// one — and verify the price themselves, never trusting this metadata for
// anything but which document and whose.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: 'Payment is not configured. Please contact support.' }, { status: 500 })
    const { email, historyId } = await req.json()
    if (!Number.isSafeInteger(historyId) || historyId < 1) return NextResponse.json({ error: 'Unknown document.' }, { status: 400 })
    if (!rateLimit('payment:' + clientIp(req), 10, 60000).allowed) return NextResponse.json({ error: 'Please wait before starting another payment.' }, { status: 429 })

    const owner = await currentAccess()
    if (!owner) return NextResponse.json({ error: 'Open your CV again from My CVs to buy edits.' }, { status: 401 })
    // Only for a document that is theirs and has AI edits switched on.
    if (!(await aiEditsLeft(owner.id, historyId)).available) return NextResponse.json({ error: 'AI edits are not available for this document.' }, { status: 404 })

    const typedEmail = normalizeEmail(email)
    if (owner.guest && isValidEmail(typedEmail) && typedEmail !== owner.email) await setGuestContact(owner.id, typedEmail)
    const payerEmail = isValidEmail(typedEmail) ? typedEmail : owner.email
    if (!payerEmail) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

    const reference = `scv-${crypto.randomBytes(16).toString('hex')}`
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payerEmail, amount: AI_EDIT_PACK.amount, currency: 'GHS', reference,
        callback_url: `${req.nextUrl.origin}/payment-return`,
        metadata: { owner_id: owner.id, kind: 'ai_edits', history_id: historyId },
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.status) {
      console.error('Paystack initialize failed (ai edits):', data)
      return NextResponse.json({ error: data.message || 'Could not start payment.' }, { status: 502 })
    }
    return NextResponse.json({ success: true, authorization_url: data.data.authorization_url, access_code: data.data.access_code, reference })
  } catch (error) {
    console.error('ai-edit-pay error:', error)
    return NextResponse.json({ error: 'Could not start payment.' }, { status: 500 })
  }
}
