import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/customerAuth'
import { ownerHasCode } from '@/lib/accessCode'
export const dynamic = 'force-dynamic'
// Whether the account in THIS browser has an access code — never asks about an
// email address, so it can't be used to learn whether someone is a customer.
// `verified` is whether that account proved an email (members only).
export async function POST() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ pin_set: false, verified: false }, { headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json({ pin_set: await ownerHasCode(access.id), verified: !access.guest }, { headers: { 'Cache-Control': 'no-store' } })
}
