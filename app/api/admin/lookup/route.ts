export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { normalizeEmail, isValidEmail } from '@/lib/email'
import { getCredits, getCoverLetterCredits } from '@/lib/credits'
import { supabaseAdmin } from '@/lib/supabase'

// Admin: look up everything about one ownerId number — current balances, how many
// CVs it has generated, and its recent payments. Read-only.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    const cleanEmail = normalizeEmail(email)
    if (!isValidEmail(cleanEmail)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    const { data: customer } = await supabaseAdmin.from('customers').select('id').eq('email', cleanEmail).maybeSingle()
    if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
    const ownerId = customer.id

    const [credits, coverLetterCredits] = await Promise.all([
      getCredits(ownerId),
      getCoverLetterCredits(ownerId),
    ])

    const { count: historyCount } = await supabaseAdmin
      .from('customer_history')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)

    const { data: payments } = await supabaseAdmin
      .from('customer_payments')
      .select('package_id, amount, cv_credits, cl_credits, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      email: cleanEmail,
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
