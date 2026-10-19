import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

// Whether a saved document has been paid for, so the preview knows whether to
// show the finished CV or the protected preview. Only the owner (this browser's
// guest, or the signed-in member) can ask about a document; anyone else — or an
// id that does not exist — gets the same "not paid", so ids cannot be probed.
export async function POST(req: Request) {
  const { historyId } = await req.json().catch(() => ({}))
  const access = await currentAccess()
  if (!access || !Number.isSafeInteger(historyId) || historyId < 1) {
    return NextResponse.json({ paid: false }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const { data } = await supabaseAdmin.from('customer_history').select('download_paid')
    .eq('id', historyId).eq('owner_id', access.id).maybeSingle()
  return NextResponse.json({ paid: !!data?.download_paid }, { headers: { 'Cache-Control': 'no-store' } })
}
