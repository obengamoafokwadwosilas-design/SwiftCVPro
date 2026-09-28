import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { normalizeEmail } from '@/lib/email'
import { getCredits, getCoverLetterCredits } from '@/lib/credits'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  try {
    const { email, cvType } = await req.json()
    const access = await currentAccess()
    if (!access || access.email !== normalizeEmail(email)) return NextResponse.json({ hasCredits: false, credits: 0, coverLetterCredits: 0, verificationRequired: true }, { headers: { 'Cache-Control': 'no-store' } })
    const [credits, coverLetterCredits] = await Promise.all([getCredits(access.id), getCoverLetterCredits(access.id)])
    return NextResponse.json({ hasCredits: cvType === 'cover_letter' ? coverLetterCredits > 0 : credits > 0, credits, coverLetterCredits }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Could not check your credits.' }, { status: 503 }) }
}
