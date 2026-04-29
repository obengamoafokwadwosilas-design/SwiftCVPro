export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCredits, normalizePhone } from '@/lib/credits'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json()
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

    const phone = normalizePhone(phoneNumber)
    const credits = await getCredits(phone)

    return NextResponse.json({ hasCredits: credits > 0, credits, phoneNumber: phone })
  } catch (error) {
    console.error('Check credits error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
