import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { digest, startSession } from '@/lib/customerAuth'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Invalid access link.' }, { status: 400 })
    const { data, error } = await supabaseAdmin.rpc('consume_customer_link', { p_hash: digest(token) })
    if (error || !data) return NextResponse.json({ error: 'This link expired or has already been used. Request a new one.' }, { status: 401 })
    await startSession(data, new Date().toISOString())
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Could not open your CVs. Please request a new link.' }, { status: 500 }) }
}
