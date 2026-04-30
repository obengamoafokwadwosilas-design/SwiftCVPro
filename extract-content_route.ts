export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Server not configured. Please contact support.' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Size check (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Please upload a file under 10MB.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const fileName = file.name.toLowerCase()
    const mimeType = file.type

    let extractedText = ''

    // ── PDF — Claude reads it natively ───────────
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        extractedText = await extractFromDocument(base64, 'application/pdf')
      } catch (err: any) {
        console.error('PDF extraction failed:', err)
        return NextResponse.json({
          error: 'Could not read this PDF. It may be encrypted or in an unusual format. Please try pasting your CV content as text instead.'
        }, { status: 422 })
      }
    }

    // ── IMAGE — Claude Vision ─────────────────────
    else if (
      mimeType.startsWith('image/') ||
      fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') || fileName.endsWith('.webp')
    ) {
      const cleanType = mimeType.startsWith('image/') ? mimeType : 'image/jpeg'
      try {
        extractedText = await extractFromImage(base64, cleanType)
      } catch (err: any) {
        console.error('Image extraction failed:', err)
        return NextResponse.json({
          error: 'Could not read this image. Please ensure the text is clear or paste your CV content as text instead.'
        }, { status: 422 })
      }
    }

    // ── DOCX — also goes through Claude as document ─
    else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx') || fileName.endsWith('.doc')
    ) {
      // Note: Claude can't directly read .docx, so we ask the user to convert
      // OR we could keep mammoth ONLY for this specific case
      return NextResponse.json({
        error: 'Word documents are not supported in beta. Please save as PDF or paste your CV text directly.'
      }, { status: 422 })
    }

    else {
      return NextResponse.json({
        error: 'Unsupported file type. Please upload a PDF or image (JPG, PNG, screenshot).'
      }, { status: 400 })
    }

    if (!extractedText || extractedText.trim().length < 20) {
      return NextResponse.json({
        error: 'Could not extract enough text from this file. Please try pasting your content manually.'
      }, { status: 422 })
    }

    return NextResponse.json({ success: true, text: extractedText.trim() })

  } catch (error: any) {
    console.error('Extract content error:', error)
    return NextResponse.json({
      error: 'Failed to process file. Please try pasting your CV content as text instead.'
    }, { status: 500 })
  }
}

async function extractFromDocument(base64: string, mediaType: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64
          }
        } as any,
        {
          type: 'text',
          text: 'Extract ALL text from this document exactly as it appears. Include every word, date, name, company, qualification, skill, contact detail, and section. Output the complete raw text content only — do not summarise, organise, or rewrite anything. Preserve the original order and structure.'
        }
      ]
    }]
  })

  return message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
}

async function extractFromImage(base64: string, mediaType: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64
          }
        } as any,
        {
          type: 'text',
          text: 'Extract ALL text visible in this image exactly as it appears. Include every word, date, name, company, qualification, skill, contact detail, and section. Output the complete raw text content only — do not summarise. Preserve the original order.'
        }
      ]
    }]
  })

  return message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
}
