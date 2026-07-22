export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/credits'
import { supabaseAdmin } from '@/lib/supabase'

// Keeps a saved history row's template/colour in sync with whatever the user
// is currently viewing on the preview page. Called automatically whenever
// they switch templates or colours — not gated by PIN (it's a same-session
// bookkeeping update immediately after generation, not a history browse),
// but still scoped to the exact (id, phone_number) pair so a request can
// only ever touch its own row.
export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, historyId, templateId, accentColor } = await req.json()
    if (!phoneNumber || !historyId || !templateId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }
    const phone = normalizePhone(phoneNumber)

    const { error } = await supabaseAdmin
      .from('cv_history')
      .update({ template_id: templateId, accent_color: accentColor || null })
      .eq('id', historyId)
      .eq('phone_number', phone)

    if (error) {
      console.error('cv-history/update-template error:', error)
      return NextResponse.json({ error: 'Could not sync template.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('cv-history/update-template error:', error)
    return NextResponse.json({ error: 'Could not sync template.' }, { status: 500 })
  }
}
