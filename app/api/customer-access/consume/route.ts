import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { customerForEmail, digest, startSession } from '@/lib/customerAuth'
import { adoptBrowserGuest, adoptGuestsByContact, mergeGuest } from '@/lib/guest'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Invalid access link.' }, { status: 400 })
    const { data, error } = await supabaseAdmin.rpc('consume_customer_link', { p_hash: digest(token) })
    if (error || !data) return NextResponse.json({ error: 'This link expired or has already been used. Request a new one.' }, { status: 401 })

    // The link was mailed to an address, so opening it proves that address.
    // A link for a browser's guest (its receipt or recovery link) therefore
    // turns that guest into — or merges it into — the account for that address.
    const { data: owner } = await supabaseAdmin.from('customers').select('id, email, is_guest, contact_email').eq('id', data).maybeSingle()
    let memberId: string = data
    let proven: string | null = owner?.is_guest ? owner.contact_email : owner?.email || null
    if (owner?.is_guest) {
      if (!owner.contact_email) return NextResponse.json({ error: 'This link cannot be used. Request a new one.' }, { status: 401 })
      const member = await customerForEmail(owner.contact_email)
      if (!await mergeGuest(owner.id, member.id)) return NextResponse.json({ error: 'Could not open your CVs. Please request a new link.' }, { status: 500 })
      memberId = member.id
    }
    if (proven) await adoptGuestsByContact(proven, memberId)
    await adoptBrowserGuest(memberId)
    // A notifications tick left before the address was proved only counts now.
    await supabaseAdmin.from('customer_marketing_preferences').update({ verified: true }).eq('owner_id', memberId).eq('opted_in', true)

    await startSession(memberId, new Date().toISOString())
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Could not open your CVs. Please request a new link.' }, { status: 500 }) }
}
