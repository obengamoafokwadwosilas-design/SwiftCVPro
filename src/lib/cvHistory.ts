import { supabaseAdmin } from './supabase'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { digest } from './customerAuth'
import type { BuildSeed } from './buildSeed'
import type { GeneratedCV } from '@/types'

// Single place every generated document is written to cv_history from, so the
// two generation routes can't drift apart on the row's shape.
//
// Saving is what gives a document its permanent id — and that id is what makes
// the download paywall charge once per DOCUMENT rather than once per download
// (see isDownloadPaid/markDownloadPaid in credits.ts). A document that never
// reaches this table has no id, so every one of its downloads is billed
// separately — which is exactly the bug that made cover letters cost a credit
// for the PDF and another for the Word file.
//
// Best-effort by design: history is a convenience, so a failure here is logged
// and swallowed rather than failing a generation the user already waited for.
// accent_color/template_id aren't known yet (the template is chosen later, on
// the preview page) — /api/cv-history/update-template fills them in.
export async function insertCvHistory(opts: {
  ownerId: string
  generatedCv: GeneratedCV
  rawInput: BuildSeed
  templateId?: string
}): Promise<number | null> {
  try {
    let token = cookies().get('scv_draft')?.value
    if (!token) {
      token = crypto.randomBytes(32).toString('hex')
      cookies().set('scv_draft', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' })
    }
    const { data, error } = await supabaseAdmin
      .from('customer_history')
      .insert({
        owner_id: opts.ownerId,
        draft_hash: digest(token),
        cv_type: opts.rawInput.cvType,
        template_id: opts.templateId || 'meridian',
        accent_color: null,
        label: null,
        generated_cv: opts.generatedCv,
        raw_input: opts.rawInput,
      })
      .select('id')
      .single()

    if (error) { console.error('cv_history insert error (non-fatal):', error); return null }
    return data?.id ?? null
  } catch (err) {
    console.error('cv_history insert failed (non-fatal):', err)
    return null
  }
}
