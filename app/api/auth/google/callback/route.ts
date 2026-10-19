export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { customerForEmail, startSession } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { adoptBrowserGuest, adoptGuestsByContact } from '@/lib/guest'
import { GOOGLE_COOKIE_PATH, GOOGLE_OAUTH_COOKIE, googleRedirectUri, safeNext, siteBase } from '@/lib/googleAuth'

// Google sign-in talks to Google directly (no Supabase Auth in the middle) so
// the consent screen shows this site's own domain. Google only returns a
// verified email; the real app session is still the scv_access cookie from
// customerAuth.ts, and the email resolves to the same `customers` row the
// email-link flow uses.
export async function GET(req: NextRequest) {
  const base = siteBase(req)
  const go = (path: string) => {
    const res = NextResponse.redirect(new URL(path, base))
    res.cookies.set(GOOGLE_OAUTH_COOKIE, '', { path: GOOGLE_COOKIE_PATH, maxAge: 0 })
    return res
  }
  const failed = () => go('/my-cvs?error=google')

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  if (req.nextUrl.searchParams.get('error')) return go('/my-cvs')
  if (!code || !state) return failed()

  let saved: { state?: string; nonce?: string; next?: string | null } = {}
  try { saved = JSON.parse(req.cookies.get(GOOGLE_OAUTH_COOKIE)?.value || '{}') } catch {}
  if (!saved.state || saved.state !== state) return failed()

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return failed()

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: googleRedirectUri(req),
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokenRes.ok || typeof tokens.id_token !== 'string') return failed()

    // The id_token came straight from Google's token endpoint over TLS in
    // exchange for our client secret, so per the OpenID Connect spec its
    // signature need not be re-verified — only its claims.
    const claims = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString())
    const issuerOk = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com'
    if (!issuerOk || claims.aud !== clientId || claims.nonce !== saved.nonce) return failed()
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return failed()
    if (claims.email_verified !== true || typeof claims.email !== 'string') return failed()

    const customer = await customerForEmail(claims.email)
    // Google verified this address, so CVs and credits made in this browser (and
    // by other browsers that left it as their receipt address) become this account's.
    await adoptGuestsByContact(customer.email, customer.id)
    await adoptBrowserGuest(customer.id)
    await startSession(customer.id, new Date().toISOString(), true)

    // Someone signing in mid-build returns to where they were; otherwise a
    // returning customer sees their account and a new one starts a CV rather
    // than landing on an empty dashboard.
    const next = safeNext(saved.next)
    if (next) return go(next)
    const { count } = await supabaseAdmin.from('customer_history')
      .select('id', { count: 'exact', head: true }).eq('owner_id', customer.id)
    return go(count ? '/account' : '/build')
  } catch (error) {
    console.error('Google sign-in failed:', error)
    return failed()
  }
}
