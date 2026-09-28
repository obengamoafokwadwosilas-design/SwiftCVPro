import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export async function POST() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Verify your email to open My CVs.' }, { status: 401 })
  const { data, error } = await supabaseAdmin.from('customer_history')
    .select('id, cv_type, template_id, accent_color, label, generated_cv, raw_input, created_at')
    .eq('owner_id', access.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Could not load your CVs.' }, { status: 500 })
  return NextResponse.json({ success: true, email: access.email, history: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
}
