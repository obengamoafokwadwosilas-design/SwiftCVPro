export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { currentAccess, resolveOwner } from '@/lib/customerAuth'
import { setGuestContact } from '@/lib/guest'
import { normalizeEmail, isValidEmail } from '@/lib/email'
import { clientIp } from '@/lib/rateLimit'
import { writeDocument, WriterError, cvFormDataFromRequest } from '@/lib/cvEngine'
import type { CVFormData, GeneratedCV } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'
import type { BuildSeed } from '@/lib/buildSeed'

// ── Save every generation to history ──────────────────────────
// Every CV a user generates is kept permanently (never expires) so it can be
// previewed, re-downloaded for free, or rewritten into a fresh tailored
// generation later. template_id/accent_color aren't known yet at this point
// (template choice happens on the preview page, after generation) — they're
// filled in via /api/cv-history/update-template once the user picks one;
// this row is saved with a sensible default so it's never missing entirely
// even if the user closes the tab before reaching the preview page.
// raw_input is saved in the same shape the builder itself understands
// (BuildSeed), so "Rewrite for another job" can feed it straight back in.
async function saveToHistory(
  ownerId: string,
  accessEmail: string,
  cvType: string,
  formData: CVFormData | undefined,
  rawContent: string | undefined,
  jobDescription: string | undefined,
  changes: string | undefined,
  uploadedFileName: string | undefined,
  generatedCV: GeneratedCV
): Promise<number | null> {
  try {
    const rawInput: BuildSeed = formData
      ? {
          cvType: (formData.cvType || cvType || 'professional') as BuildSeed['cvType'],
          inputMethod: 'form',
          email: accessEmail,
          form: {
            fullName: formData.fullName, phone: formData.phone, email: formData.email, location: formData.location,
            dob: formData.dob, nationality: formData.nationality, linkedin: formData.linkedin,
            education: formData.education, gpa: formData.gpa, thesis: formData.thesis, research: formData.research,
            experience: formData.experience, publications: formData.publications, teaching: formData.teaching, conferences: formData.conferences,
            extras: formData.extras, grants: formData.grants, supervision: formData.supervision, orcid: formData.orcid,
            jobTitle: formData.jobTitle_target, company: formData.company,
          },
          jobDescription: formData.jobDescription,
          whyRole: formData.whyRole,
          landingScreen: 'type',
        }
      : {
          cvType: (cvType || 'professional') as BuildSeed['cvType'],
          inputMethod: 'paste',
          email: accessEmail,
          pasteContent: rawContent,
          changes,
          uploadedFileName,
          jobDescription,
          landingScreen: 'type',
        }

    const { insertCvHistory } = await import('@/lib/cvHistory')
    return await insertCvHistory({ ownerId, generatedCv: generatedCV, rawInput })
  } catch (err) {
    console.error('saveToHistory failed (non-fatal):', err)
    return null
  }
}

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(id: string) {
  const now = Date.now()
  const rec = rateLimitMap.get(id)
  if (!rec || now > rec.resetTime) {
    rateLimitMap.set(id, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, resetIn: RATE_LIMIT_WINDOW }
  }
  if (rec.count >= RATE_LIMIT_MAX) return { allowed: false, resetIn: rec.resetTime - now }
  rec.count++
  return { allowed: true, resetIn: rec.resetTime - now }
}

export async function POST(req: NextRequest) {
  // Assigned once a free use has actually been taken for this request, so the
  // catch-all at the bottom can hand it back too — not just the specific
  // failure paths inside.
  let refundOnFailure: (() => Promise<void>) | null = null
  try {
    // ── Validate API key ──────────────────────────
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 })
    }

    const body = await req.json()
    const { cvType, rawContent, jobDescription, whyRole, changes, email, intent } = body
    // Only a label for the "from your last visit" card — never read as content.
    const uploadedFileName = typeof body.uploadedFileName === 'string' ? body.uploadedFileName.slice(0, 200) : undefined
    const formData = body.formData

    if (!rawContent && !formData) {
      return NextResponse.json({ error: 'Please provide your CV details before generating.' }, { status: 400 })
    }

    // Who owns this work: the signed-in member, or else this browser's own
    // guest. The typed email is only where the receipt goes — it never decides
    // whose credits are spent, which is why a stranger typing someone's address
    // gets nothing of theirs. A guest must leave one address to be reachable.
    const typedEmail = normalizeEmail(email)
    const existing = await currentAccess()
    if (!existing && !isValidEmail(typedEmail)) {
      return NextResponse.json({ error: 'Please enter your email address.' }, { status: 400 })
    }
    const owner = existing || await resolveOwner()
    const ownerId = owner.id
    let contactEmail = owner.email
    if (owner.guest && isValidEmail(typedEmail) && typedEmail !== owner.email) {
      await setGuestContact(owner.id, typedEmail)
      contactEmail = typedEmail
    }
    if (!contactEmail) return NextResponse.json({ error: 'Please enter your email address.' }, { status: 400 })
    const ip = clientIp(req)

    // ── Rate limit ────────────────────────────────
    const rateCheck = checkRateLimit(ip)
    if (!rateCheck.allowed) {
      const mins = Math.ceil(rateCheck.resetIn / 60000)
      return NextResponse.json({
        error: `Too many attempts. Please wait ${mins} minutes and try again.`
      }, { status: 429 })
    }

    // ── Generation is free (capped) — the real gate is at download ──
    // Type-aware: a cover letter draws from the cover-letter pool, a CV from
    // the CV pool — separate currencies (see packages.ts), same as before.
    //
    // Credits belong to the owner of this browser (or the signed-in member); the free-preview cap is counted against that owner too.
    const isCoverLetterDoc = cvType === 'cover_letter'
    // Tracks whether a free or paid use was reserved for this request so any
    // failure path can hand it back — nobody should lose a credit to our error.
    let consumedFreeUse = false
    let consumedPaidCredit = false
    try {
      const { hasCredits, hasCoverLetterCredit, deductCredit, deductCoverLetterCredit } = await import('@/lib/credits')
      // intent 'preview' (the "free preview first" button) never spends a credit;
      // 'build' (pay first) must never silently fall back to a free preview —
      // if there is nothing to spend, it says payment is needed.
      const paid = intent !== 'preview' && (isCoverLetterDoc ? await hasCoverLetterCredit(ownerId) : await hasCredits(ownerId))
      if (!paid && intent === 'build') {
        return NextResponse.json({ error: 'PAYMENT_REQUIRED', message: 'Payment is needed to build this document.' }, { status: 402 })
      }
      if (paid) {
        // Deduct the credit BEFORE the AI call. This directly ties one API
        // call to one credit — a paid user cannot run the AI 500 times on a
        // single credit by never downloading. The export routes will see
        // download_paid=true (set below after history is saved) and serve the
        // file without a second charge.
        const ok = isCoverLetterDoc ? await deductCoverLetterCredit(ownerId) : await deductCredit(ownerId)
        if (!ok) {
          return NextResponse.json({ error: 'NO_CREDITS', message: 'You need a credit to generate. Please buy a package first.' }, { status: 402 })
        }
        consumedPaidCredit = true
      } else {
        const { consumeFreeGeneration } = await import('@/lib/freeGenerations')
        const { allowed } = await consumeFreeGeneration(ip, ownerId, isCoverLetterDoc)
        if (!allowed) {
          return NextResponse.json({
            error: 'FREE_CAP_REACHED',
            message: "You've used your free previews. Purchase CV credits to keep generating and download your CV."
          }, { status: 402 })
        }
        consumedFreeUse = true
      }
    } catch (err) {
      console.error('Credits check error:', err)
      return NextResponse.json({
        error: 'Payment verification failed. Please check your connection or contact support.'
      }, { status: 503 })
    }

    const refundFree = async () => {
      if (!consumedFreeUse) return
      consumedFreeUse = false
      const { refundFreeGeneration } = await import('@/lib/freeGenerations')
      await refundFreeGeneration(ip, ownerId, isCoverLetterDoc)
    }
    const refundPaid = async () => {
      if (!consumedPaidCredit) return
      consumedPaidCredit = false
      const { addCredits, grantCoverLetterCredit } = await import('@/lib/credits')
      if (isCoverLetterDoc) await grantCoverLetterCredit(ownerId, 1)
      else await addCredits(ownerId, 1)
      console.log(`[Generate] Refunded 1 credit to ${ownerId} after failure`)
    }
    refundOnFailure = async () => { await refundFree(); await refundPaid() }

    // ── Write it ──────────────────────────────────
    console.log(`[Generate] owner=${ownerId} cvType=${cvType}`)
    let generatedCV: GeneratedCV
    try {
      ({ doc: generatedCV } = await writeDocument(formData || cvFormDataFromRequest(body)))
    } catch (err) {
      console.error('Writer error:', err)
      await refundOnFailure()
      if (err instanceof Anthropic.AuthenticationError) {
        return NextResponse.json({ error: 'API key error. Please contact support.' }, { status: 500 })
      }
      if (err instanceof Anthropic.APIError && [429, 503, 529].includes(err.status ?? 0)) {
        return NextResponse.json({ error: 'AI service is busy. Please wait 30 seconds and try again.' }, { status: 503 })
      }
      if (err instanceof WriterError && err.kind === 'truncated') {
        return NextResponse.json({ error: 'Your details are too long to fit in one CV. Please shorten them and try again — your credit or preview has been returned.' }, { status: 500 })
      }
      return NextResponse.json({ error: 'Generation failed. Your credit or preview has been returned — please try again.' }, { status: 500 })
    }

    // ── Save to history, then mark download paid for paid generations ──
    // Paid users spend their credit at generate time (above). The export routes
    // check download_paid=true and serve the file without a second charge.
    const historyId = await saveToHistory(ownerId, contactEmail, cvType, formData, rawContent, jobDescription, changes, uploadedFileName, generatedCV)

    if (!historyId) {
      await refundOnFailure()
      return NextResponse.json({ error: 'Could not save your document. Your credit or preview has been returned. Please try again.' }, { status: 503 })
    }
    if (consumedPaidCredit && historyId) {
      try {
        const { markDownloadPaid } = await import('@/lib/credits')
        await markDownloadPaid(ownerId, historyId)
      } catch (err) {
        await refundPaid()
        return NextResponse.json({ error: 'Could not confirm your document credit. It has been refunded.' }, { status: 503 })
      }
    }

    console.log(`[Generate] ✅ Success for ${ownerId}`)
    return NextResponse.json({ success: true, cv: generatedCV, historyId, paid: consumedPaidCredit })

  } catch (error: any) {
    console.error('Unhandled generate error:', error)
    if (refundOnFailure) await refundOnFailure()
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
