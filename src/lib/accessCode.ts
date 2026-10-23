import 'server-only'
import crypto from 'crypto'
import { supabaseAdmin } from './supabase'
import { digest } from './customerAuth'
import { verifyPinHash } from './pin'

// The access code is never stored. Only an HMAC-SHA256 of it is, keyed with a
// server-only secret, so a leaked database holds no usable codes: with the key
// gone, 10,000 candidates can't be tried offline. The key is derived from the
// Supabase service-role key (domain-separated, like the guest cookie's), so no
// new environment variable is needed — rotating that key means every customer
// resets their code by email link once.
const PREFIX = 'hmac1$'

function key(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || secret.length < 32) throw new Error('Access codes need SUPABASE_SERVICE_ROLE_KEY.')
  return crypto.createHash('sha256').update('scv-access-code-v1|' + secret).digest()
}

export function hashAccessCode(code: string): string {
  return PREFIX + crypto.createHmac('sha256', key()).update(code).digest('hex')
}

// Codes set before this release are salted scrypt hashes; they still match and
// are rewritten as HMAC on their next successful use (see upgradeAccessCode).
function matches(code: string, stored: string): boolean {
  if (stored.startsWith(PREFIX)) {
    const a = Buffer.from(hashAccessCode(code)), b = Buffer.from(stored)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  }
  return verifyPinHash(code, stored)
}
const LEGACY_DUMMY = (() => { const salt = crypto.randomBytes(16); return `${salt.toString('base64')}:${crypto.scryptSync('0000', salt, 32).toString('base64')}` })()

export async function ownerHasCode(ownerId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('customer_pins_v2').select('owner_id').eq('owner_id', ownerId).maybeSingle()
  return !!data
}

export async function setOwnerCode(ownerId: string, code: string): Promise<void> {
  const { error } = await supabaseAdmin.from('customer_pins_v2').upsert({ owner_id: ownerId, pin_hash: hashAccessCode(code), updated_at: new Date().toISOString() })
  if (error) throw new Error('Could not save your access code.')
}

export async function upgradeAccessCode(ownerId: string, code: string): Promise<void> {
  try { await setOwnerCode(ownerId, code) } catch { /* the old hash still works */ }
}

export type CodeMatch = { kind: 'one'; ownerId: string } | { kind: 'none' | 'many' }

// Every account an email + code could mean: the member that proved the address,
// and the browser accounts that left it as their receipt address. A code opens
// only the account it was set on, so a typo, a shared family email or a cyber
// café's address can't open anyone else's CVs. Two accounts on one address
// with the same code is "many" — the caller sends them to the email link
// rather than guessing. `hasCoded` says whether any candidate has a code at
// all, so a brand-new customer's first code isn't counted as a wrong guess.
export async function findOwnerByCode(email: string, code: string): Promise<CodeMatch & { hasCoded: boolean }> {
  const [member, guests] = await Promise.all([
    supabaseAdmin.from('customers').select('id').eq('email', email).maybeSingle(),
    supabaseAdmin.from('customers').select('id').eq('is_guest', true).eq('contact_email', email).limit(25),
  ])
  const ids = [member.data?.id, ...(guests.data || []).map(g => g.id)].filter(Boolean) as string[]
  const { data: pins } = ids.length
    ? await supabaseAdmin.from('customer_pins_v2').select('owner_id, pin_hash').in('owner_id', ids)
    : { data: [] as { owner_id: string; pin_hash: string }[] }
  let legacyChecked = false
  const hits = (pins || []).filter(p => { if (!p.pin_hash.startsWith(PREFIX)) legacyChecked = true; return matches(code, p.pin_hash) })
  // Old scrypt hashes are slow to check; without this an address that has one
  // would answer measurably slower than one that doesn't.
  if (!legacyChecked) verifyPinHash(code, LEGACY_DUMMY)
  const hasCoded = (pins || []).length > 0
  if (hits.length === 1) return { kind: 'one', ownerId: hits[0].owner_id, hasCoded }
  return { kind: hits.length ? 'many' : 'none', hasCoded }
}

// Rule 1: 5 wrong codes on an email locks it (15 minutes, doubling, up to 24
// hours) and one network address is stopped after 30 failures in 15 minutes.
// Kept in the database so a server restart or a second instance can't reset it.
export async function recordCodeAttempt(email: string, ip: string, correct: boolean): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('record_access_code_attempt', { p_bucket: digest('code:' + email), p_ip_bucket: digest('code-ip:' + ip), p_correct: correct })
  if (error) throw new Error('Could not check your access code.')
  return data === true
}
