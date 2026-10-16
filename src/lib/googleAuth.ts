import type { NextRequest } from 'next/server'
import { SITE_URL } from './site'

export const GOOGLE_OAUTH_COOKIE = 'scv_google_oauth'
export const GOOGLE_COOKIE_PATH = '/api/auth/google'

// Redirects are built from the canonical host in production so a callback can
// never land on a different origin than the one Google was told about (the
// redirect URI must match what is registered in Google Cloud byte for byte).
export const siteBase = (req: NextRequest) =>
  process.env.NODE_ENV === 'production' ? SITE_URL : req.nextUrl.origin

export const googleRedirectUri = (req: NextRequest) => `${siteBase(req)}/api/auth/google/callback`

// Only same-site, in-app destinations: this value round-trips through a query
// string, so anything else would be an open redirect.
const NEXT_ALLOWED = /^\/(build|preview|account)?(\?[^#\s]*)?$/

export function safeNext(value: string | null | undefined): string | null {
  if (!value || value.startsWith('//') || value.includes('\\')) return null
  return NEXT_ALLOWED.test(value) ? value : null
}
