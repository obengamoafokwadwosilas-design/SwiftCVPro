import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeEmail, isValidEmail } from '@/lib/email'
import { digest, reserveSend } from '@/lib/customerAuth'
import { sendCustomerLink } from '@/lib/customerMail'
import { clientIp } from '@/lib/rateLimit'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const response = () => NextResponse.json({ ok: true, message: 'If this email has saved CVs or credits, a secure link will arrive shortly. Check spam too.' }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
  try {
    const { email: value } = await req.json()
    const email = normalizeEmail(value)
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    if (!await reserveSend('access-ip:' + digest(clientIp(req)), 10)) return response()
    const { data } = await supabaseAdmin.from('customers').select('id, email').eq('email', email).maybeSingle()
    if (data) await sendCustomerLink(data)
  } catch (error) { console.error('Access email failed:', error) }
  return response()
}
