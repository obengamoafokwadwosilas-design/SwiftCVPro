export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/credits'
import { checkHistoryAccess } from '@/lib/pinAuth'
import { supabaseAdmin } from '@/lib/supabase'

// Returns every saved CV for a phone number, newest first. Gated by the
// SAME rate-limited PIN check used everywhere else — if a PIN is set for
// this phone, a correct one is required; if none was ever set, the owner
// chose phone-only access and this returns straight away.
export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, pin } = await req.json()
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    const phone = normalizePhone(phoneNumber)

    const access = await checkHistoryAccess(phone, pin)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data, error } = await supabaseAdmin
      .from('cv_history')
      .select('id, cv_type, template_id, accent_color, label, generated_cv, raw_input, created_at')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('cv-history/list error:', error)
      return NextResponse.json({ error: 'Could not load your CV history.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, history: data || [] })
  } catch (error) {
    console.error('cv-history/list error:', error)
    return NextResponse.json({ error: 'Could not load your CV history.' }, { status: 500 })
  }
}
