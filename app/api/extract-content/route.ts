export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const mimeType = file.type
    const fileName = file.name.toLowerCase()

    let extractedText = ''

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const data = await pdfParse(buffer)
      extractedText = data.text || ''

      if (extractedText.trim().length < 50) {
        extractedText = await extractWithClaude(buffer, 'application/pdf')
      }
    }

    else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value || ''
    }

    else if (
      mimeType.startsWith('image/') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.webp')
    ) {
      const imageType = mimeType.startsWith('image/') ? mimeType : 'image/jpeg'
      extractedText = await extractWithClaude(buffer, imageType as any)
    }

    else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, Word document, or image.' },
        { status: 400 }
      )
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Could not extract text from this file. Please paste the content manually.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      text: extractedText.trim()
    })

  } catch (error) {
    console.error('Extract content error:', error)

    return NextResponse.json(
      { error: 'Failed to process file. Please try again or paste your content manually.' },
      { status: 500 }
    )
  }
}

async function extractWithClaude(
  buffer: Buffer,
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
): Promise<string> {
  const base64 = buffer.toString('base64')
  const isImage = mediaType.startsWith('image/')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
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
            text: 'Extract all text from this document or image exactly as it appears. Do not summarise. Return only the raw text.'
          }
        ]
      }
    ]
  })

  return message.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('')
}
