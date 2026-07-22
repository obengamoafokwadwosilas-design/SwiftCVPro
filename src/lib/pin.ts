import crypto from 'crypto'

// scrypt + random salt + timing-safe compare — never plaintext. Ported
// verbatim from a sister codebase's proven implementation.
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(pin, salt, 32)
  return `${salt.toString('base64')}:${hash.toString('base64')}`
}

export function verifyPinHash(pin: string, stored: string): boolean {
  const [saltB64, hashB64] = stored.split(':')
  if (!saltB64 || !hashB64) return false
  const salt = Buffer.from(saltB64, 'base64')
  const expected = Buffer.from(hashB64, 'base64')
  const actual = crypto.scryptSync(pin, salt, 32)
  if (actual.length !== expected.length) return false
  return crypto.timingSafeEqual(actual, expected)
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

// Rate limiting for /api/cv-pin/verify — the reference implementation this
// was adapted from had NO limit on this endpoint at all, making the 4-digit
// space (10,000 combinations) trivially brute-forceable. Lock out after a
// handful of wrong attempts for a short cooldown.
export const MAX_PIN_ATTEMPTS = 5
export const PIN_LOCKOUT_MINUTES = 15

// 6-digit numeric OTP for email-based PIN recovery. Only the hash is ever
// stored (sha256 is fine here — it's a short-lived, single-use, rate-limited
// code, not a long-term secret like the PIN itself).
export function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export const OTP_EXPIRY_MINUTES = 15
