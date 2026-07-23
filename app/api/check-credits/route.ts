export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/credits'

const TESTING_MODE = false

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json()
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }

    const phone = normalizePhone(phoneNumber)

    if (TESTING_MODE) {
      // Skip Supabase entirely — just say yes
      return NextResponse.json({ hasCredits: true, credits: 999, phoneNumber: phone })
    }

    // Production: real Supabase check
    const { getCredits } = await import('@/lib/credits')
    const credits = await getCredits(phone)
    return NextResponse.json({ hasCredits: credits > 0, credits, phoneNumber: phone })

  } catch (error) {
    console.error('Check credits error:', error)
    // In testing mode, fail open so generation still works
    return NextResponse.json({ hasCredits: true, credits: 999, phoneNumber: '' })
  }
}
