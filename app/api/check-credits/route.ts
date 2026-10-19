import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { getCredits, getCoverLetterCredits } from '@/lib/credits'
export const dynamic = 'force-dynamic'
// The balance of whoever owns THIS browser (or the signed-in member). It takes
// no email on purpose: an address typed by a stranger must never reveal anything
// about an account, so there is nothing here to probe — someone with no session
// and someone whose account is empty both get zeros.
export async function POST(req: Request) {
  try {
    const { cvType } = await req.json().catch(() => ({}))
    const access = await currentAccess()
    if (!access) return NextResponse.json({ hasCredits: false, credits: 0, coverLetterCredits: 0 }, { headers: { 'Cache-Control': 'no-store' } })
    const [credits, coverLetterCredits] = await Promise.all([getCredits(access.id), getCoverLetterCredits(access.id)])
    return NextResponse.json({ hasCredits: cvType === 'cover_letter' ? coverLetterCredits > 0 : credits > 0, credits, coverLetterCredits }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Could not check your credits.' }, { status: 503 }) }
}
