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
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
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

// ── Contact line builder ────────────────────────────
const contactLine = (cv: GeneratedCV, sep = '  •  ') =>
  [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(sep)

// ── SVG Icons (inline, no library needed) ──────────
const ICON = {
  email: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>`,
  phone: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 10.17 19.79 19.79 0 0 1 1.04 1.54 2 2 0 0 1 3 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  pin:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  link:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
}

function iconContact(cv: GeneratedCV, color = '#555') {
  const parts: string[] = []
  if (cv.email) parts.push(`${ICON.email}${cv.email}`)
  if (cv.phone) parts.push(`${ICON.phone}${cv.phone}`)
  if (cv.location) parts.push(`${ICON.pin}${cv.location}`)
  if (cv.linkedin) parts.push(`${ICON.link}${cv.linkedin}`)
  return parts.map(p => `<span style="color:${color};margin-right:18px;white-space:nowrap">${p}</span>`).join('')
}

// ══════════════════════════════════════════════════════
// TEMPLATE ROUTER
// ══════════════════════════════════════════════════════
function buildHtml(cv: GeneratedCV, templateId: TemplateId): string {
  switch (templateId) {
    case 'nordic':    return nordicHtml(cv)
    case 'executive': return londonHtml(cv)
    case 'newyork':   return newYorkHtml(cv)
    case 'atelier':   return atelierHtml(cv)
    case 'noir':      return noirHtml(cv)
    case 'academic':  return academicHtml(cv)
    case 'london':
    default:          return londonHtml(cv)
  }
}

// ══════════════════════════════════════════════════════
// 1. LONDON — Editorial serif, warm, premium
// Inspired by jsonresume-theme-london-bureau (MIT)
// ══════════════════════════════════════════════════════
function londonHtml(cv: GeneratedCV): string {
  const isLetter = !!cv.coverLetterBody
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:210mm}
    body{
      font-family:'Source Sans 3','Helvetica Neue',sans-serif;
      font-size:10.5pt;
      line-height:1.65;
      color:#2a2a2a;
      background:#faf8f5;
      padding:44px 52px;
    }
    /* Header */
    .header{border-bottom:2.5px solid #2a2a2a;padding-bottom:20px;margin-bottom:28px}
    .name{font-family:'Crimson Text',Georgia,serif;font-size:42px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;line-height:1;margin-bottom:6px}
    .title{font-family:'Crimson Text',Georgia,serif;font-size:16px;font-style:italic;color:#5a5a5a;margin-bottom:14px}
    .contact{font-size:10pt;color:#5a5a5a;display:flex;flex-wrap:wrap;gap:4px 0}
    /* Summary */
    .summary{font-size:10.5pt;line-height:1.7;color:#3a3a3a;margin-bottom:6px;text-align:justify}
    /* Sections */
    .sec{margin-bottom:24px;padding-top:18px;border-top:1px solid #d4cfc7}
    .sec:first-of-type{border-top:none;padding-top:0}
    .sh{font-family:'Crimson Text',Georgia,serif;font-size:18px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px}
    /* Experience */
    .exp{margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid #e8e4dd}
    .exp:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none}
    .exp-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:3px}
    .exp-role{font-family:'Crimson Text',Georgia,serif;font-size:16px;font-weight:700;color:#1a1a1a}
    .exp-dates{font-size:9.5pt;color:#777;white-space:nowrap;font-style:italic}
    .exp-co{font-size:11pt;font-weight:600;color:#4a4a4a;margin-bottom:6px}
    .bullets{margin:8px 0 0 0;padding-left:16px}
    .bullets li{margin-bottom:5px;font-size:10.5pt;line-height:1.55;color:#3a3a3a}
    .bullets li::marker{color:#888}
    /* Education */
    .edu{margin-bottom:14px}
    .edu-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .edu-deg{font-family:'Crimson Text',Georgia,serif;font-size:15px;font-weight:700;color:#1a1a1a}
    .edu-inst{font-size:10.5pt;color:#5a5a5a;font-style:italic}
    /* Skills */
    .skills{font-size:10.5pt;color:#3a3a3a;line-height:1.8}
    /* Cover letter */
    .letter-p{font-size:11pt;line-height:1.75;color:#2a2a2a;margin-bottom:14pt;text-align:justify}
  </style>
  </head><body>
    <div class="header">
      <div class="name">${cv.fullName}</div>
      ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
      <div class="contact">${iconContact(cv, '#5a5a5a')}</div>
    </div>

    ${isLetter
      ? cv.coverLetterBody!.split('\n\n').map(p => `<p class="letter-p">${p}</p>`).join('')
      : `
      ${cv.summary ? `<div class="sec"><p class="summary">${cv.summary}</p></div>` : ''}

      ${cv.experience?.length ? `<div class="sec">
        <div class="sh">Experience</div>
        ${cv.experience.map(e => `
          <div class="exp">
            <div class="exp-head">
              <span class="exp-role">${e.role}</span>
              <span class="exp-dates">${e.startDate} – ${e.endDate}</span>
            </div>
            <div class="exp-co">${e.company}</div>
            <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
          </div>`).join('')}
      </div>` : ''}

      ${cv.education?.length ? `<div class="sec">
        <div class="sh">Education</div>
        ${cv.education.map(ed => `
          <div class="edu">
            <div class="edu-head">
              <span class="edu-deg">${ed.qualification} in ${ed.field}</span>
              <span class="exp-dates">${ed.startYear} – ${ed.endYear}</span>
            </div>
            <div class="edu-inst">${ed.institution}${ed.grade ? ` — ${ed.grade}` : ''}</div>
          </div>`).join('')}
      </div>` : ''}

      ${cv.skills?.length ? `<div class="sec">
        <div class="sh">Skills</div>
        <div class="skills">${cv.skills.join('  ·  ')}</div>
      </div>` : ''}

      ${cv.languages?.length ? `<div class="sec">
        <div class="sh">Languages</div>
        <div class="skills">${cv.languages.join('  ·  ')}</div>
      </div>` : ''}

      ${cv.publications?.length ? `<div class="sec">
        <div class="sh">Publications</div>
        <ul class="bullets">${cv.publications.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>` : ''}

      ${cv.additionalInfo ? `<div class="sec">
        <div class="sh">Additional Information</div>
        <div class="skills">${cv.additionalInfo}</div>
      </div>` : ''}
    `}
  </body></html>`
}

// ══════════════════════════════════════════════════════
// 2. NORDIC — Clean, light, contemporary
// Inspired by jsonresume-theme-nordic-minimal (MIT)
// ══════════════════════════════════════════════════════
function nordicHtml(cv: GeneratedCV): string {
  const isLetter = !!cv.coverLetterBody
  const BLUE = '#2563eb'
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:210mm}
    body{
      font-family:'Inter','Helvetica Neue',sans-serif;
      font-size:10pt;
      line-height:1.7;
      color:#1e293b;
      background:#ffffff;
      padding:44px 52px;
    }
    /* Header */
    .header{margin-bottom:32px;padding-bottom:28px;border-bottom:1px solid #e2e8f0}
    .name{font-size:36pt;font-weight:300;color:#0f172a;letter-spacing:-1px;line-height:1;margin-bottom:6px}
    .title{font-size:12pt;font-weight:400;color:#64748b;margin-bottom:16px;letter-spacing:0.2px}
    .contact{display:flex;flex-wrap:wrap;gap:4px 0;font-size:9.5pt;color:#475569}
    .summary{font-size:10pt;line-height:1.75;color:#334155;font-weight:300;margin-bottom:8px}
    /* Section header */
    .sh{font-size:8.5pt;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:${BLUE};border-bottom:2px solid ${BLUE};padding-bottom:5px;margin:22px 0 14px}
    /* Experience */
    .exp{margin-bottom:20px}
    .exp-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:2px}
    .exp-role{font-size:12pt;font-weight:500;color:#0f172a}
    .exp-dates{font-size:9pt;color:#94a3b8;white-space:nowrap;font-weight:300}
    .exp-co{font-size:10pt;color:${BLUE};font-weight:400;margin-bottom:6px}
    .bullets{margin:6px 0 0 0;padding:0;list-style:none}
    .bullets li{font-size:10pt;line-height:1.6;color:#334155;padding-left:14px;position:relative;margin-bottom:4px;font-weight:300}
    .bullets li::before{content:'—';position:absolute;left:0;color:${BLUE};font-weight:600}
    /* Education */
    .edu{margin-bottom:12px}
    .edu-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .edu-deg{font-size:11pt;font-weight:500;color:#0f172a}
    .edu-inst{font-size:10pt;color:${BLUE};font-weight:300}
    /* Skills */
    .skills{font-size:10pt;color:#334155;line-height:1.85;font-weight:300}
    /* Letter */
    .letter-p{font-size:10.5pt;line-height:1.8;color:#1e293b;margin-bottom:14pt;font-weight:300}
  </style>
  </head><body>
    <div class="header">
      <div class="name">${cv.fullName}</div>
      ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
      <div class="contact">${iconContact(cv, '#475569')}</div>
    </div>

    ${isLetter
      ? cv.coverLetterBody!.split('\n\n').map(p => `<p class="letter-p">${p}</p>`).join('')
      : `
      ${cv.summary ? `<div class="sh">Profile</div><p class="summary">${cv.summary}</p>` : ''}

      ${cv.experience?.length ? `<div class="sh">Experience</div>
        ${cv.experience.map(e => `
          <div class="exp">
            <div class="exp-head">
              <span class="exp-role">${e.role}</span>
              <span class="exp-dates">${e.startDate} – ${e.endDate}</span>
            </div>
            <div class="exp-co">${e.company}</div>
            <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
          </div>`).join('')}` : ''}

      ${cv.education?.length ? `<div class="sh">Education</div>
        ${cv.education.map(ed => `
          <div class="edu">
            <div class="edu-head">
              <span class="edu-deg">${ed.qualification} in ${ed.field}</span>
              <span class="exp-dates">${ed.startYear} – ${ed.endYear}</span>
            </div>
            <div class="edu-inst">${ed.institution}${ed.grade ? ` · ${ed.grade}` : ''}</div>
          </div>`).join('')}` : ''}

      ${cv.skills?.length ? `<div class="sh">Skills</div><div class="skills">${cv.skills.join('  ·  ')}</div>` : ''}
      ${cv.languages?.length ? `<div class="sh">Languages</div><div class="skills">${cv.languages.join('  ·  ')}</div>` : ''}
      ${cv.publications?.length ? `<div class="sh">Publications</div><ul class="bullets">${cv.publications.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
      ${cv.additionalInfo ? `<div class="sh">Additional</div><div class="skills">${cv.additionalInfo}</div>` : ''}
    `}
  </body></html>`
}

// ══════════════════════════════════════════════════════
// 3. ACADEMIC — Scholarly, structured
// ══════════════════════════════════════════════════════
function academicHtml(cv: GeneratedCV): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:210mm}
    body{
      font-family:'Source Sans 3','Helvetica Neue',sans-serif;
      font-size:10.5pt;
      line-height:1.65;
      color:#1a1a1a;
      background:#ffffff;
      padding:44px 52px;
    }
    .header{text-align:center;border-bottom:2px solid #1a1a1a;padding-bottom:20px;margin-bottom:26px}
    .name{font-family:'Crimson Text',Georgia,serif;font-size:32px;font-weight:700;color:#0a0a0a;margin-bottom:6px}
    .title{font-family:'Crimson Text',Georgia,serif;font-size:15px;font-style:italic;color:#4a4a4a;margin-bottom:12px}
    .contact{font-size:9.5pt;color:#555;display:flex;flex-wrap:wrap;justify-content:center;gap:4px 0}
    .sh{font-family:'Source Sans 3',sans-serif;font-size:10pt;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#1a1a1a;border-bottom:1px solid #1a1a1a;padding-bottom:3px;margin:20px 0 12px;font-variant:small-caps}
    .summary{font-size:10.5pt;line-height:1.7;text-align:justify;margin-bottom:6px}
    .exp{margin-bottom:18px}
    .exp-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:2px}
    .exp-role{font-family:'Crimson Text',Georgia,serif;font-size:15px;font-weight:700;color:#0a0a0a}
    .exp-dates{font-size:9pt;color:#777;white-space:nowrap;font-style:italic}
    .exp-co{font-size:10.5pt;font-style:italic;color:#4a4a4a;margin-bottom:6px}
    .bullets{margin:6px 0 0 0;padding-left:16px}
    .bullets li{font-size:10.5pt;line-height:1.6;color:#1a1a1a;margin-bottom:4px}
    .edu{margin-bottom:12px}
    .edu-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .edu-deg{font-family:'Crimson Text',Georgia,serif;font-size:14px;font-weight:700;color:#0a0a0a}
    .edu-inst{font-size:10.5pt;font-style:italic;color:#5a5a5a}
    .skills{font-size:10.5pt;color:#1a1a1a;line-height:1.8}
  </style>
  </head><body>
    <div class="header">
      <div class="name">${cv.fullName}</div>
      ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
      <div class="contact">${iconContact(cv, '#555')}</div>
    </div>

    ${cv.summary ? `<div class="sh">Research Profile</div><p class="summary">${cv.summary}</p>` : ''}
    ${cv.education?.length ? `<div class="sh">Education</div>${cv.education.map(ed => `
      <div class="edu">
        <div class="edu-head"><span class="edu-deg">${ed.qualification} in ${ed.field}</span><span class="exp-dates">${ed.startYear} – ${ed.endYear}</span></div>
        <div class="edu-inst">${ed.institution}${ed.grade ? ` — ${ed.grade}` : ''}</div>
      </div>`).join('')}` : ''}
    ${cv.experience?.length ? `<div class="sh">Academic & Professional Experience</div>${cv.experience.map(e => `
      <div class="exp">
        <div class="exp-head"><span class="exp-role">${e.role}</span><span class="exp-dates">${e.startDate} – ${e.endDate}</span></div>
        <div class="exp-co">${e.company}</div>
        <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
      </div>`).join('')}` : ''}
    ${cv.publications?.length ? `<div class="sh">Publications</div><ul class="bullets">${cv.publications.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
    ${cv.research?.length ? `<div class="sh">Research</div><ul class="bullets">${cv.research.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
    ${cv.teaching?.length ? `<div class="sh">Teaching</div><ul class="bullets">${cv.teaching.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
    ${cv.skills?.length ? `<div class="sh">Research Methods & Skills</div><div class="skills">${cv.skills.join('  ·  ')}</div>` : ''}
    ${cv.languages?.length ? `<div class="sh">Languages</div><div class="skills">${cv.languages.join('  ·  ')}</div>` : ''}
    ${cv.additionalInfo ? `<div class="sh">Honours, Awards & Memberships</div><div class="skills">${cv.additionalInfo}</div>` : ''}
  </body></html>`
}

// ══════════════════════════════════════════════════════
// ADDITIONAL PREMIUM TEMPLATES
// ══════════════════════════════════════════════════════

// Export the extended build function — replace the existing buildHtml
// by adding these cases to the switch statement in the main file:
// case 'newyork':   return newYorkHtml(cv)
// case 'atelier':  return atelierHtml(cv)
// case 'noir':     return noirHtml(cv)

// ══════════════════════════════════════════════════════
// 4. NEW YORK EDITORIAL
// Merriweather 900 black, crimson red accents, centered
// Inspired by jsonresume-theme-new-york-editorial (MIT)
// ══════════════════════════════════════════════════════
export function newYorkHtml(cv: GeneratedCV): string {
  const isLetter = !!cv.coverLetterBody
  const RED = '#b22222'
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Source+Sans+Pro:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:210mm}
    body{
      font-family:'Source Sans Pro','Helvetica Neue',sans-serif;
      font-size:11pt;
      line-height:1.75;
      color:#2a2a2a;
      background:#ffffff;
      padding:52px 64px;
    }
    .header{text-align:center;border-bottom:3px solid #222;padding-bottom:32px;margin-bottom:40px}
    .name{font-family:'Merriweather',Georgia,serif;font-size:52px;font-weight:900;color:#222;letter-spacing:-1px;line-height:1.05;margin-bottom:12px}
    .title{font-family:'Merriweather',Georgia,serif;font-size:19px;font-style:italic;color:#555;margin-bottom:20px;letter-spacing:0.3px}
    .contact{font-size:11pt;color:#666;display:flex;justify-content:center;flex-wrap:wrap;gap:0 20px}
    .summary{font-size:12pt;line-height:1.8;color:#3a3a3a;border-left:3px solid ${RED};padding-left:18px;margin-bottom:8px;font-style:italic}
    .sh{font-family:'Merriweather',Georgia,serif;font-size:22px;font-weight:700;color:#222;padding-bottom:10px;border-bottom:2px solid #e0e0e0;margin:32px 0 22px;position:relative}
    .sh::after{content:'';position:absolute;bottom:-2px;left:0;width:70px;height:2px;background:${RED}}
    .exp{margin-bottom:32px}
    .exp-role{font-family:'Merriweather',Georgia,serif;font-size:20px;font-weight:700;color:#222;margin-bottom:6px}
    .exp-meta{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px}
    .exp-co{font-size:12pt;font-style:italic;color:#444}
    .exp-dates{font-size:10pt;color:#777;white-space:nowrap}
    .bullets{list-style:none;margin:10px 0 0;padding-left:28px}
    .bullets li{position:relative;margin-bottom:8px;font-size:11pt;line-height:1.75;color:#3a3a3a}
    .bullets li::before{content:'—';position:absolute;left:-28px;color:${RED};font-weight:700}
    .edu-item{margin-bottom:16px}
    .edu-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .edu-name{font-family:'Merriweather',Georgia,serif;font-size:17px;font-weight:700;color:#222}
    .edu-inst{font-size:11pt;font-style:italic;color:#555}
    .skills-line{font-size:11pt;color:#3a3a3a;line-height:1.9}
    .letter-p{font-size:11.5pt;line-height:1.8;margin-bottom:14pt;color:#2a2a2a}
  </style></head><body>
    <div class="header">
      <div class="name">${cv.fullName}</div>
      ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
      <div class="contact">${iconContact(cv, '#666')}</div>
    </div>

    ${isLetter
      ? cv.coverLetterBody!.split('\n\n').map(p => `<p class="letter-p">${p}</p>`).join('')
      : `
      ${cv.summary ? `<p class="summary">${cv.summary}</p>` : ''}
      ${cv.experience?.length ? `<div class="sh">Experience</div>${cv.experience.map(e => `
        <div class="exp">
          <div class="exp-role">${e.role}</div>
          <div class="exp-meta"><span class="exp-co">${e.company}</span><span class="exp-dates">${e.startDate} – ${e.endDate}</span></div>
          <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        </div>`).join('')}` : ''}
      ${cv.education?.length ? `<div class="sh">Education</div>${cv.education.map(ed => `
        <div class="edu-item">
          <div class="edu-head"><span class="edu-name">${ed.qualification} in ${ed.field}</span><span class="exp-dates">${ed.startYear} – ${ed.endYear}</span></div>
          <div class="edu-inst">${ed.institution}${ed.grade ? ` — ${ed.grade}` : ''}</div>
        </div>`).join('')}` : ''}
      ${cv.skills?.length ? `<div class="sh">Skills</div><div class="skills-line">${cv.skills.join('  ·  ')}</div>` : ''}
      ${cv.languages?.length ? `<div class="sh">Languages</div><div class="skills-line">${cv.languages.join('  ·  ')}</div>` : ''}
      ${cv.publications?.length ? `<div class="sh">Publications</div><ul class="bullets">${cv.publications.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
      ${cv.additionalInfo ? `<div class="sh">Additional Information</div><div class="skills-line">${cv.additionalInfo}</div>` : ''}
    `}
  </body></html>`
}

// ══════════════════════════════════════════════════════
// 5. FRENCH ATELIER
// Playfair Display 900, deep purple, timeline dots
// Inspired by jsonresume-theme-french-atelier (MIT)
// ══════════════════════════════════════════════════════
export function atelierHtml(cv: GeneratedCV): string {
  const isLetter = !!cv.coverLetterBody
  const PURPLE = '#3b0a45'
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Work+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:210mm}
    body{
      font-family:'Work Sans','Helvetica Neue',sans-serif;
      font-size:10.5pt;
      line-height:1.75;
      color:#3a3a3a;
      background:#fafafa;
      padding:48px 48px;
    }
    .header{margin-bottom:40px;padding-bottom:32px;border-bottom:2px solid ${PURPLE};position:relative}
    .header::after{content:'';position:absolute;bottom:-1px;left:0;width:100px;height:2px;background:${PURPLE}}
    .name{font-family:'Playfair Display',Georgia,serif;font-size:52px;font-weight:900;color:#1a1a1a;letter-spacing:-1.5px;line-height:1.05;margin-bottom:6px}
    .title{font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${PURPLE};margin-bottom:16px}
    .contact{font-size:10pt;color:#5a5a5a;display:flex;flex-wrap:wrap;gap:0}
    .summary{font-size:10.5pt;line-height:1.8;color:#4a4a4a;font-weight:300;max-width:600px;margin-bottom:6px}
    .sh{font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:#1a1a1a;margin:28px 0 20px;padding-bottom:10px;border-bottom:1px solid #d4d4d4;position:relative;letter-spacing:-0.5px}
    .sh::after{content:'';position:absolute;bottom:-1px;left:0;width:70px;height:1px;background:${PURPLE}}
    /* Timeline style for experience */
    .exp{margin-bottom:28px;padding-left:22px;border-left:1px solid #e0e0e0;position:relative}
    .exp::before{content:'';position:absolute;left:-5px;top:8px;width:8px;height:8px;border-radius:50%;background:${PURPLE}}
    .exp-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:4px}
    .exp-role{font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;color:#1a1a1a}
    .exp-dates{font-size:9.5pt;color:#777;white-space:nowrap;font-style:italic}
    .exp-co{font-size:11pt;color:${PURPLE};font-weight:500;margin-bottom:8px}
    .bullets{list-style:none;margin:8px 0 0;padding:0}
    .bullets li{position:relative;padding-left:16px;margin-bottom:5px;font-size:10.5pt;line-height:1.65;color:#3a3a3a;font-weight:300}
    .bullets li::before{content:'›';position:absolute;left:0;color:${PURPLE};font-weight:700;font-size:13pt}
    .edu-item{margin-bottom:14px;padding-left:22px;border-left:1px solid #e0e0e0;position:relative}
    .edu-item::before{content:'';position:absolute;left:-5px;top:8px;width:8px;height:8px;border-radius:50%;background:${PURPLE}}
    .edu-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .edu-name{font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:700;color:#1a1a1a}
    .edu-inst{font-size:10.5pt;color:${PURPLE};font-weight:300;font-style:italic}
    .skills-line{font-size:10.5pt;color:#3a3a3a;line-height:1.9;font-weight:300}
    .letter-p{font-size:11pt;line-height:1.8;margin-bottom:14pt;color:#3a3a3a;font-weight:300}
  </style></head><body>
    <div class="header">
      <div class="name">${cv.fullName}</div>
      ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
      <div class="contact">${iconContact(cv, '#5a5a5a')}</div>
    </div>

    ${isLetter
      ? cv.coverLetterBody!.split('\n\n').map(p => `<p class="letter-p">${p}</p>`).join('')
      : `
      ${cv.summary ? `<p class="summary">${cv.summary}</p>` : ''}
      ${cv.experience?.length ? `<div class="sh">Experience</div>${cv.experience.map(e => `
        <div class="exp">
          <div class="exp-head"><span class="exp-role">${e.role}</span><span class="exp-dates">${e.startDate} – ${e.endDate}</span></div>
          <div class="exp-co">${e.company}</div>
          <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        </div>`).join('')}` : ''}
      ${cv.education?.length ? `<div class="sh">Education</div>${cv.education.map(ed => `
        <div class="edu-item">
          <div class="edu-head"><span class="edu-name">${ed.qualification} in ${ed.field}</span><span class="exp-dates">${ed.startYear} – ${ed.endYear}</span></div>
          <div class="edu-inst">${ed.institution}${ed.grade ? ` — ${ed.grade}` : ''}</div>
        </div>`).join('')}` : ''}
      ${cv.skills?.length ? `<div class="sh">Skills</div><div class="skills-line">${cv.skills.join('  ·  ')}</div>` : ''}
      ${cv.languages?.length ? `<div class="sh">Languages</div><div class="skills-line">${cv.languages.join('  ·  ')}</div>` : ''}
      ${cv.additionalInfo ? `<div class="sh">Additional Information</div><div class="skills-line">${cv.additionalInfo}</div>` : ''}
    `}
  </body></html>`
}

// ══════════════════════════════════════════════════════
// 6. MONOCHROME NOIR
// Uppercase bold name, condensed sans, pure black/white
// Inspired by jsonresume-theme-monochrome-noir (MIT)
// ══════════════════════════════════════════════════════
export function noirHtml(cv: GeneratedCV): string {
  const isLetter = !!cv.coverLetterBody
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800&family=Barlow:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:210mm}
    body{
      font-family:'Barlow','Helvetica Neue',sans-serif;
      font-size:10.5pt;
      line-height:1.6;
      color:#111;
      background:#f5f5f5;
      padding:48px 56px;
    }
    .header{margin-bottom:40px;padding-bottom:28px;border-bottom:3px solid #111}
    .name{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:56px;font-weight:800;color:#000;letter-spacing:-2px;line-height:0.92;text-transform:uppercase;margin-bottom:10px}
    .title{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:16px;font-weight:500;color:#333;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px}
    .contact{font-size:9.5pt;color:#444;letter-spacing:-0.2px;display:flex;flex-wrap:wrap;gap:0}
    .summary{font-size:10.5pt;line-height:1.7;color:#1a1a1a;font-weight:300;margin-bottom:6px;max-width:640px}
    .sh{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#000;border-top:2px solid #000;padding-top:10px;margin:28px 0 16px}
    .exp{margin-bottom:24px}
    .exp-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:2px}
    .exp-role{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:18px;font-weight:700;color:#000;letter-spacing:-0.3px}
    .exp-dates{font-size:9pt;color:#666;white-space:nowrap;letter-spacing:1px;text-transform:uppercase;font-weight:500}
    .exp-co{font-size:11pt;font-weight:500;color:#333;margin-bottom:6px;letter-spacing:-0.2px}
    .bullets{list-style:none;margin:8px 0 0;padding:0}
    .bullets li{position:relative;padding-left:16px;margin-bottom:5px;font-size:10.5pt;line-height:1.55;color:#1a1a1a;font-weight:300}
    .bullets li::before{content:'▸';position:absolute;left:0;color:#555;font-size:9pt;top:1px}
    .edu-item{margin-bottom:12px}
    .edu-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .edu-name{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:16px;font-weight:700;color:#000;letter-spacing:-0.2px}
    .edu-inst{font-size:10pt;color:#444;font-weight:400;margin-top:2px}
    .skills-line{font-size:10.5pt;color:#1a1a1a;line-height:1.9;font-weight:300;letter-spacing:-0.1px}
    .letter-p{font-size:11pt;line-height:1.75;margin-bottom:14pt;color:#111;font-weight:300}
  </style></head><body>
    <div class="header">
      <div class="name">${cv.fullName}</div>
      ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
      <div class="contact">${iconContact(cv, '#444')}</div>
    </div>

    ${isLetter
      ? cv.coverLetterBody!.split('\n\n').map(p => `<p class="letter-p">${p}</p>`).join('')
      : `
      ${cv.summary ? `<p class="summary">${cv.summary}</p>` : ''}
      ${cv.experience?.length ? `<div class="sh">Experience</div>${cv.experience.map(e => `
        <div class="exp">
          <div class="exp-head"><span class="exp-role">${e.role}</span><span class="exp-dates">${e.startDate} – ${e.endDate}</span></div>
          <div class="exp-co">${e.company}</div>
          <ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        </div>`).join('')}` : ''}
      ${cv.education?.length ? `<div class="sh">Education</div>${cv.education.map(ed => `
        <div class="edu-item">
          <div class="edu-head"><span class="edu-name">${ed.qualification} in ${ed.field}</span><span class="exp-dates">${ed.startYear} – ${ed.endYear}</span></div>
          <div class="edu-inst">${ed.institution}${ed.grade ? ` — ${ed.grade}` : ''}</div>
        </div>`).join('')}` : ''}
      ${cv.skills?.length ? `<div class="sh">Skills</div><div class="skills-line">${cv.skills.join('  ·  ')}</div>` : ''}
      ${cv.languages?.length ? `<div class="sh">Languages</div><div class="skills-line">${cv.languages.join('  ·  ')}</div>` : ''}
      ${cv.additionalInfo ? `<div class="sh">Additional Information</div><div class="skills-line">${cv.additionalInfo}</div>` : ''}
    `}
  </body></html>`
}
