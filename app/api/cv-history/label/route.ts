export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/credits'
import { checkHistoryAccess } from '@/lib/pinAuth'
import { supabaseAdmin } from '@/lib/supabase'

// Renames a saved CV's optional job-title label. Gated the same way as
// list — defense in depth, since row ids are sequential integers and
// therefore guessable; the WHERE clause below also always scopes the
// update to rows matching this exact phone number.
export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, pin, id, label } = await req.json()
    if (!phoneNumber || !id) return NextResponse.json({ error: 'Phone number and CV id are required.' }, { status: 400 })
    const phone = normalizePhone(phoneNumber)

    const access = await checkHistoryAccess(phone, pin)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { error } = await supabaseAdmin
      .from('cv_history')
      .update({ label: String(label || '').trim().slice(0, 120) || null })
      .eq('id', id)
      .eq('phone_number', phone)

    if (error) {
      console.error('cv-history/label error:', error)
      return NextResponse.json({ error: 'Could not rename this CV.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('cv-history/label error:', error)
    return NextResponse.json({ error: 'Could not rename this CV.' }, { status: 500 })
  }
}
