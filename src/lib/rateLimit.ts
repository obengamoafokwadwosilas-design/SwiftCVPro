// Lightweight in-memory rate limiter for the export endpoints.
//
// Purpose: stop someone scripting /api/export-pdf or /api/export-docx to burn
// our API2PDF bill / compute. It is best-effort — on a serverless platform each
// instance keeps its own counters, so this is not a hard global limit, but it
// meaningfully raises the bar against naive abuse from a single client. A hard
// global limit would need a shared store (e.g. Supabase/Upstash); not worth it
// until real abuse is seen.

interface Bucket { count: number; reset: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { allowed: true, retryAfterSec: 0 }
  }
  if (b.count >= max) return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((b.reset - now) / 1000)) }
  b.count++
  return { allowed: true, retryAfterSec: 0 }
}

// Best-guess client IP from the platform's forwarding headers.
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || ''
  const first = xff.split(',')[0].trim()
  return first || req.headers.get('x-real-ip') || 'unknown'
}
