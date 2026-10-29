export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import Anthropic from '@anthropic-ai/sdk'
import { extractWithClaude, CLAUDE_IMAGE_TYPES, type ClaudeImageType } from '@/lib/fileText'
import { takeFromBucket } from '@/lib/dbRateLimit'
import { clientIp } from '@/lib/rateLimit'
import { alertOwner } from '@/lib/alerts'

// Generous for a real person (a few photos while getting a CV right) and low
// enough that scripting the reader cannot run up the AI bill.
const AI_READS_PER_HOUR = 15
class TooManyScans extends Error {}


// The vision API accepts four image formats and caps each image at 10MB once
// base64-encoded. Base64 inflates by ~4/3, so the raw file has to stay under
// ~7.5MB; 7MB leaves headroom for the rest of the request body.
const MAX_IMAGE_BYTES = 7 * 1024 * 1024

const EXT_TO_IMAGE_TYPE: Record<string, ClaudeImageType> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
}

function asMegabytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + 'MB'
}

export async function POST(req: NextRequest) {
  try {
    // req.formData() THROWS on a body that isn't multipart/form-data (a JSON
    // post, an empty body, a truncated upload). Letting that reach the
    // catch-all below reported a malformed request as a 500 "Failed to process
    // file" — a server fault for what is squarely a bad request, which is both
    // wrong for the caller and noise when reading logs for real failures.
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json(
        { error: 'Invalid upload. Please attach the file again.' },
        { status: 400 }
      )
    }

    const entry = formData.get('file')

    if (!entry) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    // A form field named "file" that carries a plain string rather than a file
    // has no arrayBuffer(), so the old `as File` cast turned it into a 500 the
    // moment it was read. Check the shape instead of asserting it.
    if (typeof entry === 'string' || typeof (entry as File).arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: 'That was not a file. Please attach a PDF, Word document, or image.' },
        { status: 400 }
      )
    }
    const file = entry as File

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const mimeType = file.type
    const fileName = file.name.toLowerCase()

    let extractedText = ''

    // Reading a photo or a scanned PDF is an AI call (a few US cents each), so
    // it is capped per network address across all server instances. Ordinary
    // PDFs and Word files are read locally and never count.
    const readWithAi = async (type: Parameters<typeof extractWithClaude>[1]) => {
      if (!await takeFromBucket('ai-read:' + clientIp(req), AI_READS_PER_HOUR, 3600)) throw new TooManyScans()
      return extractWithClaude(buffer, type)
    }

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const data = await pdfParse(buffer)
      extractedText = data.text || ''

      if (extractedText.trim().length < 50) {
        extractedText = await readWithAi('application/pdf')
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

    else if (mimeType.startsWith('image/') || /\.(jpe?g|png|gif|webp|hei[cf])$/.test(fileName)) {
      // Trust the extension over the browser-reported type: some mobile
      // browsers send an empty or generic mimeType for camera photos.
      const ext = fileName.slice(fileName.lastIndexOf('.'))
      const imageType: ClaudeImageType | null = EXT_TO_IMAGE_TYPE[ext]
        ?? (CLAUDE_IMAGE_TYPES.includes(mimeType as ClaudeImageType) ? (mimeType as ClaudeImageType) : null)

      if (!imageType) {
        return NextResponse.json(
          {
            error: /\.hei[cf]$/.test(fileName)
              ? 'iPhone photos saved as HEIC can\'t be read. In Settings › Camera › Formats choose "Most Compatible", or send a screenshot of the photo instead.'
              : 'That image format is not supported. Please use a JPG, PNG or WEBP.',
          },
          { status: 400 }
        )
      }

      if (buffer.length > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          {
            error: `This photo is ${asMegabytes(buffer.length)} — too large to read (the limit is ${asMegabytes(MAX_IMAGE_BYTES)}). Send a screenshot of it, or a smaller photo.`,
          },
          { status: 413 }
        )
      }

      extractedText = await readWithAi(imageType)
    }

    // The upload screen's own hint text has always advertised "Text (.txt)"
    // as a supported format, but nothing here ever actually handled it —
    // any .txt fell straight through to the "unsupported" error below. A
    // plain text file needs no parsing at all, just decoding as UTF-8.
    else if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8')
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
    if (error instanceof TooManyScans) {
      return NextResponse.json(
        { error: 'You have sent a lot of photos and scans in a short time. Please wait about an hour, or paste your CV text instead.' },
        { status: 429 }
      )
    }
    if (error instanceof Anthropic.APIError) await alertOwner('Reading photos and scanned CVs failing', `HTTP ${error.status}: ${error.message}`)
    else console.error('Extract content error:', error)

    return NextResponse.json(
      { error: 'Failed to process file. Please try again or paste your content manually.' },
      { status: 500 }
    )
  }
}
