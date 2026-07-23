export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, getCredits, getCoverLetterCredits } from '@/lib/credits'

export async function POST(req: NextRequest) {
  // Normalise the phone up front so we can echo it back even on the error path,
  // and so a failure below fails CLOSED (no credits) instead of open.
  let phone = ''
  try {
    const { phoneNumber } = await req.json()
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }
    phone = normalizePhone(phoneNumber)

    const [credits, coverLetterCredits] = await Promise.all([
      getCredits(phone),
      getCoverLetterCredits(phone),
    ])
    return NextResponse.json({ hasCredits: credits > 0, credits, coverLetterCredits, phoneNumber: phone })

  } catch (error) {
    console.error('Check credits error:', error)
    // Fail CLOSED: if we can't confirm credits, report none so the build page
    // shows the payment modal rather than silently letting a free generation
    // through. /api/generate is the authoritative gate and also blocks here.
    return NextResponse.json({ hasCredits: false, credits: 0, coverLetterCredits: 0, phoneNumber: phone })
  }
}
