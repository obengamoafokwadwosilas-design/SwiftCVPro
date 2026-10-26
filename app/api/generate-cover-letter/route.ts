export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { currentAccess, resolveOwner } from '@/lib/customerAuth'
import { setGuestContact } from '@/lib/guest'
import { normalizeEmail, isValidEmail } from '@/lib/email'
import { clientIp } from '@/lib/rateLimit'
import { writeDocument, WriterError, serializeCV } from '@/lib/cvEngine'
import type { CVFormData, GeneratedCV } from '@/types'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW = 60 * 60 * 1000

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
  // Assigned once a free use has been taken, so the catch-all below can hand
  // it back too — not just the specific failure paths inside.
  let refundOnFailure: (() => Promise<void>) | null = null
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 })
    }

    const body = await req.json()
    const { cv, jobDescription, company, email } = body as {
      cv: GeneratedCV; jobDescription?: string; company?: string; email: string
    }

    if (!cv || !cv.fullName) return NextResponse.json({ error: 'No CV found to build a cover letter from.' }, { status: 400 })
    // Same ownership rule as /api/generate: the signed-in member or this
    // browser's guest owns the credits; the typed email is only the receipt address.
    const typedEmail = normalizeEmail(email)
    const existing = await currentAccess()
    if (!existing && !isValidEmail(typedEmail)) return NextResponse.json({ error: 'Please enter your email address.' }, { status: 400 })
    const owner = existing || await resolveOwner()
    const ownerId = owner.id
    let contactEmail = owner.email
    if (owner.guest && isValidEmail(typedEmail) && typedEmail !== owner.email) {
      await setGuestContact(owner.id, typedEmail)
      contactEmail = typedEmail
    }
    if (!contactEmail) return NextResponse.json({ error: 'Please enter your email address.' }, { status: 400 })
    const ip = clientIp(req)

    const rateCheck = checkRateLimit(ip)
    if (!rateCheck.allowed) {
      const mins = Math.ceil(rateCheck.resetIn / 60000)
      return NextResponse.json({ error: `Too many attempts. Please wait ${mins} minutes and try again.` }, { status: 429 })
    }

    // Credit deducted at generation (same model as app/api/generate/route.ts).
    // Paid users spend the cover-letter credit here, before the AI call.
    // Free users get the small free cap, also consumed before the AI call.
    // Either way, any failure below refunds what was reserved.
    let consumedFreeUse = false
    let consumedPaidCredit = false
    try {
      const { hasCoverLetterCredit, deductCoverLetterCredit } = await import('@/lib/credits')
      const paid = await hasCoverLetterCredit(ownerId)
      if (paid) {
        const ok = await deductCoverLetterCredit(ownerId)
        if (!ok) {
          return NextResponse.json({ error: 'NO_CREDITS', message: 'You need a cover-letter credit to generate. Please buy a package first.' }, { status: 402 })
        }
        consumedPaidCredit = true
      } else {
        const { consumeFreeGeneration } = await import('@/lib/freeGenerations')
        const { allowed } = await consumeFreeGeneration(ip, ownerId, true)
        if (!allowed) {
          return NextResponse.json({
            error: 'FREE_CAP_REACHED',
            message: "You've used your free cover-letter previews. Purchase CV credits to keep generating and download."
          }, { status: 402 })
        }
        consumedFreeUse = true
      }
    } catch (err) {
      console.error('Cover-letter credits check error:', err)
      return NextResponse.json({ error: 'Payment verification failed. Please check your connection or contact support.' }, { status: 503 })
    }

    const refundFree = async () => {
      if (!consumedFreeUse) return
      consumedFreeUse = false
      const { refundFreeGeneration } = await import('@/lib/freeGenerations')
      await refundFreeGeneration(ip, ownerId, true)
    }
    const refundPaid = async () => {
      if (!consumedPaidCredit) return
      consumedPaidCredit = false
      const { grantCoverLetterCredit } = await import('@/lib/credits')
      await grantCoverLetterCredit(ownerId, 1)
      console.log(`[CoverLetter] Refunded 1 cover-letter credit to ${ownerId} after failure`)
    }
    refundOnFailure = async () => { await refundFree(); await refundPaid() }

    // ── Write the letter from the existing CV ──
    // No role field on this path: with an advert the writer reads the role
    // from it; without one the letter is a general application.
    const formData: CVFormData = {
      cvType: 'cover_letter',
      fullName: cv.fullName || '', email: cv.email || '', phone: cv.phone || '',
      location: cv.location || '', jobTitle: '',
      rawContent: serializeCV(cv),
      jobDescription: jobDescription || undefined,
      company: company || undefined,
    }

    let coverLetter: GeneratedCV
    try {
      ({ doc: coverLetter } = await writeDocument(formData))
    } catch (err) {
      console.error('Writer error (cover letter):', err)
      await refundOnFailure()
      if (err instanceof Anthropic.APIError && [429, 503, 529].includes(err.status ?? 0)) {
        return NextResponse.json({ error: 'AI service is busy. Please wait 30 seconds and try again.' }, { status: 503 })
      }
      if (err instanceof WriterError && err.kind === 'truncated') {
        return NextResponse.json({ error: 'The letter could not be finished. Your credit or preview has been returned — please try again.' }, { status: 500 })
      }
      return NextResponse.json({ error: 'Generation failed. Your credit or preview has been returned — please try again.' }, { status: 500 })
    }

    if (!coverLetter.coverLetterBody?.trim()) {
      await refundOnFailure()
      return NextResponse.json({ error: 'Cover letter came back empty. Please try again.' }, { status: 500 })
    }

    // Preserve the person's real identity/contact from the CV.
    coverLetter.fullName = cv.fullName
    coverLetter.email = cv.email
    coverLetter.phone = cv.phone
    coverLetter.location = cv.location
    coverLetter.linkedin = cv.linkedin

    // No credit deduction here — a cover-letter credit is only spent at
    // download time, same as CVs.

    // Save to history (best-effort, never blocks delivery). Two reasons this
    // matters beyond convenience: the letter shows up in "My CVs" like any
    // other document, and — because the download paywall charges per saved
    // document — the returned id is what stops the PDF and the Word file
    // costing two separate cover-letter credits.
    //
    // raw_input is the builder-shaped seed for a FRESH letter from the same
    // background, so "Rewrite for another job" behaves sensibly: the source
    // CV goes back in as pasted content, and the old job targeting is
    // deliberately left out rather than re-aimed at the role they're leaving.
    const { insertCvHistory } = await import('@/lib/cvHistory')
    const historyId = await insertCvHistory({
      ownerId,
      generatedCv: coverLetter,
      templateId: 'classic',
      rawInput: {
        cvType: 'cover_letter',
        inputMethod: 'paste',
        email: contactEmail,
        pasteContent: serializeCV(cv),
        landingScreen: 'type',
      },
    })

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

    return NextResponse.json({ success: true, coverLetter, historyId, paid: consumedPaidCredit })
  } catch (error: any) {
    console.error('Unhandled cover-letter error:', error)
    if (refundOnFailure) await refundOnFailure()
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
