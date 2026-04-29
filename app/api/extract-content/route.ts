export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const mimeType = file.type
    const fileName = file.name.toLowerCase()

    let extractedText = ''

    // ── PDF ──────────────────────────────────────
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse') as any).default || (await import('pdf-parse'))
      const data = await pdfParse(buffer)
      extractedText = data.text

      if (!extractedText || extractedText.trim().length < 50) {
        // Scanned PDF — fall back to Claude Vision
        extractedText = await extractWithClaude(buffer, 'application/pdf')
      }
    }

    // ── DOCX ─────────────────────────────────────
    else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx') || fileName.endsWith('.doc')
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    }

    // ── IMAGE (JPG, PNG, WEBP, screenshot) ───────
    else if (
      mimeType.startsWith('image/') ||
      fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') || fileName.endsWith('.webp')
    ) {
      const imageType = mimeType.startsWith('image/') ? mimeType : 'image/jpeg'
      extractedText = await extractWithClaude(buffer, imageType as any)
    }

    else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF, Word document, or image.' }, { status: 400 })
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return NextResponse.json({ error: 'Could not extract text from this file. Please try pasting the content manually.' }, { status: 422 })
    }

    return NextResponse.json({ success: true, text: extractedText.trim() })

  } catch (error) {
    console.error('Extract content error:', error)
    return NextResponse.json({ error: 'Failed to process file. Please try again or paste your content manually.' }, { status: 500 })
  }
}

async function extractWithClaude(buffer: Buffer, mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'): Promise<string> {
  const base64 = buffer.toString('base64')

  const isImage = mediaType.startsWith('image/')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        {
          type: isImage ? 'image' : 'document',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64
          }
        } as any,
        {
          type: 'text',
          text: 'Extract ALL text from this document or image exactly as it appears. Include every word, date, name, company, qualification, and detail. Do not summarise — give me the raw text content only. If it is a CV, include everything. If it is a job posting, include the full job description.'
        }
      ]
    }]
  })

  return message.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('')
}
