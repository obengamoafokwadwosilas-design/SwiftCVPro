export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { GeneratedCV, TemplateId } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { cv, templateId } = await req.json() as { cv: GeneratedCV; templateId: TemplateId }
    if (!cv) return NextResponse.json({ error: 'No CV data' }, { status: 400 })

    const html = buildHtml(cv, templateId)

    let browser
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      })

      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0.7in', right: '0.75in', bottom: '0.7in', left: '0.75in' },
      })

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${cv.fullName.replace(/\s+/g, '_')}_CV.pdf"`,
        },
      })
    } finally {
      if (browser) await browser.close()
    }
  } catch (error: any) {
    console.error('PDF export error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function buildHtml(cv: GeneratedCV, templateId: TemplateId): string {
  switch (templateId) {
    case 'modern':    return modernHtml(cv)
    case 'executive': return executiveHtml(cv)
    case 'academic':  return academicHtml(cv)
    default:          return classicHtml(cv)
  }
}

const contact = (cv: GeneratedCV) => {
  const parts = [cv.email, cv.phone, cv.location].filter(Boolean)
  if (cv.linkedin) parts.push(cv.linkedin)
  return parts.join('  •  ')
}

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cambria:wght@400;700&display=swap');
  @page { margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cambria', Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.55; color: #1a1a1a; padding: 0; }
  .role-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2pt; }
  .bullet { padding-left: 14pt; position: relative; margin-bottom: 4pt; line-height: 1.5; }
  .bullet::before { content: '•'; position: absolute; left: 4pt; }
  ul.bullets { list-style: none; }
  ul.bullets li { padding-left: 14pt; position: relative; margin-bottom: 4pt; line-height: 1.5; }
  ul.bullets li::before { content: '•'; position: absolute; left: 4pt; }
`

// ─── 1. CLASSIC ────────────────────────────────────────
function classicHtml(cv: GeneratedCV): string {
  const isLetter = !!cv.coverLetterBody
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    ${baseStyles}
    body { padding: 0; }
    .name { font-size: 22pt; font-weight: 700; text-align: center; color: #0a0a0a; margin-bottom: 4pt; }
    .title { font-size: 12pt; font-style: italic; text-align: center; color: #4a4a4a; margin-bottom: 6pt; }
    .contact { font-size: 10pt; text-align: center; color: #5a5a5a; margin-bottom: 16pt; }
    .sh { font-family: 'Calibri', sans-serif; font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5pt; color: #1a1a1a; border-bottom: 1pt solid #1a1a1a; padding-bottom: 2pt; margin: 14pt 0 7pt; }
    .summary { text-align: justify; line-height: 1.6; }
    .role { font-weight: 700; font-size: 12pt; color: #0a0a0a; }
    .dates { font-size: 10pt; font-style: italic; color: #6a6a6a; }
    .company { font-style: italic; color: #4a4a4a; margin-bottom: 4pt; }
    .exp-block { margin-bottom: 10pt; }
    .skills, .langs, .info { line-height: 1.7; }
  </style></head><body>
    <div class="name">${cv.fullName}</div>
    ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
    <div class="contact">${contact(cv)}</div>
    ${isLetter ? cv.coverLetterBody!.split('\n\n').map(p => `<p style="text-align:justify;line-height:1.6;margin-bottom:10pt">${p}</p>`).join('') : `
      ${cv.summary ? `<div class="sh">Professional Summary</div><p class="summary">${cv.summary}</p>` : ''}
      ${cv.experience?.length ? `<div class="sh">Professional Experience</div>${cv.experience.map(e => `
        <div class="exp-block">
          <div class="role-row"><span class="role">${e.role}</span><span class="dates">${e.startDate} – ${e.endDate}</span></div>
          <div class="company">${e.company}</div>
          <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        </div>`).join('')}` : ''}
      ${cv.education?.length ? `<div class="sh">Education</div>${cv.education.map(ed => `
        <div class="exp-block">
          <div class="role-row"><span class="role">${ed.qualification} in ${ed.field}</span><span class="dates">${ed.startYear} – ${ed.endYear}</span></div>
          <div class="company">${ed.institution}${ed.grade ? ` — ${ed.grade}` : ''}</div>
        </div>`).join('')}` : ''}
      ${cv.skills?.length ? `<div class="sh">Core Skills</div><div class="skills">${cv.skills.join('  •  ')}</div>` : ''}
      ${cv.languages?.length ? `<div class="sh">Languages</div><div class="langs">${cv.languages.join('  •  ')}</div>` : ''}
      ${cv.additionalInfo ? `<div class="sh">Additional Information</div><div class="info">${cv.additionalInfo}</div>` : ''}
    `}
  </body></html>`
}

// ─── 2. MODERN ────────────────────────────────────────
function modernHtml(cv: GeneratedCV): string {
  const isLetter = !!cv.coverLetterBody
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    @import url('https://fonts.googleapis.com/css2?family=Calibri&display=swap');
    @page { margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Calibri', 'Helvetica', sans-serif; font-size: 11pt; line-height: 1.55; color: #1a1a1a; }
    .name { font-size: 22pt; font-weight: 700; color: #0a0a0a; margin-bottom: 4pt; }
    .title { font-size: 12pt; color: #1a56c4; margin-bottom: 6pt; }
    .contact { font-size: 10pt; color: #5a5a5a; margin-bottom: 16pt; }
    .sh { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2pt; color: #1a56c4; border-bottom: 2pt solid #1a56c4; padding-bottom: 2pt; margin: 14pt 0 7pt; }
    .role-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2pt; }
    .role { font-weight: 700; font-size: 12pt; color: #0a0a0a; }
    .dates { font-size: 10pt; color: #6a6a6a; }
    .company { font-style: italic; color: #1a56c4; margin-bottom: 4pt; }
    .exp-block { margin-bottom: 10pt; }
    .bullets { list-style: none; }
    .bullets li { padding-left: 14pt; position: relative; margin-bottom: 4pt; line-height: 1.5; }
    .bullets li::before { content: '•'; position: absolute; left: 4pt; color: #1a56c4; font-weight: 700; }
    .skills, .langs, .info { line-height: 1.7; }
  </style></head><body>
    <div class="name">${cv.fullName}</div>
    ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
    <div class="contact">${contact(cv)}</div>
    ${isLetter ? cv.coverLetterBody!.split('\n\n').map(p => `<p style="line-height:1.6;margin-bottom:10pt">${p}</p>`).join('') : `
      ${cv.summary ? `<div class="sh">Profile</div><p style="line-height:1.6">${cv.summary}</p>` : ''}
      ${cv.experience?.length ? `<div class="sh">Experience</div>${cv.experience.map(e => `
        <div class="exp-block">
          <div class="role-row"><span class="role">${e.role}</span><span class="dates">${e.startDate} – ${e.endDate}</span></div>
          <div class="company">${e.company}</div>
          <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        </div>`).join('')}` : ''}
      ${cv.education?.length ? `<div class="sh">Education</div>${cv.education.map(ed => `
        <div class="exp-block">
          <div class="role-row"><span class="role">${ed.qualification} in ${ed.field}</span><span class="dates">${ed.startYear} – ${ed.endYear}</span></div>
          <div class="company">${ed.institution}${ed.grade ? ` — ${ed.grade}` : ''}</div>
        </div>`).join('')}` : ''}
      ${cv.skills?.length ? `<div class="sh">Skills</div><div class="skills">${cv.skills.join('  •  ')}</div>` : ''}
      ${cv.languages?.length ? `<div class="sh">Languages</div><div class="langs">${cv.languages.join('  •  ')}</div>` : ''}
      ${cv.additionalInfo ? `<div class="sh">Additional Information</div><div class="info">${cv.additionalInfo}</div>` : ''}
    `}
  </body></html>`
}

// ─── 3. EXECUTIVE ─────────────────────────────────────
function executiveHtml(cv: GeneratedCV): string {
  const isLetter = !!cv.coverLetterBody
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    ${baseStyles}
    body { padding: 0; }
    .name { font-size: 22pt; font-weight: 700; text-align: center; color: #0a1a3a; margin-bottom: 4pt; }
    .gold-rule { width: 60pt; height: 2pt; background: #a87b00; margin: 6pt auto 8pt; }
    .title { font-size: 12pt; font-style: italic; text-align: center; color: #a87b00; margin-bottom: 6pt; }
    .contact { font-size: 10pt; text-align: center; color: #4a4a4a; margin-bottom: 16pt; }
    .sh { font-family: 'Calibri', sans-serif; font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 3pt; color: #0a1a3a; border-bottom: 1.5pt solid #a87b00; padding-bottom: 3pt; margin: 14pt 0 7pt; }
    .role-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2pt; }
    .role { font-weight: 700; font-size: 12pt; color: #0a1a3a; }
    .dates { font-size: 10pt; font-style: italic; color: #6a6a6a; }
    .company { font-style: italic; color: #a87b00; margin-bottom: 4pt; }
    .exp-block { margin-bottom: 10pt; }
    .bullets { list-style: none; }
    .bullets li { padding-left: 14pt; position: relative; margin-bottom: 4pt; line-height: 1.5; }
    .bullets li::before { content: '•'; position: absolute; left: 4pt; color: #a87b00; font-weight: 700; }
    .skills, .langs, .info { line-height: 1.7; }
    .summary { text-align: justify; line-height: 1.6; }
  </style></head><body>
    <div class="name">${cv.fullName}</div>
    <div class="gold-rule"></div>
    ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
    <div class="contact">${contact(cv)}</div>
    ${isLetter ? cv.coverLetterBody!.split('\n\n').map(p => `<p style="text-align:justify;line-height:1.6;margin-bottom:10pt">${p}</p>`).join('') : `
      ${cv.summary ? `<div class="sh">Executive Summary</div><p class="summary">${cv.summary}</p>` : ''}
      ${cv.experience?.length ? `<div class="sh">Professional Experience</div>${cv.experience.map(e => `
        <div class="exp-block">
          <div class="role-row"><span class="role">${e.role}</span><span class="dates">${e.startDate} – ${e.endDate}</span></div>
          <div class="company">${e.company}</div>
          <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        </div>`).join('')}` : ''}
      ${cv.education?.length ? `<div class="sh">Education</div>${cv.education.map(ed => `
        <div class="exp-block">
          <div class="role-row"><span class="role">${ed.qualification} in ${ed.field}</span><span class="dates">${ed.startYear} – ${ed.endYear}</span></div>
          <div class="company">${ed.institution}${ed.grade ? ` — ${ed.grade}` : ''}</div>
        </div>`).join('')}` : ''}
      ${cv.skills?.length ? `<div class="sh">Core Competencies</div><div class="skills">${cv.skills.join('  •  ')}</div>` : ''}
      ${cv.languages?.length ? `<div class="sh">Languages</div><div class="langs">${cv.languages.join('  •  ')}</div>` : ''}
      ${cv.additionalInfo ? `<div class="sh">Additional Information</div><div class="info">${cv.additionalInfo}</div>` : ''}
    `}
  </body></html>`
}

// ─── 4. ACADEMIC ──────────────────────────────────────
function academicHtml(cv: GeneratedCV): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    ${baseStyles}
    body { padding: 0; }
    .name { font-size: 22pt; font-weight: 700; text-align: center; color: #0a0a0a; margin-bottom: 4pt; }
    .title { font-size: 12pt; font-style: italic; text-align: center; color: #4a4a4a; margin-bottom: 6pt; }
    .contact { font-size: 10pt; text-align: center; color: #5a5a5a; margin-bottom: 16pt; }
    .sh { font-size: 11pt; font-weight: 700; font-variant: small-caps; letter-spacing: 1pt; color: #1a1a1a; border-bottom: 1pt solid #1a1a1a; padding-bottom: 2pt; margin: 14pt 0 7pt; }
    .role-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2pt; }
    .role { font-weight: 700; font-size: 12pt; color: #0a0a0a; }
    .dates { font-size: 10pt; font-style: italic; color: #6a6a6a; }
    .company { font-style: italic; color: #4a4a4a; margin-bottom: 4pt; }
    .exp-block { margin-bottom: 10pt; }
    .bullets { list-style: none; }
    .bullets li { padding-left: 14pt; position: relative; margin-bottom: 4pt; line-height: 1.5; }
    .bullets li::before { content: '•'; position: absolute; left: 4pt; }
    .summary { text-align: justify; line-height: 1.6; }
    .skills, .langs, .info { line-height: 1.7; }
  </style></head><body>
    <div class="name">${cv.fullName}</div>
    ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
    <div class="contact">${contact(cv)}</div>
    ${cv.summary ? `<div class="sh">Research Profile</div><p class="summary">${cv.summary}</p>` : ''}
    ${cv.education?.length ? `<div class="sh">Education</div>${cv.education.map(ed => `
      <div class="exp-block">
        <div class="role-row"><span class="role">${ed.qualification} in ${ed.field}</span><span class="dates">${ed.startYear} – ${ed.endYear}</span></div>
        <div class="company">${ed.institution}${ed.grade ? ` — ${ed.grade}` : ''}</div>
      </div>`).join('')}` : ''}
    ${cv.experience?.length ? `<div class="sh">Academic & Professional Experience</div>${cv.experience.map(e => `
      <div class="exp-block">
        <div class="role-row"><span class="role">${e.role}</span><span class="dates">${e.startDate} – ${e.endDate}</span></div>
        <div class="company">${e.company}</div>
        <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
      </div>`).join('')}` : ''}
    ${cv.publications?.length ? `<div class="sh">Publications</div><ul class="bullets">${cv.publications.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
    ${cv.research?.length ? `<div class="sh">Research</div><ul class="bullets">${cv.research.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
    ${cv.teaching?.length ? `<div class="sh">Teaching</div><ul class="bullets">${cv.teaching.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
    ${cv.skills?.length ? `<div class="sh">Research Methods & Skills</div><div class="skills">${cv.skills.join('  •  ')}</div>` : ''}
    ${cv.languages?.length ? `<div class="sh">Languages</div><div class="langs">${cv.languages.join('  •  ')}</div>` : ''}
    ${cv.additionalInfo ? `<div class="sh">Memberships, Honours & Awards</div><div class="info">${cv.additionalInfo}</div>` : ''}
  </body></html>`
}
