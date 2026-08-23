export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { normalizePhone } from '@/lib/credits'
import { buildGenerationPrompt, CV_SYSTEM_PROMPT } from '@/lib/prompts'
import { CVFormData, GeneratedCV } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

// Turn a finished CV into plain text the cover-letter prompt can build from.
function serializeCV(cv: GeneratedCV): string {
  const lines: string[] = []
  if (cv.fullName) lines.push(`Name: ${cv.fullName}`)
  if (cv.jobTitle) lines.push(`Current/target title: ${cv.jobTitle}`)
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(' · ')
  if (contact) lines.push(`Contact: ${contact}`)
  if (cv.summary) lines.push(`\nPROFILE:\n${cv.summary}`)

  if (cv.experience?.length) {
    lines.push('\nEXPERIENCE:')
    cv.experience.forEach(e => {
      lines.push(`- ${e.role || ''}${e.company ? `, ${e.company}` : ''}${e.startDate || e.endDate ? ` (${e.startDate || ''} – ${e.endDate || ''})` : ''}`)
      ;(e.bullets || []).forEach(b => lines.push(`  • ${b}`))
    })
  }
  if (cv.education?.length) {
    lines.push('\nEDUCATION:')
    cv.education.forEach(e => lines.push(`- ${e.qualification || ''}${e.field ? ` in ${e.field}` : ''}${e.institution ? `, ${e.institution}` : ''}${e.endYear ? ` (${e.startYear || ''}–${e.endYear})` : ''}`))
  }
  if (cv.skills?.length) lines.push(`\nSKILLS: ${cv.skills.join(', ')}`)
  if (cv.languages?.length) lines.push(`LANGUAGES: ${cv.languages.join(', ')}`)
  const extras = (cv as any).extraSections as { heading: string; items: string[] }[] | undefined
  if (extras?.length) {
    extras.forEach(sec => { if (sec?.items?.length) lines.push(`\n${sec.heading.toUpperCase()}: ${sec.items.join('; ')}`) })
  } else if (cv.additionalInfo) {
    lines.push(`\nADDITIONAL: ${cv.additionalInfo}`)
  }
  if ((cv as any).attributes?.length) lines.push(`\nATTRIBUTES: ${((cv as any).attributes as string[]).join('; ')}`)
  return lines.join('\n')
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
    const { cv, jobDescription, company, phoneNumber, email } = body as {
      cv: GeneratedCV; jobDescription?: string; company?: string; phoneNumber: string; email: string
    }

    if (!phoneNumber) return NextResponse.json({ error: 'Please enter your phone number.' }, { status: 400 })
    if (!cv || !cv.fullName) return NextResponse.json({ error: 'No CV found to build a cover letter from.' }, { status: 400 })
    // The CV's own email is a valid fallback identity for the free-generation
    // cap — a CV reopened from history carries one even when the caller has
    // no separately-collected email to send (see the preview page's loader).
    const identityEmail = email || cv.email
    if (!identityEmail) return NextResponse.json({ error: 'Please enter your email address.' }, { status: 400 })

    const phone = normalizePhone(phoneNumber)

    const rateCheck = checkRateLimit(phone)
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
      const paid = await hasCoverLetterCredit(phone)
      if (paid) {
        const ok = await deductCoverLetterCredit(phone)
        if (!ok) {
          return NextResponse.json({ error: 'NO_CREDITS', message: 'You need a cover-letter credit to generate. Please buy a package first.' }, { status: 402 })
        }
        consumedPaidCredit = true
      } else {
        const { consumeFreeGeneration } = await import('@/lib/freeGenerations')
        const { allowed } = await consumeFreeGeneration(phone, identityEmail, true)
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
      await refundFreeGeneration(phone, identityEmail, true)
    }
    const refundPaid = async () => {
      if (!consumedPaidCredit) return
      consumedPaidCredit = false
      const { grantCoverLetterCredit } = await import('@/lib/credits')
      await grantCoverLetterCredit(phone, 1)
      console.log(`[CoverLetter] Refunded 1 cover-letter credit to ${phone} after failure`)
    }
    refundOnFailure = async () => { await refundFree(); await refundPaid() }

    // ── Build the cover-letter prompt from the existing CV ──
    const formData: CVFormData = {
      cvType: 'cover_letter',
      fullName: cv.fullName || '', email: cv.email || '', phone: cv.phone || '',
      location: cv.location || '', jobTitle: cv.jobTitle || '',
      rawContent: serializeCV(cv),
      jobDescription: jobDescription || undefined,
      company: company || undefined,
    }
    const prompt = buildGenerationPrompt(formData)

    let message
    try {
      message = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 4000,
        system: CV_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })
    } catch (err: any) {
      console.error('Anthropic API error (cover letter):', err)
      await refundFree()
      if (err?.status === 529 || err?.status === 503) {
        return NextResponse.json({ error: 'AI service is busy. Please wait 30 seconds and try again.' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    const rawText = message.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    let coverLetter: GeneratedCV
    try {
      coverLetter = JSON.parse(cleaned)
    } catch {
      console.error('Cover-letter JSON parse failed. First 500 chars:', rawText.substring(0, 500))
      await refundFree()
      return NextResponse.json({ error: 'Cover letter processing failed. Please try again.' }, { status: 500 })
    }

    if (!coverLetter.coverLetterBody) {
      await refundFree()
      return NextResponse.json({ error: 'Cover letter came back empty. Please try again.' }, { status: 500 })
    }

    // Preserve the person's real identity/contact from the CV.
    coverLetter.fullName = cv.fullName
    coverLetter.email = cv.email
    coverLetter.phone = cv.phone
    coverLetter.location = cv.location
    coverLetter.linkedin = cv.linkedin

    // Formal Ghanaian frame — company from the target role if given; no
    // addressee/address is collected on this path, so sensible defaults apply.
    const { buildCoverLetterFrame, defaultSubject } = await import('@/lib/coverLetter')
    const frame = buildCoverLetterFrame({ company })
    coverLetter.clRecipient = frame.clRecipient
    coverLetter.clSalutation = frame.clSalutation
    coverLetter.clSignOff = frame.clSignOff
    coverLetter.clSubject = (coverLetter.clSubject?.trim() || defaultSubject(coverLetter.jobTitle)).toUpperCase()

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
      phone,
      generatedCv: coverLetter,
      templateId: 'classic',
      rawInput: {
        cvType: 'cover_letter',
        inputMethod: 'paste',
        phoneNumber: phone,
        pasteContent: serializeCV(cv),
        landingScreen: 'type',
      },
    })

    if (consumedPaidCredit && historyId) {
      try {
        const { markDownloadPaid } = await import('@/lib/credits')
        await markDownloadPaid(phone, historyId)
      } catch (err) {
        console.error('[CoverLetter] markDownloadPaid failed (non-fatal):', err)
      }
    }

    return NextResponse.json({ success: true, coverLetter, historyId })
  } catch (error: any) {
    console.error('Unhandled cover-letter error:', error)
    if (refundOnFailure) await refundOnFailure()
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
