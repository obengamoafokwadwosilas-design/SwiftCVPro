import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Generous for a real user (re-downloads, trying templates) but caps scripted
// abuse of our paid API2PDF account.
const EXPORT_MAX = 40
const EXPORT_WINDOW_MS = 10 * 60 * 1000
const MAX_HTML_BYTES = 600_000  // a real CV/letter is well under this

type Body = {
  html?: string
  fullName?: string
  phoneNumber?: string
  isCoverLetter?: boolean
  historyId?: number
}

type Api2PdfResponse = {
  FileUrl?: string
  fileUrl?: string
  Error?: string
  error?: string
  Message?: string
  message?: string
}

function safeFileName(name: string) {
  return (name || 'SwiftCVPro_CV')
    .replace(/[^a-z0-9_\-\s]/gi, '')
    .trim()
    .replace(/\s+/g, '_') || 'SwiftCVPro_CV'
}

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`export-pdf:${clientIp(req)}`, EXPORT_MAX, EXPORT_WINDOW_MS)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many downloads in a short time. Please wait a moment and try again.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })
    }

    const { html, fullName, phoneNumber, isCoverLetter, historyId }: Body = await req.json()

    if (!html) {
      return NextResponse.json({ error: 'No CV HTML received.' }, { status: 400 })
    }
    // Only render our own documents — not an arbitrary HTML→PDF service. Our
    // output always wraps the document in #cv-print-area.
    if (html.length > MAX_HTML_BYTES || !html.includes('cv-print-area')) {
      return NextResponse.json({ error: 'Invalid document.' }, { status: 400 })
    }
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Please enter your phone number.' }, { status: 400 })
    }

    // ── The real paywall lives here, not at generation ──────────────
    // Generation is free (app/api/generate); downloading the actual usable
    // file is what spends a credit. Unlike export-docx (which gets a
    // structured cv object it can inspect for coverLetterBody), this route
    // only ever sees raw HTML, so the caller has to say what kind of
    // document it is.
    //
    // A document already paid for downloads free in every format, forever
    // (isDownloadPaid) — the credit buys the CV, not the button press.
    const { normalizePhone } = await import('@/lib/phone')
    const { hasCredits, hasCoverLetterCredit, deductCredit, deductCoverLetterCredit, isDownloadPaid, markDownloadPaid } = await import('@/lib/credits')
    const phone = normalizePhone(phoneNumber)
    const alreadyPaid = historyId ? await isDownloadPaid(phone, historyId) : false
    if (!alreadyPaid) {
      const paid = isCoverLetter ? await hasCoverLetterCredit(phone) : await hasCredits(phone)
      if (!paid) {
        return NextResponse.json({ error: 'NO_CREDITS', message: 'You need a credit to download this. Please buy a package first.' }, { status: 402 })
      }
    }

    const apiKey = process.env.API2PDF_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API2PDF_API_KEY is missing. Add it to your Vercel environment variables.' },
        { status: 500 }
      )
    }

    const fileName = `${safeFileName(fullName || 'SwiftCVPro')}_CV.pdf`
    const rendererOwnedTwoColumn = html.includes('data-renderer-page')

    const apiResponse = await fetch('https://v2.api2pdf.com/chrome/pdf/html', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html,
        fileName,
        options: {
          printBackground: true,
          preferCSSPageSize: true,
          // Meridian and Sterling compose their fixed pages in the renderer's
          // own Chrome after its fonts load, so give that one path time to settle.
          delay: rendererOwnedTwoColumn ? 3000 : 1200,
          margin: {
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px',
          },
        },
      }),
    })

    const raw = await apiResponse.text()

    if (!apiResponse.ok) {
      return NextResponse.json(
        { error: 'API2PDF failed to generate the PDF.', detail: raw },
        { status: 502 }
      )
    }

    let result: Api2PdfResponse
    try {
      result = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: 'API2PDF returned an invalid response.', detail: raw },
        { status: 502 }
      )
    }

    const pdfUrl = result.FileUrl || result.fileUrl

    if (!pdfUrl) {
      return NextResponse.json(
        { error: result.Error || result.error || result.Message || result.message || 'API2PDF did not return a PDF URL.', detail: result },
        { status: 502 }
      )
    }

    const pdfResponse = await fetch(pdfUrl)

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: 'PDF was generated but could not be downloaded from API2PDF.' },
        { status: 502 }
      )
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Only deduct once the file is actually in hand — not merely once
    // Api2Pdf accepted the render job (it can still fail after that, or the
    // final download-from-Api2Pdf leg above can fail). A user must never be
    // charged for a PDF they didn't actually receive.
    if (!alreadyPaid) {
      if (isCoverLetter) await deductCoverLetterCredit(phone)
      else await deductCredit(phone)
      if (historyId) await markDownloadPaid(phone, historyId)
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json({ error: 'PDF export failed.' }, { status: 500 })
  }
}
