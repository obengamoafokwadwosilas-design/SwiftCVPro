import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Body = {
  html?: string
  fullName?: string
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
    const { html, fullName }: Body = await req.json()

    if (!html) {
      return NextResponse.json({ error: 'No CV HTML received.' }, { status: 400 })
    }

    const apiKey = process.env.API2PDF_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API2PDF_API_KEY is missing. Add it to your Vercel environment variables.' },
        { status: 500 }
      )
    }

    const fileName = `${safeFileName(fullName || 'SwiftCVPro')}_CV.pdf`

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
          delay: 1200,
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
