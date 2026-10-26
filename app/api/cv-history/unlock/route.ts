import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { getCredits, getCoverLetterCredits, isDownloadPaid, payDocument } from '@/lib/credits'
export const dynamic = 'force-dynamic'

// Unlocks a previewed document with a credit the owner already holds — a pack
// bought earlier, or one just paid for — without rendering a file. The export
// routes spend a credit the same way (payDocument), so a document unlocked here
// downloads free in every format afterwards, and one already paid costs nothing.
export async function POST(req: Request) {
  const noStore = { 'Cache-Control': 'no-store' }
  const { historyId, isCoverLetter } = await req.json().catch(() => ({}))
  const access = await currentAccess()
  if (!access || !Number.isSafeInteger(historyId) || historyId < 1) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers: noStore })
  }
  const cover = !!isCoverLetter
  try {
    const paid = await isDownloadPaid(access.id, historyId, cover) || await payDocument(access.id, historyId, cover)
    if (!paid) return NextResponse.json({ error: 'NO_CREDITS' }, { status: 402, headers: noStore })
    const left = cover ? await getCoverLetterCredits(access.id) : await getCredits(access.id)
    return NextResponse.json({ paid: true, creditsLeft: left }, { headers: noStore })
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers: noStore })
  }
}
