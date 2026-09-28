import { NextResponse } from 'next/server'
import { customerForEmail } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { clientIp, rateLimit } from '@/lib/rateLimit'
export async function POST(req: Request) {
  try {
    if (!rateLimit('consent:' + clientIp(req), 20, 60000).allowed) return NextResponse.json({ error: 'Please wait before trying again.' }, { status: 429 })
    const { email, updates } = await req.json()
    const customer = await customerForEmail(email)
    const { error } = await supabaseAdmin.from('customer_marketing_preferences').upsert({
      owner_id: customer.id, opted_in: updates === true, verified: false,
      consent_text: 'Send me job alerts, relevant employment updates, and CV tips.',
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Could not save your preference.' }, { status: 500 }) }
}
