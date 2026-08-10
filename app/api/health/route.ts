export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Keep-alive target for an external cron (e.g. cron-job.org) pinging this on
// a schedule. Supabase's free tier auto-pauses a project after 7 days with no
// DATABASE activity — a plain 200 OK that never touches Supabase does nothing
// for that; this route runs a trivial real query so the ping actually counts.
// Public and unauthenticated on purpose (a cron service just does a GET), and
// deliberately returns nothing but a status — no counts, no rows, no schema.
export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('cv_credits').select('phone_number').limit(1)
    if (error) return NextResponse.json({ ok: false }, { status: 503 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
