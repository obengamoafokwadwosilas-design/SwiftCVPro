export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { customerForEmail, startSession } from '@/lib/customerAuth'

// GoTrue is only a disposable OAuth broker here — it does the Google handshake
// and hands back a verified email, then its own session is discarded. The real
// app session is still the existing scv_access cookie (see customerAuth.ts), so
// Google sign-in resolves into the exact same customer-by-email record the
// email-link flow already uses, rather than a parallel account system.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/my-cvs?error=google', req.url))

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  const email = data?.user?.email
  if (error || !email || !data.user?.email_confirmed_at) {
    return NextResponse.redirect(new URL('/my-cvs?error=google', req.url))
  }

  try {
    const customer = await customerForEmail(email)
    await supabase.auth.signOut()
    await startSession(customer.id, new Date().toISOString(), true)
  } catch {
    return NextResponse.redirect(new URL('/my-cvs?error=google', req.url))
  }

  return NextResponse.redirect(new URL('/account', req.url))
}
