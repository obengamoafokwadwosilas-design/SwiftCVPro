import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { ownerHasCode, setOwnerCode } from '@/lib/accessCode'
import { accessCodeProblem } from '@/lib/accessCodeRules'
export const dynamic = 'force-dynamic'

// Setting a FIRST code needs nothing more than owning the account in this
// browser — it is what protects the CVs and credits already here. Changing an
// existing code needs a fresh email link (within 30 minutes), so whoever picks
// up an unlocked phone can't lock the owner out or take the account with them.
export async function POST(req: Request) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'There is nothing to protect in this browser yet.' }, { status: 401 })
  const body = await req.json()
  const code = typeof body.code === 'string' ? body.code : body.pin
  const problem = typeof code === 'string' ? accessCodeProblem(code) : 'Use exactly 4 digits.'
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  if (await ownerHasCode(access.id)) {
    const fresh = !access.guest && Date.now() - new Date(access.verifiedAt).getTime() <= 30 * 60000
    if (!fresh) return NextResponse.json({ error: 'To change your access code, open a fresh email link first.' }, { status: 401 })
  }
  try { await setOwnerCode(access.id, code) } catch { return NextResponse.json({ error: 'Could not save your access code.' }, { status: 500 }) }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
