export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { normalizePhone } from '@/lib/credits'
import { buildGenerationPrompt, buildBulletTrimPrompt, CV_SYSTEM_PROMPT } from '@/lib/prompts'
import { CVFormData, GeneratedCV } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'
import type { BuildSeed } from '@/lib/buildSeed'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Pagination-risk pass ──────────────────────────────────────
// This app has no reliable way to know real page-break positions
// server-side (running headless Chrome in this Vercel function was
// already tried for PDF export and abandoned twice in favour of an
// external renderer — see git history on app/api/export-pdf/route.ts).
// So instead of detecting real page breaks, this deterministically
// flags the *shape* of content most likely to strand as a page
// orphan or widow: the last bullet/item in a role or list running
// much longer than its siblings. Best-effort only — never blocks
// or fails CV delivery.
type RiskyItem = { id: string; text: string; context: string; maxWords: number; set: (text: string) => void }

function wordCount(s: string): number {
  return (s || '').trim().split(/\s+/).filter(Boolean).length
}

function flagTrailingOutlier(
  list: string[] | undefined,
  idPrefix: string,
  context: string,
  hardCap: number,
  targetMaxWords: number,
  set: (index: number, text: string) => void,
  out: RiskyItem[]
) {
  if (!list || !list.length) return
  const lastIdx = list.length - 1
  const counts = list.map(wordCount)
  const last = counts[lastIdx]
  const others = counts.slice(0, lastIdx)
  const avgOthers = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0
  const isTrailingOutlier = others.length >= 1 && last > avgOthers * 1.4 && last > targetMaxWords
  const isHardOverCap = last > hardCap
  if (isTrailingOutlier || isHardOverCap) {
    out.push({
      id: `${idPrefix}-${lastIdx}`,
      text: list[lastIdx],
      context,
      maxWords: targetMaxWords,
      set: (text: string) => set(lastIdx, text),
    })
  }
}

function findPaginationRiskyItems(cv: GeneratedCV): RiskyItem[] {
  const items: RiskyItem[] = []

  cv.experience?.forEach((e, i) => {
    flagTrailingOutlier(e.bullets, `exp${i}`, `${e.role} at ${e.company}`, 26, 18, (idx, text) => { e.bullets[idx] = text }, items)
  })
  if (cv.attributes?.length) {
    flagTrailingOutlier(cv.attributes, 'attr', 'Professional attribute', 18, 15, (idx, text) => { cv.attributes![idx] = text }, items)
  }
  flagTrailingOutlier(cv.publications, 'pub', 'Publication citation', 34, 24, (idx, text) => { cv.publications![idx] = text }, items)
  flagTrailingOutlier(cv.research, 'res', 'Research item', 34, 24, (idx, text) => { cv.research![idx] = text }, items)
  flagTrailingOutlier(cv.teaching, 'teach', 'Teaching item', 34, 24, (idx, text) => { cv.teaching![idx] = text }, items)
  ;((cv as any).extraSections as { heading: string; items: string[] }[] | undefined)?.forEach((sec, i) => {
    if (!sec?.items?.length) return
    flagTrailingOutlier(sec.items, `extra${i}`, sec.heading || 'Additional item', 34, 24, (idx, text) => { sec.items[idx] = text }, items)
  })

  // Cap so the extra call stays small, fast, and genuinely surgical.
  return items.slice(0, 4)
}

async function runPaginationRiskPass(cv: GeneratedCV): Promise<void> {
  const risky = findPaginationRiskyItems(cv)
  if (!risky.length) return

  const prompt = buildBulletTrimPrompt(risky.map(r => ({ id: r.id, text: r.text, context: r.context, maxWords: r.maxWords })))
  const call = anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 800,
    system: 'You are a precise copy editor. Follow instructions exactly and return only valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  })
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('pagination-risk pass timed out')), 12000))

  const message: any = await Promise.race([call, timeout])
  const rawText = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const trimmed = JSON.parse(cleaned)

  risky.forEach(r => {
    const replacement = trimmed[r.id]
    if (typeof replacement === 'string' && replacement.trim()) r.set(replacement.trim())
  })
  console.log(`[Generate] Pagination-risk pass tightened ${risky.length} item(s)`)
}

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
  phone: string,
  cvType: string,
  formData: CVFormData | undefined,
  rawContent: string | undefined,
  jobDescription: string | undefined,
  generatedCV: GeneratedCV
): Promise<number | null> {
  try {
    const rawInput: BuildSeed = formData
      ? {
          cvType: (formData.cvType || cvType || 'professional') as BuildSeed['cvType'],
          inputMethod: 'form',
          phoneNumber: phone,
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
          phoneNumber: phone,
          pasteContent: rawContent,
          jobDescription,
          landingScreen: 'type',
        }

    const { data, error } = await supabaseAdmin
      .from('cv_history')
      .insert({
        phone_number: phone,
        cv_type: rawInput.cvType,
        template_id: 'meridian',
        accent_color: null,
        label: null,
        generated_cv: generatedCV,
        raw_input: rawInput,
      })
      .select('id')
      .single()

    if (error) { console.error('saveToHistory insert error (non-fatal):', error); return null }
    return data?.id ?? null
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
  try {
    // ── Validate API key ──────────────────────────
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 })
    }

    const body = await req.json()
    const { cvType, rawContent, jobDescription, phoneNumber, email } = body
    const formData = body.formData

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Please enter your phone number.' }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Please enter your email address.' }, { status: 400 })
    }

    if (!rawContent && !formData) {
      return NextResponse.json({ error: 'Please provide your CV details before generating.' }, { status: 400 })
    }

    const phone = normalizePhone(phoneNumber)

    // ── Rate limit ────────────────────────────────
    const rateCheck = checkRateLimit(phone)
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
    // A paying customer (real credits > 0) is exempt from the free cap
    // entirely and forever, so buying credits then re-tailoring for many
    // jobs is never blocked by it. Everyone else gets a small number of free
    // generations (src/lib/freeGenerations.ts), enforced against BOTH phone
    // and email so cycling a cheap SIM alone doesn't reset it. Download,
    // not generation, is what actually costs a credit — see
    // app/api/export-pdf/route.ts and app/api/export-docx/route.ts.
    const isCoverLetterDoc = cvType === 'cover_letter'
    try {
      const { hasCredits, hasCoverLetterCredit } = await import('@/lib/credits')
      const paid = isCoverLetterDoc ? await hasCoverLetterCredit(phone) : await hasCredits(phone)
      if (!paid) {
        const { consumeFreeGeneration } = await import('@/lib/freeGenerations')
        const { allowed } = await consumeFreeGeneration(phone, email, isCoverLetterDoc)
        if (!allowed) {
          return NextResponse.json({
            error: 'FREE_CAP_REACHED',
            message: 'You’ve used your free previews. Buy credits to keep generating and download your CV.'
          }, { status: 402 })
        }
      }
    } catch (err) {
      console.error('Free-generation/credits check error:', err)
      return NextResponse.json({
        error: 'Payment verification failed. Please check your connection or contact support.'
      }, { status: 503 })
    }

    // ── Build prompt ──────────────────────────────
    let prompt: string
    if (formData) {
      prompt = buildGenerationPrompt(formData)
    } else {
      const cvFormData: CVFormData = {
        cvType: cvType || 'professional',
        fullName: '', email: '', phone: '', location: '',
        // Set on the paste path by "Tailor my CV for…", so a CV with no advert
        // can still be aimed at a job/industry.
        jobTitle: body.jobTitle || '',
        targetIndustry: body.targetIndustry || undefined,
        rawContent,
        jobDescription
      }
      prompt = buildGenerationPrompt(cvFormData)
    }

    // ── Call Claude ───────────────────────────────
    console.log(`[Generate] phone=${phone} cvType=${cvType}`)

    let message
    try {
      message = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 6000,
        system: CV_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })
    } catch (err: any) {
      console.error('Anthropic API error:', err)
      if (err?.status === 401) {
        return NextResponse.json({ error: 'API key error. Please contact support.' }, { status: 500 })
      }
      if (err?.status === 529 || err?.status === 503) {
        return NextResponse.json({ error: 'AI service is busy. Please wait 30 seconds and try again.' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    const rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    let generatedCV: GeneratedCV
    try {
      generatedCV = JSON.parse(cleaned)
    } catch {
      console.error('JSON parse failed. First 500 chars:', rawText.substring(0, 500))
      return NextResponse.json({ error: 'CV processing failed. Please try again.' }, { status: 500 })
    }

    // ── Cover letter: build the formal Ghanaian frame around the AI's body ──
    // Recipient block, salutation and sign-off are constructed from the inputs
    // (never invented), and a subject is guaranteed even if the model omitted it.
    if (isCoverLetterDoc) {
      const { buildCoverLetterFrame, defaultSubject } = await import('@/lib/coverLetter')
      const frame = buildCoverLetterFrame({
        addressee: formData?.addressee,
        company: formData?.company,
        companyAddress: formData?.companyAddress,
      })
      generatedCV.clRecipient = frame.clRecipient
      generatedCV.clSalutation = frame.clSalutation
      generatedCV.clSignOff = frame.clSignOff
      if (!generatedCV.clSubject?.trim()) generatedCV.clSubject = defaultSubject(generatedCV.jobTitle)
      generatedCV.clSubject = generatedCV.clSubject.toUpperCase()
    }

    // ── Pagination-risk pass (best-effort, never blocks delivery) ──
    try {
      await runPaginationRiskPass(generatedCV)
    } catch (err) {
      console.error('Pagination-risk pass failed (non-fatal):', err)
    }

    // No credit deduction here — generation is free (or covered by the free
    // cap above). A credit is only ever spent at download time, in
    // app/api/export-pdf/route.ts and app/api/export-docx/route.ts.

    // ── Save to history (best-effort, never blocks delivery) ──
    const historyId = await saveToHistory(phone, cvType, formData, rawContent, jobDescription, generatedCV)

    console.log(`[Generate] ✅ Success for ${phone}`)
    return NextResponse.json({ success: true, cv: generatedCV, historyId })

  } catch (error: any) {
    console.error('Unhandled generate error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
