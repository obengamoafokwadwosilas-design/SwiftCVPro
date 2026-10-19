import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { normalizeEmail, isValidEmail } from './email'
import { currentGuest, ensureGuest } from './guest'

export const SESSION_COOKIE = 'scv_access'
export const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex')
export type Customer = { id: string; email: string }

export async function customerForEmail(value: unknown): Promise<Customer> {
  const email = normalizeEmail(value)
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.')
  const { data, error } = await supabaseAdmin.from('customers')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true }).select('id, email').maybeSingle()
  if (error) throw new Error('Could not save your email.')
  if (data) return data
  const result = await supabaseAdmin.from('customers').select('id, email').eq('email', email).single()
  if (result.error) throw new Error('Could not find your email.')
  return result.data
}
export type Access = Customer & { sessionHash: string; persistent: boolean; verifiedAt: string; guest: boolean }

// A customer who has proved their email (emailed link, Google or PIN).
export async function currentMember(): Promise<Access | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  const { data, error } = await supabaseAdmin.from('customer_sessions')
    .select('token_hash, owner_id, persistent, verified_at').eq('token_hash', digest(token))
    .gt('expires_at', new Date().toISOString()).maybeSingle()
  if (error || !data) return null
  const customer = await supabaseAdmin.from('customers').select('id, email').eq('id', data.owner_id).single()
  if (customer.error || !customer.data) return null
  return { ...customer.data, sessionHash: data.token_hash, persistent: data.persistent, verifiedAt: data.verified_at, guest: false }
}

// Whoever owns this browser's work: a signed-in member if there is one,
// otherwise the browser's own guest. A guest's `email` is the receipt address it
// left (or ''), never an identity, and its verifiedAt is the epoch so anything
// that demands a *fresh email proof* (setting a PIN) refuses it. Read-only —
// it never creates a guest; use resolveOwner() on routes that write.
export async function currentAccess(): Promise<Access | null> {
  const member = await currentMember()
  if (member) return member
  const guest = await currentGuest()
  if (!guest) return null
  return { id: guest.id, email: guest.contactEmail || '', sessionHash: '', persistent: false, verifiedAt: new Date(0).toISOString(), guest: true }
}

// For routes that act for the visitor (generate, pay, save contact): the member
// if signed in, otherwise this browser's guest, created on first use.
export async function resolveOwner(): Promise<Access> {
  const access = await currentAccess()
  if (access) return access
  const guest = await ensureGuest()
  return { id: guest.id, email: guest.contactEmail || '', sessionHash: '', persistent: false, verifiedAt: new Date(0).toISOString(), guest: true }
}

// The address receipts and recovery links go to for an owner, or null when
// there is none (a guest that never left one). Guests' own rows only ever hold
// a synthetic address, which is never mailable.
export async function mailTargetFor(ownerId: string): Promise<Customer | null> {
  const { data } = await supabaseAdmin.from('customers').select('id, email, is_guest, contact_email').eq('id', ownerId).maybeSingle()
  if (!data) return null
  const email = data.is_guest ? data.contact_email : data.email
  return email ? { id: data.id, email } : null
}
// Support tooling: the account behind an address. A customer who paid without
// ever signing in lives on a browser guest that left this address as its receipt
// address, so fall back to the newest of those; only if there is neither is a
// member row created (for a goodwill grant to someone who will sign in later).
export async function adminCustomerForEmail(value: unknown): Promise<Customer> {
  const email = normalizeEmail(value)
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.')
  const member = await supabaseAdmin.from('customers').select('id, email').eq('email', email).maybeSingle()
  if (member.data) return member.data
  const guest = await supabaseAdmin.from('customers').select('id, contact_email').eq('is_guest', true).eq('contact_email', email)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (guest.data) return { id: guest.data.id, email }
  return customerForEmail(email)
}
export async function requireOwner(ownerId: string) {
  const access = await currentAccess()
  return access?.id === ownerId ? access : null
}
export async function startSession(ownerId: string, verifiedAt: string, persistent = false) {
  const token = crypto.randomBytes(32).toString('hex')
  const seconds = persistent ? 90 * 86400 : 12 * 3600
  const oldToken = cookies().get(SESSION_COOKIE)?.value
  const { error } = await supabaseAdmin.from('customer_sessions').insert({
    token_hash: digest(token), owner_id: ownerId, persistent, verified_at: verifiedAt,
    expires_at: new Date(Date.now() + seconds * 1000).toISOString(),
  })
  if (error) throw new Error('Could not start your secure session.')
  if (oldToken) await supabaseAdmin.from('customer_sessions').delete().eq('token_hash', digest(oldToken))
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
    ...(persistent ? { maxAge: seconds } : {}),
  })
}
export async function reserveSend(bucket: string, seconds: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('reserve_customer_send', { p_bucket: bucket, p_seconds: seconds })
  if (error) throw new Error('Could not reserve email delivery.')
  return data === true
}
