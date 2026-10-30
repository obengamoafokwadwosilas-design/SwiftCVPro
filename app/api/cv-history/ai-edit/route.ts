export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { currentAccess } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { editDocument, WriterError } from '@/lib/cvEngine'
import { aiEditsLeft, takeAiEdit, refundAiEdit } from '@/lib/aiEdits'
import { alertOwner } from '@/lib/alerts'
import type { GeneratedCV } from '@/types'

const MAX_INSTRUCTION = 1500
const MAX_CV_JSON = 60_000

// "Edit with RemarkableCV": applies the person's change requests to their CV.
// Each document has one free edit plus any bought (see supabase_ai_edits.sql);
// an edit is taken before the AI call and handed back if the call fails.
// The CV to edit comes from the browser (so hand edits made on screen are
// kept) but the name is locked to the one saved with the document, so a
// purchase can't be used to write someone else's CV.
export async function POST(req: Request) {
  const noStore = { 'Cache-Control': 'no-store' }
  const body = await req.json().catch(() => ({}))
  const { historyId, instruction, cv } = body as { historyId?: number; instruction?: string; cv?: GeneratedCV }
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Open your CV again from My CVs to edit it.' }, { status: 401, headers: noStore })
  if (!Number.isSafeInteger(historyId) || (historyId as number) < 1 || !cv || typeof cv !== 'object' || typeof instruction !== 'string') {
    return NextResponse.json({ error: 'Something was missing from that request.' }, { status: 400, headers: noStore })
  }
  const text = instruction.trim()
  if (text.length < 3) return NextResponse.json({ error: 'Tell us what you would like changed.' }, { status: 400, headers: noStore })
  if (text.length > MAX_INSTRUCTION) return NextResponse.json({ error: 'That is a bit long — please keep it under 1,500 characters.' }, { status: 400, headers: noStore })
  if (JSON.stringify(cv).length > MAX_CV_JSON) return NextResponse.json({ error: 'This CV is too long to edit this way.' }, { status: 400, headers: noStore })
  const id = historyId as number

  const { data: row } = await supabaseAdmin.from('customer_history')
    .select('cv_type, generated_cv').eq('id', id).eq('owner_id', access.id).maybeSingle()
  if (!row || row.cv_type === 'cover_letter') return NextResponse.json({ error: 'This document cannot be edited this way.' }, { status: 404, headers: noStore })
  const savedName = (row.generated_cv as GeneratedCV | null)?.fullName || cv.fullName

  const status = await aiEditsLeft(access.id, id)
  if (!status.available) return NextResponse.json({ error: 'AI edits are not available yet.' }, { status: 503, headers: noStore })

  let taken = false
  try { taken = await takeAiEdit(access.id, id) } catch (error) {
    await alertOwner('AI edits cannot be counted', error)
    return NextResponse.json({ error: 'Could not start your edit. Please try again.' }, { status: 503, headers: noStore })
  }
  if (!taken) return NextResponse.json({ error: 'NO_EDITS', left: 0 }, { status: 402, headers: noStore })

  try {
    const { doc } = await editDocument({ ...cv, fullName: savedName }, text, row.cv_type)
    const { error } = await supabaseAdmin.from('customer_history').update({ generated_cv: doc }).eq('id', id).eq('owner_id', access.id)
    if (error) throw new Error('Could not save the edited CV: ' + error.message)
    const after = await aiEditsLeft(access.id, id)
    return NextResponse.json({ success: true, cv: doc, left: after.left }, { headers: noStore })
  } catch (err) {
    await refundAiEdit(access.id, id)
    if (err instanceof Anthropic.AuthenticationError) await alertOwner('AI edits are DOWN: AI key rejected', err)
    else if (err instanceof Anthropic.APIError && [429, 503, 529].includes(err.status ?? 0)) {
      await alertOwner('AI service busy or out of credit', `HTTP ${err.status}: ${err.message}`)
      return NextResponse.json({ error: 'The AI service is busy. Please wait 30 seconds and try again — your edit has been kept.' }, { status: 503, headers: noStore })
    } else if (!(err instanceof WriterError)) await alertOwner('AI edit failed unexpectedly', err)
    return NextResponse.json({ error: 'We could not apply that edit. Your edit has been kept — please try again.' }, { status: 500, headers: noStore })
  }
}
