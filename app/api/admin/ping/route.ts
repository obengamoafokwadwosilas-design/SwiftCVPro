export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'

// Tiny gate check so the admin page can verify the key on "Unlock" without
// having to look anything up. 200 → key good, 401 → wrong/missing key.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ ok: true })
}
