export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { GeneratedCV, TemplateId } from '@/types'

type ExportPdfBody = {
  cv?: GeneratedCV
  templateId?: TemplateId
  html?: string
  filename?: string
}

const PRINT_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Sans+3:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap'

function safeFileName(name?: string) {
  const cleaned = (name || 'CV.pdf')
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '_')
    .trim()
  return cleaned.endsWith('.pdf') ? cleaned : `${cleaned || 'CV'}.pdf`
}

function escapeHtml(value?: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fallbackHtml(cv?: GeneratedCV) {
  if (!cv) return '<div class="a4-page"><h1>CV</h1></div>'

  return `
    <div class="a4-page fallback-cv">
      <h1>${escapeHtml(cv.fullName)}</h1>
      ${cv.jobTitle ? `<h2>${escapeHtml(cv.jobTitle)}</h2>` : ''}
      <p class="contact">${[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).map(escapeHtml).join(' • ')}</p>
      ${cv.summary ? `<section><h3>Professional Summary</h3><p>${escapeHtml(cv.summary)}</p></section>` : ''}
      ${cv.experience?.length ? `<section><h3>Professional Experience</h3>${cv.experience.map(e => `
        <div class="item">
          <div class="row"><strong>${escapeHtml(e.role)}</strong><span>${escapeHtml(e.startDate)} – ${escapeHtml(e.endDate)}</span></div>
          <em>${escapeHtml(e.company)}</em>
          <ul>${(e.bullets || []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
        </div>`).join('')}</section>` : ''}
      ${cv.education?.length ? `<section><h3>Education</h3>${cv.education.map(ed => `
        <div class="item">
          <div class="row"><strong>${escapeHtml(ed.qualification)}${ed.field ? ` in ${escapeHtml(ed.field)}` : ''}</strong><span>${escapeHtml(ed.startYear)} – ${escapeHtml(ed.endYear)}</span></div>
          <em>${escapeHtml(ed.institution)}</em>
        </div>`).join('')}</section>` : ''}
      ${cv.skills?.length ? `<section><h3>Core Skills</h3><p>${cv.skills.map(escapeHtml).join(' • ')}</p></section>` : ''}
      ${cv.languages?.length ? `<section><h3>Languages</h3><p>${cv.languages.map(escapeHtml).join(' • ')}</p></section>` : ''}
      ${cv.additionalInfo ? `<section><h3>Additional Information</h3><p>${escapeHtml(cv.additionalInfo)}</p></section>` : ''}
    </div>`
}

function buildPrintDocument(innerHtml: string, title: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${PRINT_FONTS_HREF}" rel="stylesheet" />
  <style>
    @page { size: A4 portrait; margin: 0; }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      min-height: 297mm !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    #pdf-root {
      width: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }

    #cv-print-area {
      width: 210mm !important;
      max-width: 210mm !important;
      margin: 0 !important;
      box-shadow: none !important;
      transform: none !important;
    }

    .a4-page {
      width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 !important;
      background: #ffffff;
      page-break-after: always;
      break-after: page;
    }

    .a4-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .fallback-cv {
      padding: 18mm;
      font-family: Arial, sans-serif;
      color: #111827;
      font-size: 10.5pt;
      line-height: 1.55;
    }

    .fallback-cv h1 { font-size: 28pt; margin: 0 0 4mm; }
    .fallback-cv h2 { font-size: 13pt; margin: 0 0 5mm; font-weight: 500; }
    .fallback-cv h3 { font-size: 11pt; margin: 7mm 0 3mm; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #d1d5db; padding-bottom: 1.5mm; }
    .fallback-cv .contact { color: #4b5563; margin-bottom: 7mm; }
    .fallback-cv .item { margin-bottom: 5mm; }
    .fallback-cv .row { display: flex; justify-content: space-between; gap: 8mm; }
    .fallback-cv ul { margin: 2mm 0 0 5mm; padding: 0; }
    .fallback-cv li { margin-bottom: 1.5mm; }
  </style>
</head>
<body>
  <div id="pdf-root">${innerHtml}</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

  try {
    const body = (await req.json()) as ExportPdfBody
    const filename = safeFileName(body.filename || `${body.cv?.fullName || 'CV'}_CV.pdf`)
    const innerHtml = body.html || fallbackHtml(body.cv)
    const html = buildPrintDocument(innerHtml, filename.replace(/\.pdf$/i, ''))

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.emulateMediaType('print')
    await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] })

    try {
      await page.evaluateHandle('document.fonts.ready')
    } catch {}

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      scale: 1,
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  } finally {
    if (browser) await browser.close()
  }
}
