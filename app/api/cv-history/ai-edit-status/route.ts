import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { aiEditsLeft } from '@/lib/aiEdits'
export const dynamic = 'force-dynamic'

// How many AI edits this document has left, for the owner's browser only.
// `available: false` means the option stays hidden (not their document, or the
// database isn't set up for AI edits yet) — never an error the page shows.
export async function POST(req: Request) {
  const noStore = { headers: { 'Cache-Control': 'no-store' } }
  const { historyId } = await req.json().catch(() => ({}))
  const access = await currentAccess()
  if (!access || !Number.isSafeInteger(historyId) || historyId < 1) return NextResponse.json({ available: false, left: 0 }, noStore)
  return NextResponse.json(await aiEditsLeft(access.id, historyId), noStore)
}
