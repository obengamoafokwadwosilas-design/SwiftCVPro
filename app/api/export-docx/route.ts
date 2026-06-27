export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, HeightRule, ShadingType,
  LevelFormat, convertInchesToTwip, TabStopType, TabStopPosition
} from 'docx'
import { GeneratedCV, TemplateId } from '@/types'
import { buildVertex, buildSovereign, buildMeridianV2, buildAscend, buildHarbour, buildPulse } from './premium'

// ═══════════════════════════════════════════════════════
// PREMIUM TYPOGRAPHY SYSTEM
// All sizes are in HALF-POINTS (DOCX convention)
// 22 = 11pt body | 24 = 12pt | 28 = 14pt | 36 = 18pt | 44 = 22pt
// ═══════════════════════════════════════════════════════
const BODY_FONT = 'Cambria'           // Premium serif for body
const HEADER_FONT = 'Calibri'          // Clean sans for headers
const NAME_FONT_SERIF = 'Cambria'      // For serif templates
const NAME_FONT_SANS = 'Calibri'       // For modern templates

// Sizes (half-points)
const SIZE_NAME = 44       // 22pt
const SIZE_TITLE = 24      // 12pt
const SIZE_CONTACT = 20    // 10pt
const SIZE_SECTION_HEAD = 22  // 11pt bold caps
const SIZE_BODY = 22       // 11pt
const SIZE_ROLE = 24       // 12pt bold
const SIZE_DATES = 20      // 10pt italic
const SIZE_BULLET = 22     // 11pt

// ── Bullet numbering ──────────────────────────────
const numbering = {
  config: [{
    reference: 'bullets',
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: '•',
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360, hanging: 240 } } }
    }]
  }]
}

const NO_BORDERS = {
  top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
}

// ── Helpers ───────────────────────────────────────
const contactStr = (cv: GeneratedCV): string => {
  const parts = [cv.email, cv.phone, cv.location].filter(Boolean)
  if (cv.linkedin) parts.push(cv.linkedin)
  return parts.join('  •  ')
}

// ═══════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { cv, templateId, accentColor } = await req.json() as { cv: GeneratedCV; templateId: TemplateId; accentColor?: string | null }
    if (!cv) return NextResponse.json({ error: 'No CV data' }, { status: 400 })

    const doc = buildDocument(cv, templateId, accentColor)
    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${cv.fullName.replace(/\s+/g, '_')}_CV.docx"`,
      },
    })
  } catch (error: any) {
    console.error('DOCX export error:', error)
    return NextResponse.json({ error: 'Failed to generate Word document' }, { status: 500 })
  }
}

function buildDocument(cv: GeneratedCV, templateId: TemplateId, accentColor?: string | null): Document {
  // Map each premium template to its signature accent for the flagship builder
  const accentFor: Partial<Record<TemplateId, string>> = {
    meridian: '0a1f44',
    newyork:  'a01e1e',
    atelier:  '3b0a45',
    graduate: 'dc6e3a',
    europass: '1e3a8a',
  }

    switch (templateId) {
    // ── 5 PREMIUM DESIGNS (match CVPreview.tsx PDF designs) ──
    case 'vertex':
    case 'atelier':
    case 'editorial':
      return buildVertex(cv, accentColor)

    case 'sovereign':
    case 'newyork':
    case 'executive':
      return buildSovereign(cv, accentColor)

    case 'meridian':
    case 'modern':
    case 'europass':
    case 'graduate':
    case 'nordic':
      return buildMeridianV2(cv, accentColor)

    case 'ascend':
      return buildAscend(cv, accentColor)

    case 'harbour':
      return buildHarbour(cv, accentColor)

    case 'pulse':
    case 'noir':
      return buildPulse(cv, accentColor)

    // ── ATS single-column ──
    case 'london':    return buildAscend(cv, accentColor)
    case 'classic':   return buildClassic(cv)
    case 'academic':  return buildSovereign(cv, accentColor)

    default:
      return buildClassic(cv)
  }
}

// ═══════════════════════════════════════════════════════
// 1. CLASSIC — Cambria body, centred name, line-divider headers
// The safest, most universally recruiter-friendly design
// ═══════════════════════════════════════════════════════
function buildClassic(cv: GeneratedCV): Document {
  const sectionHead = (text: string) => new Paragraph({
    children: [new TextRun({
      text: text.toUpperCase(),
      bold: true,
      size: SIZE_SECTION_HEAD,
      font: HEADER_FONT,
      color: '1a1a1a',
      characterSpacing: 30
    })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1a1a1a' } },
    spacing: { before: 280, after: 140 }
  })

  const children: Paragraph[] = []

  // ── HEADER ──
  children.push(new Paragraph({
    children: [new TextRun({ text: cv.fullName, bold: true, size: SIZE_NAME, font: NAME_FONT_SERIF, color: '0a0a0a' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 }
  }))

  if (cv.jobTitle) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.jobTitle, size: SIZE_TITLE, font: BODY_FONT, color: '4a4a4a', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }))
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: contactStr(cv), size: SIZE_CONTACT, font: BODY_FONT, color: '5a5a5a' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 }
  }))

  // ── COVER LETTER (if present) ──
  if (cv.coverLetterBody) {
    cv.coverLetterBody.split('\n\n').forEach(para => {
      children.push(new Paragraph({
        children: [new TextRun({ text: para, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
        spacing: { after: 200, line: 320 },
        alignment: AlignmentType.JUSTIFIED
      }))
    })
    return wrapDoc(children)
  }

  // ── SUMMARY ──
  if (cv.summary) {
    children.push(sectionHead('Professional Summary'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.summary, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 320 },
      alignment: AlignmentType.JUSTIFIED
    }))
  }

  // ── EXPERIENCE ──
  if (cv.experience?.length) {
    children.push(sectionHead('Professional Experience'))
    cv.experience.forEach((exp, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.role, bold: true, size: SIZE_ROLE, font: BODY_FONT, color: '0a0a0a' }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${exp.startDate} – ${exp.endDate}`, size: SIZE_DATES, font: BODY_FONT, color: '6a6a6a', italics: true }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 200, after: 40 }
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: exp.company, size: SIZE_BODY, font: BODY_FONT, color: '4a4a4a', italics: true })],
        spacing: { after: 80 }
      }))
      exp.bullets.forEach(b => children.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: b, size: SIZE_BULLET, font: BODY_FONT, color: '1a1a1a' })],
        spacing: { after: 60, line: 300 }
      })))
    })
  }

  // ── EDUCATION ──
  if (cv.education?.length) {
    children.push(sectionHead('Education'))
    cv.education.forEach((edu, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.qualification} in ${edu.field}`, bold: true, size: SIZE_ROLE, font: BODY_FONT, color: '0a0a0a' }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${edu.startYear} – ${edu.endYear}`, size: SIZE_DATES, font: BODY_FONT, color: '6a6a6a', italics: true }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 160, after: 40 }
      }))
      children.push(new Paragraph({
        children: [
          new TextRun({ text: edu.institution, size: SIZE_BODY, font: BODY_FONT, color: '4a4a4a', italics: true }),
          ...(edu.grade ? [new TextRun({ text: ` — ${edu.grade}`, size: SIZE_BODY, font: BODY_FONT, color: '4a4a4a' })] : [])
        ],
        spacing: { after: 80 }
      }))
    })
  }

  // ── SKILLS ──
  if (cv.skills?.length) {
    children.push(sectionHead('Core Skills'))
    const skillsText = Array.isArray(cv.skills) ? cv.skills.join('  •  ') : cv.skills
    children.push(new Paragraph({
      children: [new TextRun({ text: skillsText, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 340 }
    }))
  }

  // ── LANGUAGES ──
  if (cv.languages?.length) {
    children.push(sectionHead('Languages'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.languages.join('  •  '), size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100 }
    }))
  }

  // ── ADDITIONAL ──
  if (cv.additionalInfo) {
    children.push(sectionHead('Additional Information'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.additionalInfo, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 320 }
    }))
  }

  return wrapDoc(children)
}

// ═══════════════════════════════════════════════════════
// 2. MODERN — Calibri body, left-aligned, blue accent line
// Clean and contemporary — works for any industry
// ═══════════════════════════════════════════════════════
function buildModern(cv: GeneratedCV): Document {
  const ACCENT = '1a56c4'  // Professional blue

  const sectionHead = (text: string) => new Paragraph({
    children: [new TextRun({
      text: text.toUpperCase(),
      bold: true,
      size: SIZE_SECTION_HEAD,
      font: HEADER_FONT,
      color: ACCENT,
      characterSpacing: 40
    })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT } },
    spacing: { before: 280, after: 140 }
  })

  const children: Paragraph[] = []

  // ── HEADER ──
  children.push(new Paragraph({
    children: [new TextRun({ text: cv.fullName, bold: true, size: SIZE_NAME, font: NAME_FONT_SANS, color: '0a0a0a' })],
    spacing: { after: 60 }
  }))

  if (cv.jobTitle) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.jobTitle, size: SIZE_TITLE, font: HEADER_FONT, color: ACCENT })],
      spacing: { after: 100 }
    }))
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: contactStr(cv), size: SIZE_CONTACT, font: HEADER_FONT, color: '5a5a5a' })],
    spacing: { after: 240 }
  }))

  // ── COVER LETTER ──
  if (cv.coverLetterBody) {
    cv.coverLetterBody.split('\n\n').forEach(para => {
      children.push(new Paragraph({
        children: [new TextRun({ text: para, size: SIZE_BODY, font: HEADER_FONT, color: '1a1a1a' })],
        spacing: { after: 200, line: 320 }
      }))
    })
    return wrapDoc(children)
  }

  // ── SUMMARY ──
  if (cv.summary) {
    children.push(sectionHead('Profile'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.summary, size: SIZE_BODY, font: HEADER_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 320 }
    }))
  }

  // ── EXPERIENCE ──
  if (cv.experience?.length) {
    children.push(sectionHead('Experience'))
    cv.experience.forEach((exp, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.role, bold: true, size: SIZE_ROLE, font: HEADER_FONT, color: '0a0a0a' }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${exp.startDate} – ${exp.endDate}`, size: SIZE_DATES, font: HEADER_FONT, color: '6a6a6a' }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 200, after: 40 }
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: exp.company, size: SIZE_BODY, font: HEADER_FONT, color: ACCENT, italics: true })],
        spacing: { after: 80 }
      }))
      exp.bullets.forEach(b => children.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: b, size: SIZE_BULLET, font: HEADER_FONT, color: '1a1a1a' })],
        spacing: { after: 60, line: 300 }
      })))
    })
  }

  // ── EDUCATION ──
  if (cv.education?.length) {
    children.push(sectionHead('Education'))
    cv.education.forEach((edu, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.qualification} in ${edu.field}`, bold: true, size: SIZE_ROLE, font: HEADER_FONT, color: '0a0a0a' }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${edu.startYear} – ${edu.endYear}`, size: SIZE_DATES, font: HEADER_FONT, color: '6a6a6a' }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 160, after: 40 }
      }))
      children.push(new Paragraph({
        children: [
          new TextRun({ text: edu.institution, size: SIZE_BODY, font: HEADER_FONT, color: ACCENT, italics: true }),
          ...(edu.grade ? [new TextRun({ text: ` — ${edu.grade}`, size: SIZE_BODY, font: HEADER_FONT, color: '4a4a4a' })] : [])
        ],
        spacing: { after: 80 }
      }))
    })
  }

  // ── SKILLS ──
  if (cv.skills?.length) {
    children.push(sectionHead('Skills'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.skills.join('  •  '), size: SIZE_BODY, font: HEADER_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 340 }
    }))
  }

  if (cv.languages?.length) {
    children.push(sectionHead('Languages'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.languages.join('  •  '), size: SIZE_BODY, font: HEADER_FONT, color: '1a1a1a' })],
      spacing: { after: 100 }
    }))
  }

  if (cv.additionalInfo) {
    children.push(sectionHead('Additional Information'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.additionalInfo, size: SIZE_BODY, font: HEADER_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 320 }
    }))
  }

  return wrapDoc(children)
}

// ═══════════════════════════════════════════════════════
// 3. EXECUTIVE — Cambria body, navy + gold accents
// For senior leaders, directors, executives
// ═══════════════════════════════════════════════════════
function buildExecutive(cv: GeneratedCV): Document {
  const NAVY = '0a1a3a'
  const GOLD = 'a87b00'

  const sectionHead = (text: string) => new Paragraph({
    children: [new TextRun({
      text: text.toUpperCase(),
      bold: true,
      size: SIZE_SECTION_HEAD,
      font: HEADER_FONT,
      color: NAVY,
      characterSpacing: 60
    })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
    spacing: { before: 280, after: 140 }
  })

  const children: Paragraph[] = []

  // ── HEADER ──
  children.push(new Paragraph({
    children: [new TextRun({ text: cv.fullName, bold: true, size: SIZE_NAME, font: NAME_FONT_SERIF, color: NAVY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 }
  }))

  // Gold separator line
  children.push(new Paragraph({
    children: [new TextRun({ text: '', size: 8 })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: GOLD } },
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 }
  }))

  if (cv.jobTitle) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.jobTitle, size: SIZE_TITLE, font: BODY_FONT, color: GOLD, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }))
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: contactStr(cv), size: SIZE_CONTACT, font: BODY_FONT, color: '4a4a4a' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 }
  }))

  // ── COVER LETTER ──
  if (cv.coverLetterBody) {
    cv.coverLetterBody.split('\n\n').forEach(para => {
      children.push(new Paragraph({
        children: [new TextRun({ text: para, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
        spacing: { after: 200, line: 320 },
        alignment: AlignmentType.JUSTIFIED
      }))
    })
    return wrapDoc(children)
  }

  if (cv.summary) {
    children.push(sectionHead('Executive Summary'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.summary, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 320 },
      alignment: AlignmentType.JUSTIFIED
    }))
  }

  if (cv.experience?.length) {
    children.push(sectionHead('Professional Experience'))
    cv.experience.forEach((exp, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.role, bold: true, size: SIZE_ROLE, font: BODY_FONT, color: NAVY }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${exp.startDate} – ${exp.endDate}`, size: SIZE_DATES, font: BODY_FONT, color: '6a6a6a', italics: true }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 200, after: 40 }
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: exp.company, size: SIZE_BODY, font: BODY_FONT, color: GOLD, italics: true })],
        spacing: { after: 80 }
      }))
      exp.bullets.forEach(b => children.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: b, size: SIZE_BULLET, font: BODY_FONT, color: '1a1a1a' })],
        spacing: { after: 60, line: 300 }
      })))
    })
  }

  if (cv.education?.length) {
    children.push(sectionHead('Education'))
    cv.education.forEach((edu, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.qualification} in ${edu.field}`, bold: true, size: SIZE_ROLE, font: BODY_FONT, color: NAVY }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${edu.startYear} – ${edu.endYear}`, size: SIZE_DATES, font: BODY_FONT, color: '6a6a6a', italics: true }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 160, after: 40 }
      }))
      children.push(new Paragraph({
        children: [
          new TextRun({ text: edu.institution, size: SIZE_BODY, font: BODY_FONT, color: GOLD, italics: true }),
          ...(edu.grade ? [new TextRun({ text: ` — ${edu.grade}`, size: SIZE_BODY, font: BODY_FONT, color: '4a4a4a' })] : [])
        ],
        spacing: { after: 80 }
      }))
    })
  }

  if (cv.skills?.length) {
    children.push(sectionHead('Core Competencies'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.skills.join('  •  '), size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 340 }
    }))
  }

  if (cv.languages?.length) {
    children.push(sectionHead('Languages'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.languages.join('  •  '), size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100 }
    }))
  }

  if (cv.additionalInfo) {
    children.push(sectionHead('Additional Information'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.additionalInfo, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 320 }
    }))
  }

  return wrapDoc(children)
}

// ═══════════════════════════════════════════════════════
// 4. ACADEMIC — Full Cambria, scholarly format
// For researchers, lecturers, postgrad applicants
// ═══════════════════════════════════════════════════════
function buildAcademic(cv: GeneratedCV): Document {
  const sectionHead = (text: string) => new Paragraph({
    children: [new TextRun({
      text: text,
      bold: true,
      size: SIZE_SECTION_HEAD,
      font: BODY_FONT,
      color: '1a1a1a',
      smallCaps: true
    })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1a1a1a' } },
    spacing: { before: 280, after: 140 }
  })

  const children: Paragraph[] = []

  children.push(new Paragraph({
    children: [new TextRun({ text: cv.fullName, bold: true, size: SIZE_NAME, font: BODY_FONT, color: '0a0a0a' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 }
  }))

  if (cv.jobTitle) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.jobTitle, size: SIZE_TITLE, font: BODY_FONT, color: '4a4a4a', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }))
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: contactStr(cv), size: SIZE_CONTACT, font: BODY_FONT, color: '5a5a5a' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 }
  }))

  if (cv.summary) {
    children.push(sectionHead('Research Profile'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.summary, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 320 },
      alignment: AlignmentType.JUSTIFIED
    }))
  }

  if (cv.education?.length) {
    children.push(sectionHead('Education'))
    cv.education.forEach((edu, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.qualification} in ${edu.field}`, bold: true, size: SIZE_ROLE, font: BODY_FONT, color: '0a0a0a' }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${edu.startYear} – ${edu.endYear}`, size: SIZE_DATES, font: BODY_FONT, color: '6a6a6a', italics: true }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 160, after: 40 }
      }))
      children.push(new Paragraph({
        children: [
          new TextRun({ text: edu.institution, size: SIZE_BODY, font: BODY_FONT, color: '4a4a4a', italics: true }),
          ...(edu.grade ? [new TextRun({ text: ` — ${edu.grade}`, size: SIZE_BODY, font: BODY_FONT, color: '4a4a4a' })] : [])
        ],
        spacing: { after: 80 }
      }))
    })
  }

  if (cv.experience?.length) {
    children.push(sectionHead('Academic & Professional Experience'))
    cv.experience.forEach((exp, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.role, bold: true, size: SIZE_ROLE, font: BODY_FONT, color: '0a0a0a' }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${exp.startDate} – ${exp.endDate}`, size: SIZE_DATES, font: BODY_FONT, color: '6a6a6a', italics: true }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 200, after: 40 }
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: exp.company, size: SIZE_BODY, font: BODY_FONT, color: '4a4a4a', italics: true })],
        spacing: { after: 80 }
      }))
      exp.bullets.forEach(b => children.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: b, size: SIZE_BULLET, font: BODY_FONT, color: '1a1a1a' })],
        spacing: { after: 60, line: 300 }
      })))
    })
  }

  if (cv.publications?.length) {
    children.push(sectionHead('Publications'))
    cv.publications.forEach(p => children.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: p, size: SIZE_BULLET, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 80, line: 300 }
    })))
  }

  if (cv.research?.length) {
    children.push(sectionHead('Research'))
    cv.research.forEach(r => children.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: r, size: SIZE_BULLET, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 80, line: 300 }
    })))
  }

  if (cv.teaching?.length) {
    children.push(sectionHead('Teaching'))
    cv.teaching.forEach(t => children.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: t, size: SIZE_BULLET, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 60, line: 300 }
    })))
  }

  if (cv.skills?.length) {
    children.push(sectionHead('Research Methods & Skills'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.skills.join('  •  '), size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 340 }
    }))
  }

  if (cv.languages?.length) {
    children.push(sectionHead('Languages'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.languages.join('  •  '), size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100 }
    }))
  }

  if (cv.additionalInfo) {
    children.push(sectionHead('Memberships, Honours & Awards'))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.additionalInfo, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 100, line: 320 }
    }))
  }

  return wrapDoc(children)
}

// ── Document wrapper with proper margins ──────────
function wrapDoc(children: Paragraph[]): Document {
  return new Document({
    numbering,
    styles: {
      default: {
        document: { run: { font: BODY_FONT, size: SIZE_BODY } }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.7),
            right: convertInchesToTwip(0.75),
            bottom: convertInchesToTwip(0.7),
            left: convertInchesToTwip(0.75),
          }
        }
      },
      children
    }]
  })
}
