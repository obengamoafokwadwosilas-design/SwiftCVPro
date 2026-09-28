import { NextResponse } from 'next/server'
import { currentAccess, digest } from '@/lib/customerAuth'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const { historyId, templateId, accentColor } = await req.json()
  if (!Number.isSafeInteger(historyId) || !templateId) return NextResponse.json({ error: 'Invalid CV.' }, { status: 400 })
  const access = await currentAccess()
  const draftToken = cookies().get('scv_draft')?.value
  const query = supabaseAdmin.from('customer_history').update({ template_id: templateId, accent_color: accentColor || null }).eq('id', historyId)
  if (access) query.eq('owner_id', access.id)
  else if (draftToken) query.eq('draft_hash', digest(draftToken))
  else return NextResponse.json({ error: 'Verify your email first.' }, { status: 401 })
  const { data, error } = await query.select('id').maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Could not sync your template.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
