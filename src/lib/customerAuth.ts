import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { normalizeEmail, isValidEmail } from './email'

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
export async function currentAccess(): Promise<(Customer & { sessionHash: string; persistent: boolean; verifiedAt: string }) | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  const { data, error } = await supabaseAdmin.from('customer_sessions')
    .select('token_hash, owner_id, persistent, verified_at').eq('token_hash', digest(token))
    .gt('expires_at', new Date().toISOString()).maybeSingle()
  if (error || !data) return null
  const customer = await supabaseAdmin.from('customers').select('id, email').eq('id', data.owner_id).single()
  if (customer.error || !customer.data) return null
  return { ...customer.data, sessionHash: data.token_hash, persistent: data.persistent, verifiedAt: data.verified_at }
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
