import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
import type { BuildSeed } from '@/lib/buildSeed'
export const dynamic = 'force-dynamic'

// What the builder pre-fills for a returning visitor: their own CV (or form
// answers) and "Anything to add or change?" notes from their last CV build.
// The owner is this browser's cookie (member or guest), never an email, so it
// returns nothing My CVs wouldn't already show here. The job fields are left
// out on purpose: every build is for a new advert.
export async function POST() {
  const noStore = { headers: { 'Cache-Control': 'no-store' } }
  const access = await currentAccess()
  if (!access) return NextResponse.json({ input: null }, noStore)
  const { data, error } = await supabaseAdmin.from('customer_history')
    .select('raw_input, created_at')
    .eq('owner_id', access.id).neq('cv_type', 'cover_letter')
    .order('created_at', { ascending: false }).limit(1)
  const row = data?.[0]
  const raw = row?.raw_input as BuildSeed | null | undefined
  if (error || !row || !raw || (!raw.pasteContent && !raw.form)) return NextResponse.json({ input: null }, noStore)
  const form = raw.form ? { ...raw.form, jobTitle: undefined, company: undefined } : undefined
  return NextResponse.json({
    input: {
      inputMethod: raw.inputMethod,
      pasteContent: raw.pasteContent,
      uploadedFileName: raw.uploadedFileName,
      changes: raw.changes,
      form,
    },
    at: row.created_at,
  }, noStore)
}
