import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { currentAccess, startSession, SESSION_COOKIE } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export async function GET() {
  const access = await currentAccess()
  return NextResponse.json({ email: access?.email || null, persistent: access?.persistent || false }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function POST(req: Request) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Please verify your email first.' }, { status: 401 })
  const { remember } = await req.json()
  await startSession(access.id, access.verifiedAt, remember === true)
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function DELETE() {
  const access = await currentAccess()
  if (access) await supabaseAdmin.from('customer_sessions').delete().eq('token_hash', access.sessionHash)
  cookies().delete(SESSION_COOKIE)
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
