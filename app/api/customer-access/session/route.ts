import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { currentAccess, currentMember, startSession, SESSION_COOKIE } from '@/lib/customerAuth'
import { clearGuestCookie } from '@/lib/guest'
import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export async function GET() {
  const access = await currentAccess()
  // `email` is only ever a signed-in member's. A browser that merely owns its
  // own work (a guest) is not "signed in"; its receipt address, if it left one,
  // comes back separately so the last page can pre-fill it.
  const member = access && !access.guest ? access : null
  return NextResponse.json({
    email: member?.email || null,
    persistent: member?.persistent || false,
    contactEmail: access?.guest ? access.email || null : null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function POST(req: Request) {
  const access = await currentMember()
  if (!access) return NextResponse.json({ error: 'Please verify your email first.' }, { status: 401 })
  const { remember } = await req.json()
  await startSession(access.id, access.verifiedAt, remember === true)
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function DELETE() {
  const access = await currentMember()
  if (access) await supabaseAdmin.from('customer_sessions').delete().eq('token_hash', access.sessionHash)
  cookies().delete(SESSION_COOKIE)
  // Signing out is for a shared or handed-over device, so the browser's own
  // identity goes too — otherwise the next person would still own its CVs.
  clearGuestCookie()
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
