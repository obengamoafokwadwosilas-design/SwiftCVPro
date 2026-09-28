import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPin, isValidPinFormat } from '@/lib/pin'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const access = await currentAccess()
  if (!access || Date.now() - new Date(access.verifiedAt).getTime() > 30 * 60000)
    return NextResponse.json({ error: 'Click a fresh email link before setting or changing your PIN.' }, { status: 401 })
  const { pin } = await req.json()
  if (typeof pin !== 'string' || !isValidPinFormat(pin)) return NextResponse.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('customer_pins_v2').upsert({ owner_id: access.id, pin_hash: hashPin(pin), updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: 'Could not save your PIN.' }, { status: 500 })
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
