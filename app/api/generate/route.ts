export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { hasCredits, deductCredit, normalizePhone } from '@/lib/credits'
import { buildGenerationPrompt, CV_SYSTEM_PROMPT } from '@/lib/prompts'
import { CVFormData, GeneratedCV } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 15 * 60 * 1000

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
    const { cvType, rawContent, jobDescription, phoneNumber } = body
    const formData = body.formData

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Please enter your phone number.' }, { status: 400 })
    }

    if (!rawContent && !formData) {
      return NextResponse.json({ error: 'Please provide your CV details before generating.' }, { status: 400 })
    }

    const phone = normalizePhone(phoneNumber)

    // ── Rate limit ────────────────────────────────
    const rateCheck = checkRateLimit(phone)
    if (!rateCheck.allowed) {
      const mins = Math.ceil(rateCheck.resetIn / 60000)
      return NextResponse.json({ error: `Too many attempts. Please wait ${mins} minutes and try again.` }, { status: 429 })
    }

    // ── Credits check ─────────────────────────────
    let creditAvailable = false
    try {
      creditAvailable = await hasCredits(phone)
    } catch (err) {
      console.error('Credits check error:', err)
      // If Supabase is misconfigured, fail with a helpful message
      return NextResponse.json({
        error: 'Payment verification failed. Please check your internet connection and try again, or contact support on WhatsApp.'
      }, { status: 503 })
    }

    if (!creditAvailable) {
      return NextResponse.json({
        error: 'NO_CREDITS',
        message: 'No credits found for this number. Please complete payment first.'
      }, { status: 402 })
    }

    // ── Build prompt ──────────────────────────────
    let prompt: string
    if (formData) {
      prompt = buildGenerationPrompt(formData)
    } else {
      const cvFormData: CVFormData = {
        cvType: cvType || 'professional',
        fullName: '', email: '', phone: '', location: '', jobTitle: '',
        rawContent,
        jobDescription
      }
      prompt = buildGenerationPrompt(cvFormData)
    }

    // ── Call Claude ───────────────────────────────
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
        return NextResponse.json({ error: 'API authentication failed. Please contact support.' }, { status: 500 })
      }
      if (err?.status === 529 || err?.status === 503) {
        return NextResponse.json({ error: 'AI service is busy. Please wait 30 seconds and try again.' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Generation failed. Please try again in a moment.' }, { status: 500 })
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
      return NextResponse.json({ error: 'CV processing failed. Please try again — this is rare.' }, { status: 500 })
    }

    // ── Deduct credit after success ───────────────
    try {
      await deductCredit(phone)
    } catch (err) {
      console.error('Credit deduction error (non-fatal):', err)
      // Don't fail the request — CV was generated successfully
    }

    return NextResponse.json({ success: true, cv: generatedCV })

  } catch (error: any) {
    console.error('Unhandled generate error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again or contact support.' }, { status: 500 })
  }
}
