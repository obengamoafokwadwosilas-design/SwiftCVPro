export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { GOOGLE_COOKIE_PATH, GOOGLE_OAUTH_COOKIE, googleRedirectUri, safeNext, siteBase } from '@/lib/googleAuth'

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Google sign-in is not configured: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing')
    return NextResponse.redirect(new URL('/my-cvs?error=google', siteBase(req)))
  }

  const state = crypto.randomBytes(16).toString('hex')
  const nonce = crypto.randomBytes(16).toString('hex')
  const next = safeNext(req.nextUrl.searchParams.get('next'))

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    prompt: 'select_account',
  })

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  res.cookies.set(GOOGLE_OAUTH_COOKIE, JSON.stringify({ state, nonce, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: GOOGLE_COOKIE_PATH,
    maxAge: 600,
  })
  return res
}
