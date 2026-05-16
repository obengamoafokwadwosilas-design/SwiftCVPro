import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Server PDF export disabled. Use browser print instead.' },
    { status: 410 }
  )
}
