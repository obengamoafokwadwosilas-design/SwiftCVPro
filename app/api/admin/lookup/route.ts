export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { normalizePhone, getCredits, getCoverLetterCredits } from '@/lib/credits'
import { supabaseAdmin } from '@/lib/supabase'

// Admin: look up everything about one phone number — current balances, how many
// CVs it has generated, and its recent payments. Read-only.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { phoneNumber } = await req.json()
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }
    const phone = normalizePhone(phoneNumber)

    const [credits, coverLetterCredits] = await Promise.all([
      getCredits(phone),
      getCoverLetterCredits(phone),
    ])

    const { count: historyCount } = await supabaseAdmin
      .from('cv_history')
      .select('id', { count: 'exact', head: true })
      .eq('phone_number', phone)

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('package_id, amount, cv_credits, cl_credits, created_at')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      phoneNumber: phone,
      credits,
      coverLetterCredits,
      historyCount: historyCount || 0,
      payments: payments || [],
    })
  } catch (error) {
    console.error('Admin lookup error:', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
