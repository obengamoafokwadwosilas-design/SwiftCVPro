export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GeneratedCV, TemplateId } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { cv, templateId }: { cv: GeneratedCV; templateId: TemplateId } = await req.json()
    if (!cv) return NextResponse.json({ error: 'No CV data' }, { status: 400 })

    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true
    })

    const page = await browser.newPage()
    const html = buildHTML(cv, templateId || 'bold-header')
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    })

    await browser.close()

    const fileName = `${cv.fullName.replace(/\s+/g, '_')}_CV.pdf`
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      }
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json({ error: 'PDF export failed. Please try again.' }, { status: 500 })
  }
}

// ── Shared data helpers ───────────────────────────────
function contact(cv: GeneratedCV) {
  return [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(' · ')
}

function experienceHTML(cv: GeneratedCV, bulletColor: string) {
  if (!cv.experience?.length) return ''
  return cv.experience.map(exp => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:11pt;font-weight:700;color:#111">${exp.role}</span>
        <span style="font-size:9pt;color:#9ca3af;font-style:italic">${exp.startDate} – ${exp.endDate}</span>
      </div>
      <div style="font-size:10pt;color:${bulletColor};font-weight:600;margin:2px 0 5px">${exp.company}</div>
      ${exp.bullets.map(b => `
        <div style="font-size:9.5pt;color:#374151;padding-left:13px;position:relative;margin-bottom:3px;line-height:1.55">
          <span style="position:absolute;left:0;color:${bulletColor};font-size:7pt;top:2px">▪</span>${b}
        </div>`).join('')}
    </div>`).join('')
}

function educationHTML(cv: GeneratedCV) {
  if (!cv.education?.length) return ''
  return cv.education.map(edu => `
    <div style="margin-bottom:10px">
      <div style="font-size:11pt;font-weight:700;color:#111">${edu.qualification} in ${edu.field}</div>
      <div style="font-size:9.5pt;color:#6b7280">${edu.institution} · ${edu.startYear}–${edu.endYear}${edu.grade ? ` · ${edu.grade}` : ''}</div>
    </div>`).join('')
}

function skillsHTML(cv: GeneratedCV) {
  if (!cv.skills?.length) return ''
  return Array.isArray(cv.skills) ? cv.skills.join(' · ') : cv.skills
}

function languagesHTML(cv: GeneratedCV) {
  if (!cv.languages?.length) return ''
  return cv.languages.join(' · ')
}

function additionalHTML(cv: GeneratedCV) {
  if (!cv.additionalInfo) return ''
  return cv.additionalInfo
}

// ── Shared section header ─────────────────────────────
function sh(text: string, color: string, style = '') {
  return `<div style="font-size:7.5pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${color};border-bottom:2px solid ${color};padding-bottom:3px;margin-bottom:8px;display:inline-block;${style}">${text}</div>`
}

// ── Shared body sections ──────────────────────────────
function sharedBody(cv: GeneratedCV, accentColor: string) {
  let html = ''

  if (cv.coverLetterBody) {
    html += `<div style="margin-bottom:16px">${sh('Cover Letter', accentColor)}`
    html += cv.coverLetterBody.split('\n\n').map(p =>
      `<p style="font-size:10.5pt;color:#374151;line-height:1.7;margin-bottom:10px">${p}</p>`
    ).join('')
    html += '</div>'
    return html
  }

  if (cv.summary) {
    html += `<div style="margin-bottom:16px">${sh('Professional Summary', accentColor)}
      <p style="font-size:10.5pt;color:#374151;line-height:1.7;margin-top:5px">${cv.summary}</p>
    </div>`
  }

  if (cv.experience?.length) {
    html += `<div style="margin-bottom:16px">${sh('Work Experience', accentColor)}
      <div style="margin-top:6px">${experienceHTML(cv, accentColor)}</div>
    </div>`
  }

  if (cv.education?.length) {
    html += `<div style="margin-bottom:16px">${sh('Education', accentColor)}
      <div style="margin-top:6px">${educationHTML(cv)}</div>
    </div>`
  }

  if (cv.publications?.length) {
    html += `<div style="margin-bottom:16px">${sh('Publications', accentColor)}
      <div style="margin-top:6px">${cv.publications.map(p => `<div style="font-size:9.5pt;color:#333;margin-bottom:4px;padding-left:12px;position:relative"><span style="position:absolute;left:0">•</span>${p}</div>`).join('')}</div>
    </div>`
  }

  if (cv.research?.length) {
    html += `<div style="margin-bottom:16px">${sh('Research Interests', accentColor)}
      <p style="font-size:10pt;color:#374151;margin-top:5px">${cv.research.join(' · ')}</p>
    </div>`
  }

  if (cv.teaching?.length) {
    html += `<div style="margin-bottom:16px">${sh('Teaching', accentColor)}
      <div style="margin-top:6px">${cv.teaching.map(t => `<div style="font-size:9.5pt;color:#333;margin-bottom:3px;padding-left:12px;position:relative"><span style="position:absolute;left:0">•</span>${t}</div>`).join('')}</div>
    </div>`
  }

  if (cv.skills?.length) {
    html += `<div style="margin-bottom:14px">${sh('Skills', accentColor)}
      <p style="font-size:10pt;color:#374151;margin-top:5px;line-height:1.7">${skillsHTML(cv)}</p>
    </div>`
  }

  if (cv.languages?.length) {
    html += `<div style="margin-bottom:14px">${sh('Languages', accentColor)}
      <p style="font-size:10pt;color:#374151;margin-top:5px">${languagesHTML(cv)}</p>
    </div>`
  }

  if (cv.additionalInfo) {
    html += `<div style="margin-bottom:14px">${sh('Additional Information', accentColor)}
      <p style="font-size:10pt;color:#374151;margin-top:5px;line-height:1.7">${additionalHTML(cv)}</p>
    </div>`
  }

  return html
}

// ── HTML builder per template ─────────────────────────
function buildHTML(cv: GeneratedCV, templateId: TemplateId): string {
  const base = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',Arial,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  `

  switch (templateId) {

    // ── 1. BOLD HEADER ──────────────────────────────────
    case 'bold-header':
    default:
      return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>${base}
        .header { background:#1a56c4; padding:28px 36px 22px; color:white; }
        .name { font-family:Georgia,serif; font-size:26pt; font-weight:800; letter-spacing:1px; text-transform:uppercase; line-height:1.1; }
        .role { font-size:12pt; color:rgba(255,255,255,0.85); margin-top:4px; }
        .contact { font-size:9.5pt; color:rgba(255,255,255,0.55); margin-top:5px; }
        .body { padding:24px 36px; }
      </style></head><body>
        <div class="header">
          <div class="name">${cv.fullName}</div>
          <div class="role">${cv.jobTitle}</div>
          <div class="contact">${contact(cv)}</div>
        </div>
        <div class="body">${sharedBody(cv, '#1a56c4')}</div>
      </body></html>`

    // ── 2. CLASSIC ──────────────────────────────────────
    case 'classic':
      return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>${base}
        body { padding:36px 44px; }
        .name { font-family:Georgia,serif; font-size:26pt; font-weight:700; text-align:center; letter-spacing:0.3px; color:#111; }
        .role { font-size:12pt; color:#6b7280; text-align:center; margin-top:4px; }
        .contact-line { font-size:9.5pt; color:#9ca3af; text-align:center; margin-top:4px; }
        .rule { height:1px; background:#e5e7eb; margin:14px 0; }
      </style></head><body>
        <div class="name">${cv.fullName.toUpperCase()}</div>
        <div class="role">${cv.jobTitle}</div>
        <div class="contact-line">${contact(cv)}</div>
        <div class="rule"></div>
        ${sharedBody(cv, '#475569')}
      </body></html>`

    // ── 3. MINIMAL ──────────────────────────────────────
    case 'minimal':
      return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>${base}
        body { padding:36px 40px; }
        .top { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1.5px solid #111; padding-bottom:10px; margin-bottom:14px; }
        .name { font-family:Georgia,serif; font-size:24pt; font-weight:700; color:#111; }
        .right { text-align:right; }
        .ci { font-size:8.5pt; color:#9ca3af; display:block; line-height:1.6; }
        .sec-sh { font-size:9pt; font-weight:700; color:#111; margin-bottom:6px; display:flex; align-items:center; gap:8px; }
        .sec-sh::after { content:''; flex:1; height:0.5px; background:#d1d5db; }
        .jr { display:flex; justify-content:space-between; }
        .jt { font-size:11pt; font-weight:700; color:#111; }
        .jd { font-size:9pt; color:#9ca3af; }
        .co { font-size:9.5pt; color:#6b7280; margin-bottom:4px; }
        .bul { font-size:9.5pt; color:#374151; padding-left:12px; position:relative; margin-bottom:3px; }
        .bul::before { content:'·'; position:absolute; left:3px; color:#9ca3af; }
        .tags { display:flex; flex-wrap:wrap; gap:5px; margin-top:5px; }
        .tag { font-size:8pt; border:0.5px solid #d1d5db; padding:2px 9px; border-radius:2px; color:#6b7280; }
        .sec { margin-bottom:14px; }
        .txt { font-size:10pt; color:#374151; line-height:1.7; }
      </style></head><body>
        <div class="top">
          <div class="name">${cv.fullName}</div>
          <div class="right">
            ${[cv.email, cv.phone, cv.location].filter(Boolean).map(v => `<span class="ci">${v}</span>`).join('')}
          </div>
        </div>
        ${cv.summary ? `<div class="sec"><div class="sec-sh">Summary</div><p class="txt">${cv.summary}</p></div>` : ''}
        ${cv.experience?.length ? `<div class="sec"><div class="sec-sh">Experience</div>
          ${cv.experience.map(exp => `
            <div style="margin-bottom:12px">
              <div class="jr"><span class="jt">${exp.role}</span><span class="jd">${exp.startDate} – ${exp.endDate}</span></div>
              <div class="co">${exp.company}</div>
              ${exp.bullets.map(b => `<div class="bul">${b}</div>`).join('')}
            </div>`).join('')}
        </div>` : ''}
        ${cv.education?.length ? `<div class="sec"><div class="sec-sh">Education</div>
          ${cv.education.map(edu => `
            <div style="margin-bottom:8px">
              <div class="jr"><span class="jt">${edu.qualification} in ${edu.field}</span><span class="jd">${edu.endYear}</span></div>
              <div class="co">${edu.institution}${edu.grade ? ` · ${edu.grade}` : ''}</div>
            </div>`).join('')}
        </div>` : ''}
        ${cv.skills?.length ? `<div class="sec"><div class="sec-sh">Skills</div>
          <div class="tags">${(Array.isArray(cv.skills) ? cv.skills : String(cv.skills).split(',')).map((s: string) => `<span class="tag">${s.trim()}</span>`).join('')}</div>
        </div>` : ''}
        ${cv.languages?.length ? `<div class="sec"><div class="sec-sh">Languages</div><p class="txt">${cv.languages.join(' · ')}</p></div>` : ''}
        ${cv.additionalInfo ? `<div class="sec"><div class="sec-sh">Additional Information</div><p class="txt">${cv.additionalInfo}</p></div>` : ''}
      </body></html>`

    // ── 4. ACCENT ───────────────────────────────────────
    case 'accent':
      return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>${base}
        body { display:flex; min-height:297mm; }
        .bar { width:7px; background:#b45309; flex-shrink:0; }
        .inner { flex:1; padding:28px 32px; }
        .head { border-bottom:1px solid #e7e5e4; padding-bottom:16px; margin-bottom:16px; }
        .name { font-family:Georgia,serif; font-size:24pt; font-weight:700; color:#1c1917; }
        .role { font-size:11pt; color:#78716c; margin-top:3px; }
        .contact-line { font-size:9pt; color:#aaa; margin-top:5px; }
        .skill-tags { display:flex; flex-wrap:wrap; gap:5px; margin-top:10px; }
        .skill-tag { font-size:8pt; background:#fef3c7; color:#92400e; padding:2px 9px; border-radius:3px; font-weight:600; }
        .sec-sh { font-size:7.5pt; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#b45309; margin-bottom:8px; }
        .sec { margin-bottom:16px; }
        .jt { font-size:11pt; font-weight:700; color:#1c1917; }
        .co { font-size:9.5pt; color:#a8a29e; margin:2px 0 5px; }
        .bul { font-size:9.5pt; color:#57534e; padding-left:13px; position:relative; margin-bottom:3px; line-height:1.55; }
        .bul::before { content:'▸'; position:absolute; left:0; color:#b45309; font-size:7pt; top:2px; }
        .txt { font-size:10pt; color:#57534e; line-height:1.7; }
      </style></head><body>
        <div class="bar"></div>
        <div class="inner">
          <div class="head">
            <div class="name">${cv.fullName}</div>
            <div class="role">${cv.jobTitle} · ${cv.location || ''}</div>
            <div class="contact-line">${[cv.email, cv.phone].filter(Boolean).join(' · ')}</div>
            ${cv.skills?.length ? `<div class="skill-tags">${(Array.isArray(cv.skills) ? cv.skills : String(cv.skills).split(',')).map((s: string) => `<span class="skill-tag">${s.trim()}</span>`).join('')}</div>` : ''}
          </div>
          ${cv.summary ? `<div class="sec"><div class="sec-sh">Summary</div><p class="txt">${cv.summary}</p></div>` : ''}
          ${cv.experience?.length ? `<div class="sec"><div class="sec-sh">Experience</div>
            ${cv.experience.map(exp => `
              <div style="margin-bottom:14px">
                <div class="jt">${exp.role} — ${exp.company}</div>
                <div class="co">${exp.startDate} – ${exp.endDate}</div>
                ${exp.bullets.map(b => `<div class="bul">${b}</div>`).join('')}
              </div>`).join('')}
          </div>` : ''}
          ${cv.education?.length ? `<div class="sec"><div class="sec-sh">Education</div>
            ${cv.education.map(edu => `
              <div style="margin-bottom:8px">
                <div class="jt">${edu.qualification} in ${edu.field}</div>
                <div class="co">${edu.institution} · ${edu.endYear}${edu.grade ? ` · ${edu.grade}` : ''}</div>
              </div>`).join('')}
          </div>` : ''}
          ${cv.languages?.length ? `<div class="sec"><div class="sec-sh">Languages</div><p class="txt">${cv.languages.join(' · ')}</p></div>` : ''}
          ${cv.additionalInfo ? `<div class="sec"><div class="sec-sh">Additional Information</div><p class="txt">${cv.additionalInfo}</p></div>` : ''}
        </div>
      </body></html>`

    // ── 5. ACADEMIC ─────────────────────────────────────
    case 'academic':
      return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>${base}
        body { padding:32px 44px; font-family:Georgia,serif; }
        .name { font-size:22pt; font-weight:700; text-align:center; color:#111; letter-spacing:0.3px; }
        .role { font-size:11pt; color:#444; text-align:center; margin-top:4px; }
        .contact-line { font-size:9pt; color:#666; text-align:center; margin-top:4px; }
        .rule { height:1px; background:#333; margin:12px 0; }
        .sec-sh { font-size:11pt; font-weight:700; color:#111; border-bottom:1px solid #333; padding-bottom:3px; margin-bottom:8px; font-variant:small-caps; letter-spacing:0.5px; }
        .sec { margin-bottom:14px; }
        .txt { font-size:10pt; color:#222; line-height:1.7; }
        .deg { font-size:11pt; font-weight:700; color:#111; margin-top:6px; }
        .inst { font-size:10pt; color:#333; font-style:italic; }
        .yr { font-size:9pt; color:#555; margin-bottom:4px; }
        .bul { font-size:10pt; color:#222; padding-left:14px; position:relative; margin-bottom:4px; line-height:1.6; }
        .bul::before { content:'•'; position:absolute; left:3px; }
        .jt { font-size:11pt; font-weight:700; color:#111; margin-top:6px; }
        .co { font-size:10pt; color:#444; font-style:italic; margin-bottom:3px; }
      </style></head><body>
        <div class="name">${cv.fullName}</div>
        <div class="role">${cv.jobTitle}</div>
        <div class="contact-line">${contact(cv)}</div>
        <div class="rule"></div>
        ${cv.summary ? `<div class="sec"><div class="sec-sh">Professional Profile</div><p class="txt">${cv.summary}</p></div>` : ''}
        ${cv.education?.length ? `<div class="sec"><div class="sec-sh">Education</div>
          ${cv.education.map(edu => `
            <div style="margin-bottom:8px">
              <div class="deg">${edu.qualification}, ${edu.field}</div>
              <div class="inst">${edu.institution}, ${edu.endYear}</div>
              ${edu.grade ? `<div class="yr">${edu.grade}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
        ${cv.experience?.length ? `<div class="sec"><div class="sec-sh">Academic & Teaching Experience</div>
          ${cv.experience.map(exp => `
            <div style="margin-bottom:10px">
              <div class="jt">${exp.role}</div>
              <div class="co">${exp.company} · ${exp.startDate} – ${exp.endDate}</div>
              ${exp.bullets.map(b => `<div class="bul">${b}</div>`).join('')}
            </div>`).join('')}
        </div>` : ''}
        ${cv.publications?.length ? `<div class="sec"><div class="sec-sh">Publications</div>
          ${cv.publications.map(p => `<div class="bul">${p}</div>`).join('')}
        </div>` : ''}
        ${cv.research?.length ? `<div class="sec"><div class="sec-sh">Research Interests</div>
          <p class="txt">${cv.research.join(' · ')}</p>
        </div>` : ''}
        ${cv.skills?.length ? `<div class="sec"><div class="sec-sh">Skills & Expertise</div>
          <p class="txt">${skillsHTML(cv)}</p>
        </div>` : ''}
        ${cv.languages?.length ? `<div class="sec"><div class="sec-sh">Languages</div>
          <p class="txt">${languagesHTML(cv)}</p>
        </div>` : ''}
        ${cv.additionalInfo ? `<div class="sec"><div class="sec-sh">Additional Information</div>
          <p class="txt">${additionalHTML(cv)}</p>
        </div>` : ''}
      </body></html>`

    // ── 6. CLEAN (Professional, no colors) ───────────────
    case 'clean':
      return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>${base}
        body { padding:32px 40px; }
        .name { font-size:22pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#111; margin-bottom:6px; }
        .contact { font-size:9.5pt; color:#444; margin-bottom:20px; }
        .sec { margin-bottom:16px; }
        .sec-sh { font-size:10pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#111; border-bottom:1.5px solid #111; padding-bottom:4px; margin-bottom:10px; }
        .txt { font-size:10pt; color:#333; line-height:1.7; }
        .jt { font-size:11pt; font-weight:700; color:#111; margin-top:8px; }
        .co { font-size:9.5pt; color:#444; margin-bottom:4px; }
        .dt { font-size:9pt; color:#777; }
        .bul { font-size:9.5pt; color:#333; padding-left:14px; position:relative; margin-bottom:3px; line-height:1.55; }
        .bul::before { content:'•'; position:absolute; left:3px; }
        .deg { font-size:11pt; font-weight:700; color:#111; }
        .inst { font-size:9.5pt; color:#444; margin-bottom:6px; }
      </style></head><body>
        <div class="name">${cv.fullName}</div>
        <div class="contact">${contact(cv)}</div>
        ${cv.summary ? `<div class="sec"><div class="sec-sh">Professional Summary</div>
          <p class="txt">${cv.summary}</p>
        </div>` : ''}
        ${cv.experience?.length ? `<div class="sec"><div class="sec-sh">Professional Experience</div>
          ${cv.experience.map(exp => `
            <div style="margin-bottom:12px">
              <div class="jt">${exp.role}</div>
              <div class="co">${exp.company} <span class="dt">| ${exp.startDate} – ${exp.endDate}</span></div>
              ${exp.bullets.map(b => `<div class="bul">${b}</div>`).join('')}
            </div>`).join('')}
        </div>` : ''}
        ${cv.education?.length ? `<div class="sec"><div class="sec-sh">Education</div>
          ${cv.education.map(edu => `
            <div style="margin-bottom:8px">
              <div class="deg">${edu.qualification} in ${edu.field}</div>
              <div class="inst">${edu.institution} <span class="dt">| ${edu.startYear}–${edu.endYear}${edu.grade ? ` | ${edu.grade}` : ''}</span></div>
            </div>`).join('')}
        </div>` : ''}
        ${cv.skills?.length ? `<div class="sec"><div class="sec-sh">Skills & Competencies</div>
          <p class="txt">${skillsHTML(cv)}</p>
        </div>` : ''}
        ${cv.languages?.length ? `<div class="sec"><div class="sec-sh">Languages</div>
          <p class="txt">${languagesHTML(cv)}</p>
        </div>` : ''}
        ${cv.additionalInfo ? `<div class="sec"><div class="sec-sh">Additional Information</div>
          <p class="txt">${additionalHTML(cv)}</p>
        </div>` : ''}
      </body></html>`

    // ── 7. EDITORIAL (Magazine-style, warm cream palette) ───
    case 'editorial':
      return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>${base}
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500&display=swap');
        body { font-family:'Inter','DM Sans',Arial,sans-serif; background:#fefdfb; padding:46px 52px; color:#3a3a3a; }
        .kicker { font-size:9pt; color:#9a5f2e; letter-spacing:4pt; font-weight:500; margin-bottom:10px; }
        .name { font-family:'Cormorant Garamond',Georgia,serif; font-size:42pt; font-weight:500; color:#1a1a1a; line-height:1; letter-spacing:-0.5pt; }
        .subtitle { font-family:'Cormorant Garamond',Georgia,serif; font-size:14pt; color:#6b5742; font-style:italic; margin-top:6px; }
        .contact { font-size:9.5pt; color:#9a9588; margin-top:18px; letter-spacing:0.3pt; }
        .rule { height:0.5pt; background:#d9cfbf; margin:24px 0; }
        .row { display:grid; grid-template-columns:110px 1fr; gap:24px; margin-bottom:22px; }
        .label { font-size:9pt; color:#9a5f2e; letter-spacing:2pt; font-weight:500; padding-top:4px; }
        .txt { font-size:11pt; color:#3a3a3a; line-height:1.7; }
        .exp-item { margin-bottom:18px; }
        .exp-item:last-child { margin-bottom:0; }
        .exp-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2px; }
        .role { font-family:'Cormorant Garamond',Georgia,serif; font-size:15pt; font-weight:500; color:#1a1a1a; }
        .dates { font-size:10pt; color:#9a9588; font-style:italic; }
        .company { font-family:'Cormorant Garamond',Georgia,serif; font-size:12pt; color:#6b5742; font-style:italic; margin-bottom:8px; }
        .bullets p { font-size:10.5pt; color:#3a3a3a; line-height:1.7; margin-bottom:4px; padding-left:14px; position:relative; }
        .bullets p::before { content:'—'; position:absolute; left:0; color:#9a5f2e; }
        .edu-item { margin-bottom:14px; }
        .edu-item:last-child { margin-bottom:0; }
        .deg { font-family:'Cormorant Garamond',Georgia,serif; font-size:14pt; font-weight:500; color:#1a1a1a; }
        .inst { font-family:'Cormorant Garamond',Georgia,serif; font-size:11.5pt; color:#6b5742; font-style:italic; }
        .skill-line { font-size:10.5pt; color:#3a3a3a; line-height:1.9; }
      </style></head><body>
        <div class="kicker">CURRICULUM VITAE</div>
        <div class="name">${cv.fullName}</div>
        ${cv.jobTitle ? `<div class="subtitle">${cv.jobTitle}</div>` : ''}
        <div class="contact">${contact(cv).replace(/ · /g, '&nbsp;&nbsp;&nbsp;')}</div>
        <div class="rule"></div>

        ${cv.summary ? `<div class="row">
          <div class="label">SUMMARY</div>
          <div class="txt">${cv.summary}</div>
        </div>` : ''}

        ${cv.coverLetterBody ? `<div class="row">
          <div class="label">LETTER</div>
          <div>${cv.coverLetterBody.split('\n\n').map(p => `<p class="txt" style="margin-bottom:10pt;">${p}</p>`).join('')}</div>
        </div>` : ''}

        ${cv.experience?.length ? `<div class="row">
          <div class="label">EXPERIENCE</div>
          <div>
            ${cv.experience.map(exp => `
              <div class="exp-item">
                <div class="exp-head">
                  <div class="role">${exp.role}</div>
                  <div class="dates">${exp.startDate} — ${exp.endDate}</div>
                </div>
                <div class="company">${exp.company}</div>
                <div class="bullets">${exp.bullets.map(b => `<p>${b}</p>`).join('')}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}

        ${cv.education?.length ? `<div class="row">
          <div class="label">EDUCATION</div>
          <div>
            ${cv.education.map(edu => `
              <div class="edu-item">
                <div class="exp-head">
                  <div class="deg">${edu.qualification} in ${edu.field}</div>
                  <div class="dates">${edu.startYear} — ${edu.endYear}</div>
                </div>
                <div class="inst">${edu.institution}${edu.grade ? ` · <span style="color:#3a3a3a;font-style:normal;">${edu.grade}</span>` : ''}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}

        ${cv.skills?.length ? `<div class="row">
          <div class="label">SKILLS</div>
          <div class="skill-line">${(Array.isArray(cv.skills) ? cv.skills : [cv.skills]).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</div>
        </div>` : ''}

        ${cv.languages?.length ? `<div class="row">
          <div class="label">LANGUAGES</div>
          <div class="skill-line">${cv.languages.join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</div>
        </div>` : ''}

        ${cv.publications?.length ? `<div class="row">
          <div class="label">PUBLICATIONS</div>
          <div class="bullets">${cv.publications.map(p => `<p>${p}</p>`).join('')}</div>
        </div>` : ''}

        ${cv.additionalInfo ? `<div class="row">
          <div class="label">ADDITIONAL</div>
          <div class="txt">${additionalHTML(cv)}</div>
        </div>` : ''}
      </body></html>`

    // ── 8. EXECUTIVE (Deep navy + gold, boardroom) ──────────
    case 'executive':
      return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>${base}
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        body { font-family:'Inter','DM Sans',Arial,sans-serif; color:#1f1f1f; }
        .header { background:#0a1a3a; padding:42px 48px 36px; color:white; }
        .kicker { font-size:9pt; color:#e5c98f; letter-spacing:5pt; font-weight:500; margin-bottom:14px; }
        .name { font-family:'Playfair Display',Georgia,serif; font-size:36pt; font-weight:500; letter-spacing:-0.3pt; line-height:1; margin-bottom:12px; }
        .gold-line { width:72px; height:2pt; background:#c9a05a; margin-bottom:16px; }
        .title { font-family:'Playfair Display',Georgia,serif; font-size:13pt; color:#e5c98f; font-style:italic; margin-bottom:18px; }
        .contact { font-size:10pt; color:#d0d6e0; letter-spacing:0.3pt; }
        .body { padding:32px 48px 40px; }
        .sh { font-family:'Playfair Display',Georgia,serif; font-size:11pt; font-weight:600; text-transform:uppercase; letter-spacing:3pt; color:#0a1a3a; border-bottom:1.5pt solid #c9a05a; padding-bottom:6pt; margin:22px 0 14px; }
        .sh:first-of-type { margin-top:0; }
        .txt { font-size:11pt; color:#1f1f1f; line-height:1.7; }
        .exp-item { margin-bottom:18px; }
        .exp-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:3px; }
        .role { font-family:'Playfair Display',Georgia,serif; font-size:13.5pt; font-weight:600; color:#0a1a3a; }
        .dates { font-size:10pt; color:#6b6b6b; font-style:italic; }
        .company { font-family:'Playfair Display',Georgia,serif; font-size:11.5pt; color:#c9a05a; font-style:italic; margin-bottom:8px; }
        .bullets p { font-size:10.5pt; color:#1f1f1f; line-height:1.65; margin-bottom:4px; padding-left:16px; position:relative; }
        .bullets p::before { content:'•'; position:absolute; left:4px; color:#c9a05a; font-weight:bold; }
        .edu-item { margin-bottom:14px; }
        .deg { font-family:'Playfair Display',Georgia,serif; font-size:13pt; font-weight:600; color:#0a1a3a; }
        .inst { font-family:'Playfair Display',Georgia,serif; font-size:11.5pt; color:#c9a05a; font-style:italic; }
        .skill-line { font-size:10.5pt; color:#1f1f1f; line-height:1.9; }
      </style></head><body>
        <div class="header">
          <div class="kicker">${cv.coverLetterBody ? 'LETTER OF APPLICATION' : 'EXECUTIVE PROFILE'}</div>
          <div class="name">${cv.fullName}</div>
          <div class="gold-line"></div>
          ${cv.jobTitle ? `<div class="title">${cv.jobTitle}</div>` : ''}
          <div class="contact">${contact(cv)}</div>
        </div>

        <div class="body">

          ${cv.summary ? `<div class="sh">Executive Summary</div>
            <p class="txt">${cv.summary}</p>` : ''}

          ${cv.coverLetterBody ? `<div class="sh">Letter</div>
            ${cv.coverLetterBody.split('\n\n').map(p => `<p class="txt" style="margin-bottom:10pt;">${p}</p>`).join('')}` : ''}

          ${cv.experience?.length ? `<div class="sh">Professional Experience</div>
            ${cv.experience.map(exp => `
              <div class="exp-item">
                <div class="exp-head">
                  <div class="role">${exp.role}</div>
                  <div class="dates">${exp.startDate} — ${exp.endDate}</div>
                </div>
                <div class="company">${exp.company}</div>
                <div class="bullets">${exp.bullets.map(b => `<p>${b}</p>`).join('')}</div>
              </div>`).join('')}` : ''}

          ${cv.education?.length ? `<div class="sh">Education</div>
            ${cv.education.map(edu => `
              <div class="edu-item">
                <div class="exp-head">
                  <div class="deg">${edu.qualification} in ${edu.field}</div>
                  <div class="dates">${edu.startYear} — ${edu.endYear}</div>
                </div>
                <div class="inst">${edu.institution}${edu.grade ? ` · <span style="color:#1f1f1f;font-style:normal;">${edu.grade}</span>` : ''}</div>
              </div>`).join('')}` : ''}

          ${cv.skills?.length ? `<div class="sh">Core Competencies</div>
            <div class="skill-line">${(Array.isArray(cv.skills) ? cv.skills : [cv.skills]).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</div>` : ''}

          ${cv.languages?.length ? `<div class="sh">Languages</div>
            <div class="skill-line">${cv.languages.join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</div>` : ''}

          ${cv.publications?.length ? `<div class="sh">Publications</div>
            <div class="bullets">${cv.publications.map(p => `<p>${p}</p>`).join('')}</div>` : ''}

          ${cv.additionalInfo ? `<div class="sh">Additional Information</div>
            <p class="txt">${additionalHTML(cv)}</p>` : ''}

        </div>
      </body></html>`
  }
}
