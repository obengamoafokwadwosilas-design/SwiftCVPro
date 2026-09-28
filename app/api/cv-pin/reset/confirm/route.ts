import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Request an email link, then set a new PIN from My CVs.' }, { status: 410 })
}
