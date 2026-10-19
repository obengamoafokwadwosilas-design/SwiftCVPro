import 'server-only'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { GUEST_COOKIE, GUEST_MAX_AGE_SECONDS, guestEmailForNonce, guestSecret, issueGuestToken, verifyGuestToken } from './guestCookie'

// A guest is a customers row owned by a browser (the signed scv_guest cookie)
// rather than by an email address. It holds the CVs and credits made in that
// browser until the customer proves an email, when it is merged into that
// email's account (see adoptBrowserGuest / adoptGuestsByContact).
export type Guest = { id: string; email: string; contactEmail: string | null }

const cookieOptions = () => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: GUEST_MAX_AGE_SECONDS,
})

function nonceFromRequest(): string | null {
  try { return verifyGuestToken(cookies().get(GUEST_COOKIE)?.value, guestSecret()) } catch { return null }
}

const SELECT = 'id, email, contact_email'
const toGuest = (row: { id: string; email: string; contact_email: string | null }): Guest =>
  ({ id: row.id, email: row.email, contactEmail: row.contact_email })

// Read-only: never sets a cookie or creates a row, so it is safe on any request.
export async function currentGuest(): Promise<Guest | null> {
  const nonce = nonceFromRequest()
  if (!nonce) return null
  const { data, error } = await supabaseAdmin.from('customers').select(SELECT)
    .eq('email', guestEmailForNonce(nonce)).eq('is_guest', true).maybeSingle()
  return error || !data ? null : toGuest(data)
}

// For routes that write on the visitor's behalf (generate, pay): issues the
// cookie on first use and creates the row. An expired or forged cookie is
// treated as a new visitor.
export async function ensureGuest(): Promise<Guest> {
  let nonce = nonceFromRequest()
  if (!nonce) {
    const issued = issueGuestToken(guestSecret())
    nonce = issued.nonce
    cookies().set(GUEST_COOKIE, issued.token, cookieOptions())
  }
  const email = guestEmailForNonce(nonce)
  const created = await supabaseAdmin.from('customers').upsert({ email, is_guest: true }, { onConflict: 'email', ignoreDuplicates: true })
  if (created.error) throw new Error('Could not start your session.')
  const { data, error } = await supabaseAdmin.from('customers').select(SELECT).eq('email', email).eq('is_guest', true).single()
  if (error || !data) throw new Error('Could not start your session.')
  return toGuest(data)
}

export async function setGuestContact(guestId: string, email: string): Promise<void> {
  const { error } = await supabaseAdmin.from('customers').update({ contact_email: email }).eq('id', guestId).eq('is_guest', true)
  if (error) throw new Error('Could not save your email.')
}

export function clearGuestCookie() {
  cookies().set(GUEST_COOKIE, '', { ...cookieOptions(), maxAge: 0 })
}

export async function mergeGuest(fromId: string, toId: string): Promise<boolean> {
  const { error } = await supabaseAdmin.rpc('merge_customers', { p_from: fromId, p_to: toId })
  if (error) console.error('merge_customers failed:', error.message)
  return !error
}

// A customer has just proved an email in THIS browser (emailed link, Google,
// PIN): fold the CVs and credits made here as a guest into their account. Never
// throws — sign-in must succeed even if the move fails; the guest is left
// intact and the next sign-in retries it.
export async function adoptBrowserGuest(memberId: string): Promise<void> {
  try {
    const guest = await currentGuest()
    if (!guest) return
    if (await mergeGuest(guest.id, memberId)) clearGuestCookie()
  } catch (error) { console.error('adoptBrowserGuest failed:', error) }
}

// Only called after the address is proved (emailed link or Google): other
// browsers' guests that left this address as their receipt address become part
// of the same account. A guest created in a stranger's name merges in as junk
// rather than leaking anything, because merging moves data toward the proven
// owner and never away from them.
export async function adoptGuestsByContact(email: string, memberId: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin.from('customers').select('id').eq('is_guest', true).eq('contact_email', email)
    for (const row of data || []) await mergeGuest(row.id, memberId)
  } catch (error) { console.error('adoptGuestsByContact failed:', error) }
}
