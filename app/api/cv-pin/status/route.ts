export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/credits'
import { supabaseAdmin } from '@/lib/supabase'

// Tells the History access modal whether to show a PIN field for this phone.
// Deliberately returns almost nothing else — this route must never leak
// credit balances or history; it exists purely to shape the access UI.
export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json()
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    const phone = normalizePhone(phoneNumber)

    const { data } = await supabaseAdmin
      .from('customer_pins')
      .select('phone_number, email')
      .eq('phone_number', phone)
      .maybeSingle()

    return NextResponse.json({ pin_set: !!data, has_email: !!data?.email })
  } catch (error) {
    console.error('cv-pin/status error:', error)
    return NextResponse.json({ error: 'Could not check PIN status.' }, { status: 500 })
  }
}
