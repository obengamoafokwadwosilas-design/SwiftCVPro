import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  html?: string
  fullName?: string
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

    const pdfServiceUrl = process.env.PDF_SERVICE_URL

    if (!pdfServiceUrl) {
      return NextResponse.json(
        { error: 'PDF_SERVICE_URL is missing. Add your Railway PDF service URL to Vercel environment variables.' },
        { status: 500 }
      )
    }

    const response = await fetch(`${pdfServiceUrl.replace(/\/$/, '')}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, fullName }),
    })

    if (!response.ok) {
      const message = await response.text().catch(() => '')
      return NextResponse.json(
        { error: 'Railway PDF service failed.', detail: message },
        { status: 502 }
      )
    }

    const pdfBuffer = await response.arrayBuffer()
    const fileName = `${safeFileName(fullName || 'SwiftCVPro')}_CV.pdf`

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
