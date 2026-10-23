import { NextResponse } from 'next/server'
import { normalizeEmail, isValidEmail } from '@/lib/email'
import { startSession } from '@/lib/customerAuth'
import { adoptBrowserGuest } from '@/lib/guest'
import { findOwnerByCode, recordCodeAttempt, upgradeAccessCode } from '@/lib/accessCode'
import { clientIp } from '@/lib/rateLimit'
export const dynamic = 'force-dynamic'

// Email + access code opens the one account that code was set on — a member,
// or a browser account that bought with this receipt address — and nothing
// else. Unknown address, wrong code, two accounts sharing the code, or a lock:
// one identical answer, which points to the email link.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = normalizeEmail(body.email)
    const code = typeof body.code === 'string' ? body.code : body.pin
    if (!isValidEmail(email) || typeof code !== 'string' || !/^\d{4}$/.test(code)) return NextResponse.json({ error: 'Enter your email and 4-digit access code.' }, { status: 400 })
    const match = await findOwnerByCode(email, code)
    const allowed = await recordCodeAttempt(email, clientIp(req), match.kind === 'one')
    if (!allowed || match.kind !== 'one') return NextResponse.json({ error: 'Email or access code is incorrect, or temporarily locked. Use an email link to get in.' }, { status: 401 })
    await startSession(match.ownerId, new Date(0).toISOString(), body.remember === true)
    await adoptBrowserGuest(match.ownerId)
    await upgradeAccessCode(match.ownerId, code)
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Could not check your access code.' }, { status: 500 }) }
}
