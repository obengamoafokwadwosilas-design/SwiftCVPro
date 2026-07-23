export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabase'

// One call powering the whole /admin dashboard: headline stats plus the rows
// for every tab. Volumes are small for this business, so we read recent slices
// rather than paginating. Read-only; all mutations go through /api/admin/adjust.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [
      paymentsCountRes,
      customersCountRes,
      cvsCountRes,
      allPaymentAmounts,
      recentPayments,
      creditRows,
      pinRows,
      generations,
      pinResets,
    ] = await Promise.all([
      supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('cv_credits').select('phone_number', { count: 'exact', head: true }),
      supabaseAdmin.from('cv_history').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('payments').select('phone_number, amount, cv_credits').limit(2000),
      supabaseAdmin.from('payments').select('phone_number, amount, package_id, paystack_reference, created_at').order('created_at', { ascending: false }).limit(25),
      supabaseAdmin.from('cv_credits').select('phone_number, credits, cover_letter_credits, created_at').order('created_at', { ascending: false }).limit(300),
      supabaseAdmin.from('customer_pins').select('phone_number, email').limit(2000),
      supabaseAdmin.from('cv_history').select('phone_number, cv_type, template_id, label, created_at').order('created_at', { ascending: false }).limit(25),
      supabaseAdmin.from('pin_resets').select('phone_number, used, expires_at, created_at').order('created_at', { ascending: false }).limit(25),
    ])

    const revenuePesewas = (allPaymentAmounts.data || []).reduce((s, p: any) => s + (p.amount || 0), 0)

    // totalPurchased (CV credits ever bought) per phone, from payments.
    const purchasedByPhone = new Map<string, number>()
    for (const p of (allPaymentAmounts.data || []) as any[]) {
      purchasedByPhone.set(p.phone_number, (purchasedByPhone.get(p.phone_number) || 0) + (p.cv_credits || 0))
    }
    const emailByPhone = new Map<string, string>()
    for (const c of (pinRows.data || []) as any[]) {
      if (c.email) emailByPhone.set(c.phone_number, c.email)
    }

    const customers = ((creditRows.data || []) as any[]).map(r => ({
      phone_number: r.phone_number,
      email: emailByPhone.get(r.phone_number) || null,
      credits: r.credits ?? 0,
      cover_letter_credits: r.cover_letter_credits ?? 0,
      total_purchased: purchasedByPhone.get(r.phone_number) || 0,
      created_at: r.created_at,
    }))

    return NextResponse.json({
      stats: {
        revenue: revenuePesewas / 100,
        payments: paymentsCountRes.count || 0,
        customers: customersCountRes.count || 0,
        cvsGenerated: cvsCountRes.count || 0,
      },
      recentPayments: recentPayments.data || [],
      customers,
      generations: generations.data || [],
      pinResets: pinResets.data || [],
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
