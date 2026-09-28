export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabase'
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const results = await Promise.all([
      supabaseAdmin.from('customers').select('id, email, created_at').order('created_at', { ascending: false }).limit(2000),
      supabaseAdmin.from('customer_credits').select('owner_id, credits, cover_letter_credits').limit(2000),
      supabaseAdmin.from('customer_payments').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(2000),
      supabaseAdmin.from('customer_history').select('owner_id, cv_type, template_id, label, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(25),
      supabaseAdmin.from('customer_access_links').select('owner_id, used_at, expires_at, created_at').order('created_at', { ascending: false }).limit(25),
    ])
    if (results.some(r => r.error)) throw new Error('Could not read customer records.')
    const [people, balances, payments, history, links] = results
    const emailById = new Map((people.data || []).map(c => [c.id, c.email]))
    const balanceById = new Map((balances.data || []).map(c => [c.owner_id, c]))
    const emailRows = (rows: any[]) => rows.map(r => ({ ...r, email: emailById.get(r.owner_id) || 'Unknown customer' }))
    return NextResponse.json({
      stats: { revenue: (payments.data || []).reduce((sum, r) => sum + r.amount, 0) / 100, payments: payments.count || 0, customers: people.data?.length || 0, cvsGenerated: history.count || 0 },
      recentPayments: emailRows((payments.data || []).slice(0, 25)),
      customers: (people.data || []).map(c => ({
        email: c.email, credits: balanceById.get(c.id)?.credits || 0, cover_letter_credits: balanceById.get(c.id)?.cover_letter_credits || 0,
        total_purchased: (payments.data || []).filter(p => p.owner_id === c.id).reduce((sum, p) => sum + p.cv_credits, 0), created_at: c.created_at,
      })),
      generations: emailRows(history.data || []),
      pinResets: emailRows((links.data || []).map(r => ({ ...r, used: !!r.used_at }))),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Could not load the dashboard.' }, { status: 500 }) }
}
