export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { currentAccess, resolveOwner, startSession } from '@/lib/customerAuth'
import { setGuestContact, adoptBrowserGuest } from '@/lib/guest'
import { findOwnerByCode, ownerHasCode, recordCodeAttempt, setOwnerCode } from '@/lib/accessCode'
import { accessCodeProblem } from '@/lib/accessCodeRules'
import { isValidEmail, normalizeEmail } from '@/lib/email'
import { clientIp, rateLimit } from '@/lib/rateLimit'
import { PACKAGES } from '@/lib/packages'

// Creates a Paystack transaction server-side and returns the hosted
// checkout URL + popup access code. Needed (rather than the client-only
// inline.js popup alone) so in-app browsers — WhatsApp/Facebook/Instagram
// webviews, where the popup iframe is known to fail — can be sent straight
// to the hosted authorization_url instead.
//
// What is bought is credited to whoever owns THIS browser (or the signed-in
// member), recorded here in the transaction metadata. The typed email is the
// address Paystack and the receipt use; it never decides whose credits grow, so
// paying in a stranger's name hands nobody their account.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment is not configured. Please contact support.' }, { status: 500 })
    }

    const { email, packageId, accessCode } = await req.json()
    const typedEmail = normalizeEmail(email)

    // A hidden package is still credited if an old payment arrives, but a new
    // one can't be started from a stale link or a hand-made request.
    const pkg = PACKAGES.find(p => p.id === packageId && !p.hidden)
    if (!pkg) return NextResponse.json({ error: 'Unknown package.' }, { status: 400 })

    if (!rateLimit('payment:' + clientIp(req), 10, 60000).allowed) return NextResponse.json({ error: 'Please wait before starting another payment.' }, { status: 429 })

    const existing = await currentAccess()
    if (!existing && !isValidEmail(typedEmail)) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    let owner = existing || await resolveOwner()

    // A pack's credits sit unused for weeks, so buying one needs an access code
    // (a single CV is spent at once and stays friction-free). If this account
    // already has a code it is kept — a checkout never replaces one. Otherwise
    // the typed email + code first gets the chance to open an account that
    // already has that code ("Already have a code? Enter it"), and the purchase
    // joins it; if nothing matches, the code becomes this account's. The answer
    // is the same either way, so checkout can't be used to test codes or learn
    // whether an address is a customer — and the same lockouts as sign-in apply.
    let joined = false
    if (pkg.cv > 1 && !(await ownerHasCode(owner.id))) {
      const code = typeof accessCode === 'string' ? accessCode : ''
      if (!/^\d{4}$/.test(code)) return NextResponse.json({ error: 'CODE_REQUIRED', message: 'Choose a 4-digit code to protect your credits.' }, { status: 400 })
      if (owner.guest && isValidEmail(typedEmail)) {
        const match = await findOwnerByCode(typedEmail, code)
        if (match.hasCoded) {
          const allowed = await recordCodeAttempt(typedEmail, clientIp(req), match.kind === 'one')
          if (allowed && match.kind === 'one' && match.ownerId !== owner.id) {
            await startSession(match.ownerId, new Date(0).toISOString(), false)
            await adoptBrowserGuest(match.ownerId)
            owner = { ...owner, id: match.ownerId }
            joined = true
          }
        }
      }
      if (!joined) {
        const problem = accessCodeProblem(code)
        if (problem) return NextResponse.json({ error: 'CODE_WEAK', message: problem }, { status: 400 })
        await setOwnerCode(owner.id, code)
      }
    }
    if (!joined && owner.guest && isValidEmail(typedEmail) && typedEmail !== owner.email) await setGuestContact(owner.id, typedEmail)
    const payerEmail = isValidEmail(typedEmail) ? typedEmail : owner.email
    if (!payerEmail) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

    // 128 random bits: a reference is also a claim ticket, so it must not be guessable.
    const reference = `scv-${crypto.randomBytes(16).toString('hex')}`
    const origin = req.nextUrl.origin

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: payerEmail,
        amount: pkg.amount,
        currency: 'GHS',
        reference,
        callback_url: `${origin}/payment-return`,
        metadata: { owner_id: owner.id, package_id: pkg.id },
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
