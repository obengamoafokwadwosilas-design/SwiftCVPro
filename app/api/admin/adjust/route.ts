export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import {
  normalizePhone, getCredits, getCoverLetterCredits,
  addCredits, grantCoverLetterCredit, adminSetCredits,
} from '@/lib/credits'

// Admin: change a phone's balances.
//   mode: 'add' → addCv / addCl are ADDED to current balances (can be negative
//                 for a correction; result floored at 0 by the set path below).
//   mode: 'set' → setCv / setCl OVERWRITE to the exact value given.
// Returns the fresh balances after the change so the UI can show the result.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { phoneNumber, mode } = body
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    if (mode !== 'add' && mode !== 'set' && mode !== 'reset') {
      return NextResponse.json({ error: 'mode must be "add", "set" or "reset"' }, { status: 400 })
    }
    const phone = normalizePhone(phoneNumber)

    if (mode === 'reset') {
      // Destructive — require an explicit typed confirmation, same guard the UI
      // shows ("Type RESET"). resetType picks which counter(s) go to zero.
      if (body.confirm !== 'RESET') {
        return NextResponse.json({ error: 'Type RESET to confirm' }, { status: 400 })
      }
      const rt = body.resetType || 'credits'
      const fields: { credits?: number; coverLetterCredits?: number } = {}
      if (rt === 'credits' || rt === 'both') fields.credits = 0
      if (rt === 'coverLetters' || rt === 'both') fields.coverLetterCredits = 0
      const ok = await adminSetCredits(phone, fields)
      if (!ok) return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
    } else if (mode === 'set') {
      const setCv = num(body.setCv)
      const setCl = num(body.setCl)
      if (setCv === undefined && setCl === undefined) {
        return NextResponse.json({ error: 'Nothing to set' }, { status: 400 })
      }
      const ok = await adminSetCredits(phone, { credits: setCv, coverLetterCredits: setCl })
      if (!ok) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    } else {
      const addCv = num(body.addCv)
      const addCl = num(body.addCl)
      if (!addCv && !addCl) {
        return NextResponse.json({ error: 'Nothing to add' }, { status: 400 })
      }
      // A positive delta uses the race-safe RPC. A negative delta (correction)
      // can't go through the increment RPC cleanly, so clamp via a set.
      if (addCv) {
        if (addCv > 0) { if (!(await addCredits(phone, addCv))) return NextResponse.json({ error: 'Update failed' }, { status: 500 }) }
        else { const cur = await getCredits(phone); await adminSetCredits(phone, { credits: cur + addCv }) }
      }
      if (addCl) {
        if (addCl > 0) { if (!(await grantCoverLetterCredit(phone, addCl))) return NextResponse.json({ error: 'Update failed' }, { status: 500 }) }
        else { const cur = await getCoverLetterCredits(phone); await adminSetCredits(phone, { coverLetterCredits: cur + addCl }) }
      }
    }

    const [credits, coverLetterCredits] = await Promise.all([
      getCredits(phone),
      getCoverLetterCredits(phone),
    ])
    return NextResponse.json({ phoneNumber: phone, credits, coverLetterCredits })
  } catch (error) {
    console.error('Admin adjust error:', error)
    return NextResponse.json({ error: 'Adjust failed' }, { status: 500 })
  }
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}
