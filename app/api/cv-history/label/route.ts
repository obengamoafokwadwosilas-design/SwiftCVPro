import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Verify your email first.' }, { status: 401 })
  const { id, label } = await req.json()
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid CV.' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('customer_history').update({ label: String(label || '').trim().slice(0, 120) || null })
    .eq('id', id).eq('owner_id', access.id).select('id').maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Could not rename your CV.' }, { status: 404 })
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
