export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/credits'
import { checkHistoryAccess } from '@/lib/pinAuth'

// Thin wrapper around the shared, rate-limited PIN check — used by the
// History access modal as a quick "unlock" step before fetching the list.
// The history routes themselves independently re-run the same check, so
// this endpoint being called is never load-bearing for security by itself.
export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, pin } = await req.json()
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    const phone = normalizePhone(phoneNumber)

    const result = await checkHistoryAccess(phone, pin)
    if (!result.ok) return NextResponse.json({ verified: false, error: result.error }, { status: result.status })
    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error('cv-pin/verify error:', error)
    return NextResponse.json({ verified: false, error: 'Could not verify PIN.' }, { status: 500 })
  }
}
