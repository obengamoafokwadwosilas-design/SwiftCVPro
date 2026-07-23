import crypto from 'crypto'
import type { NextRequest } from 'next/server'

// Shared gate for every /api/admin/* route. The admin key lives ONLY in the
// ADMIN_SECRET env var (set it in Vercel) and is sent by the admin page as the
// `x-admin-key` header — never embedded in client code, never in a URL.
//
// Fails closed: if ADMIN_SECRET isn't configured, no request is ever admin, so
// a misconfigured deploy can't accidentally expose the admin API to everyone.
export function isAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const provided = req.headers.get('x-admin-key') || ''
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  // Length-guard before timingSafeEqual (which throws on length mismatch),
  // and still compare so timing doesn't leak the length.
  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b)
    return false
  }
  return crypto.timingSafeEqual(a, b)
}
