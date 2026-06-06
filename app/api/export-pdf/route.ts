export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

// Same Google Fonts the preview uses, so the PDF matches the screen exactly.
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Sans+3:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap'

function wrap(innerHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link rel="stylesheet" href="${FONTS_HREF}">
  <style>
    @page { size: A4; margin: 0; }
    /* box-sizing keeps padding INSIDE the 297mm page height -> no phantom overflow page */
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    #cv-root { width: 210mm; }
    /* never split an experience/education block or a bullet across a page boundary */
    .exp-block, li { break-inside: avoid; page-break-inside: avoid; }
  </style></head>
  <body><div id="cv-root">${innerHtml}</div></body></html>`
}

export async function POST(req: NextRequest) {
  let browser: any
  try {
    const { html, fullName } = (await req.json()) as { html?: string; fullName?: string }
    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'No CV content provided' }, { status: 400 })
    }

    // Local dev can point at an installed Chrome; production uses @sparticuz/chromium.
    const localExecutable = process.env.PUPPETEER_EXECUTABLE_PATH
    browser = await puppeteer.launch(
      localExecutable
        ? { executablePath: localExecutable, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
        : {
            args: chromium.args,
            defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
            executablePath: await chromium.executablePath(),
            headless: true,
          }
    )

    const page = await browser.newPage()
    await page.setContent(wrap(html), { waitUntil: 'networkidle0' })
    // make sure web fonts are fully loaded before printing
    try { await page.evaluateHandle('document.fonts.ready') } catch {}

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    const safeName = (fullName || 'CV').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}_CV.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('PDF export error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  } finally {
    if (browser) { try { await browser.close() } catch {} }
  }
}
