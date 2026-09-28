import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export async function POST() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ pin_set: false, verified: false }, { headers: { 'Cache-Control': 'no-store' } })
  const { data } = await supabaseAdmin.from('customer_pins_v2').select('owner_id').eq('owner_id', access.id).maybeSingle()
  return NextResponse.json({ pin_set: !!data, verified: true }, { headers: { 'Cache-Control': 'no-store' } })
}
