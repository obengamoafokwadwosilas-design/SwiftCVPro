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
    // An account for this address, or — for someone who paid or built without ever
    // signing in — the newest browser identity that left it as its receipt address.
    // Either way the reply to the caller is the same; only the mailbox learns more.
    let target: { id: string; email: string } | null = null
    const member = await supabaseAdmin.from('customers').select('id, email').eq('email', email).maybeSingle()
    if (member.data) target = member.data
    else {
      const guest = await supabaseAdmin.from('customers').select('id').eq('is_guest', true).eq('contact_email', email)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (guest.data) target = { id: guest.data.id, email }
    }
    if (target) await sendCustomerLink(target)
  } catch (error) { console.error('Access email failed:', error) }
  return response()
}
