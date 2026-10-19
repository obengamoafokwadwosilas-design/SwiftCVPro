import crypto from 'crypto'

// The browser-identity cookie: v1.<nonce>.<expiry>.<signature>.
//
// The nonce is random; the signature is an HMAC over version, nonce and expiry
// under a server-side secret. An unsigned id could be edited by hand to claim
// someone else's work, so the server only accepts values it signed itself.
// Rows store only a hash derived from the nonce, never the nonce.
export const GUEST_COOKIE = 'scv_guest'
export const GUEST_MAX_AGE_SECONDS = 90 * 86400
export const GUEST_EMAIL_DOMAIN = 'guest.remarkablecv.invalid'

// Derived from an existing server-only secret (with a domain separator) so the
// release needs no new environment variable. Rotating that secret signs
// everyone's browser out of their guest identity, which is acceptable.
export function guestSecret(): string {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base) throw new Error('Browser identity needs SUPABASE_SERVICE_ROLE_KEY to be set.')
  return crypto.createHash('sha256').update('scv-guest-cookie-v1|' + base).digest('hex')
}

const sign = (secret: string, nonce: string, exp: number) =>
  crypto.createHmac('sha256', secret).update(`v1.${nonce}.${exp}`).digest('hex')

export function issueGuestToken(secret: string, nowMs = Date.now()): { token: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString('hex')
  const exp = Math.floor(nowMs / 1000) + GUEST_MAX_AGE_SECONDS
  return { token: `v1.${nonce}.${exp}.${sign(secret, nonce, exp)}`, nonce }
}

// Returns the nonce for a genuine, unexpired token, otherwise null. A missing,
// malformed, forged or expired cookie is simply a brand-new visitor — never an error.
export function verifyGuestToken(token: string | undefined, secret: string, nowMs = Date.now()): string | null {
  if (!token || token.length > 200) return null
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return null
  const [, nonce, expText, sig] = parts
  if (!/^[a-f0-9]{32}$/.test(nonce) || !/^\d{1,12}$/.test(expText) || !/^[a-f0-9]{64}$/.test(sig)) return null
  const exp = Number(expText)
  if (exp * 1000 <= nowMs) return null
  const want = Buffer.from(sign(secret, nonce, exp), 'hex')
  const got = Buffer.from(sig, 'hex')
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null
  return nonce
}

// What a guest row stores in customers.email: a hash of the nonce, so the raw
// nonce never reaches the database, and the address can never be a real mailbox.
export function guestEmailForNonce(nonce: string): string {
  const h = crypto.createHash('sha256').update('scv-guest-owner-v1|' + nonce).digest('hex').slice(0, 32)
  return `g-${h}@${GUEST_EMAIL_DOMAIN}`
}

export const isGuestEmail = (email: string) => email.endsWith('@' + GUEST_EMAIL_DOMAIN)
