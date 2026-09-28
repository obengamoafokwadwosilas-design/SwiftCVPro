import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeEmail, isValidEmail } from '@/lib/email'
import { hashPin, verifyPinHash, isValidPinFormat } from '@/lib/pin'
import { digest, startSession } from '@/lib/customerAuth'
import { clientIp, rateLimit } from '@/lib/rateLimit'
export const dynamic = 'force-dynamic'
// Unknown addresses take the same expensive verification path.
const dummy = hashPin('0000')
export async function POST(req: Request) {
  try {
    if (!rateLimit('pin:' + clientIp(req), 10, 60000).allowed) return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 })
    const { email: value, pin, remember } = await req.json()
    const email = normalizeEmail(value)
    if (!isValidEmail(email) || typeof pin !== 'string' || !isValidPinFormat(pin)) return NextResponse.json({ error: 'Enter your email and 4-digit PIN.' }, { status: 400 })
    const { data: customer } = await supabaseAdmin.from('customers').select('id').eq('email', email).maybeSingle()
    const { data: row } = await supabaseAdmin.from('customer_pins_v2').select('pin_hash').eq('owner_id', customer?.id || '00000000-0000-0000-0000-000000000000').maybeSingle()
    const correct = verifyPinHash(pin, row?.pin_hash || dummy)
    const { data: allowed, error } = await supabaseAdmin.rpc('record_customer_pin_attempt', { p_bucket: digest(email), p_correct: correct && !!row })
    if (error || !allowed || !correct || !customer) return NextResponse.json({ error: 'Email or PIN is incorrect, or temporarily locked. Use an email link to regain access.' }, { status: 401 })
    await startSession(customer.id, new Date(0).toISOString(), remember === true)
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Could not verify your PIN.' }, { status: 500 }) }
}
