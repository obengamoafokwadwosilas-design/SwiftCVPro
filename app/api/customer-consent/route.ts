import { NextResponse } from 'next/server'
import { currentAccess, resolveOwner } from '@/lib/customerAuth'
import { setGuestContact } from '@/lib/guest'
import { isValidEmail, normalizeEmail } from '@/lib/email'
import { supabaseAdmin } from '@/lib/supabase'
import { clientIp, rateLimit } from '@/lib/rateLimit'

// Saves the last page's two answers: where to send the receipt, and whether the
// customer wants job alerts and tips. Both belong to whoever owns THIS browser
// (or the signed-in member) — never to the address that was typed — so typing
// someone else's email can neither read nor change anything of theirs. A tick
// left by a browser only counts for mailing once the address is proved (the
// emailed link or Google marks it verified).
export async function POST(req: Request) {
  try {
    if (!rateLimit('consent:' + clientIp(req), 20, 60000).allowed) return NextResponse.json({ error: 'Please wait before trying again.' }, { status: 429 })
    const { email, updates } = await req.json()
    const typedEmail = normalizeEmail(email)
    const existing = await currentAccess()
    if (!existing && !isValidEmail(typedEmail)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    const owner = existing || await resolveOwner()
    if (owner.guest && isValidEmail(typedEmail) && typedEmail !== owner.email) await setGuestContact(owner.id, typedEmail)
    const { error } = await supabaseAdmin.from('customer_marketing_preferences').upsert({
      owner_id: owner.id, opted_in: updates === true, verified: !owner.guest,
      consent_text: 'Send me job alerts, relevant employment updates, and CV tips.',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Could not save your preference.' }, { status: 500 }) }
}
