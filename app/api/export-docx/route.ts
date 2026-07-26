export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { extraSectionParagraphs } from './_extra'
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, HeightRule, ShadingType,
  LevelFormat, convertInchesToTwip, TabStopType, TabStopPosition, VerticalAlign
} from 'docx'
import { GeneratedCV, TemplateId } from '@/types'
import { buildVertex, buildSovereign, buildMeridianV2, buildAscend, buildHarbour, buildPulse, buildAurora } from './premium'
import { formatLetterDate } from '@/lib/coverLetter'
import { rateLimit, clientIp } from '@/lib/rateLimit'

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
    const rl = rateLimit(`export-docx:${clientIp(req)}`, 40, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many downloads in a short time. Please wait a moment and try again.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })
    }

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
  // A cover letter is a plain formal letter — the template choice is irrelevant,
  // so every cover letter uses one traditional Ghanaian layout regardless of
  // the templateId sent.
  if (cv.coverLetterBody) return buildFormalCoverLetter(cv)

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
      return buildEditorial(cv, accentColor)

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
    case 'classic':   return buildClassic(cv, accentColor)
    case 'academic':  return buildSovereign(cv, accentColor)

    // ── Matched single-column designs (dedicated builders, look like the PDF) ──
    case 'slate':     return buildSlate(cv, accentColor)
    case 'metro':     return buildAurora(cv, accentColor || '#7c3aed')
    case 'prestige':  return buildExecutive(cv)
    case 'compass':   return buildCompass(cv, accentColor)
    case 'beacon':    return buildBeacon(cv, accentColor)

    // atlas (timeline rail) and sterling (dark two-column sidebar) are PDF-only —
    // their layouts can't be faithfully reproduced in Word — so the UI never
    // requests a .docx for them. These fallbacks exist only for safety.
    case 'sterling':  return buildMeridianV2(cv, accentColor)
    case 'atlas':     return buildAscend(cv, accentColor)

    default:
      return buildClassic(cv, accentColor)
  }
}

// ═══════════════════════════════════════════════════════
// COVER LETTER — traditional Ghanaian formal application letter.
// Sender block (right) + today's date, recipient block, bold underlined
// subject, salutation, justified body, and a signed-off name. Plain by
// design — must match the on-screen/PDF layout in CVPreview.tsx.
// ═══════════════════════════════════════════════════════
function buildFormalCoverLetter(cv: GeneratedCV): Document {
  const FONT = 'Cambria'
  const right = (text: string, opts: { bold?: boolean } = {}) =>
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 40 }, children: [new TextRun({ text, font: FONT, size: 22, bold: opts.bold })] })
  const line = (text: string, opts: { bold?: boolean; after?: number } = {}) =>
    new Paragraph({ spacing: { after: opts.after ?? 40 }, children: [new TextRun({ text, font: FONT, size: 22, bold: opts.bold })] })

  const children: Paragraph[] = []

  // Sender block + date (right-aligned)
  children.push(right(cv.fullName, { bold: true }))
  if (cv.location) children.push(right(cv.location))
  if (cv.email) children.push(right(`Email: ${cv.email}`))
  if (cv.phone) children.push(right(`Tel: ${cv.phone}`))
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 160, after: 260 }, children: [new TextRun({ text: formatLetterDate(), font: FONT, size: 22 })] }))

  // Recipient block (left)
  const recipient = cv.clRecipient?.length ? cv.clRecipient : ['The Human Resource Manager']
  recipient.forEach((l, i) => children.push(line(l, { bold: i === 0 })))

  // Salutation
  children.push(new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: cv.clSalutation || 'Dear Sir/Madam,', font: FONT, size: 22 })] }))

  // Subject — bold + underlined
  if (cv.clSubject) {
    children.push(new Paragraph({ spacing: { after: 220 }, children: [new TextRun({ text: cv.clSubject, font: FONT, size: 22, bold: true, underline: {} })] }))
  }

  // Body — justified
  ;(cv.coverLetterBody || '').split('\n\n').forEach(p =>
    children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200, line: 320 }, children: [new TextRun({ text: p, font: FONT, size: 22 })] })))

  // Sign-off + name
  children.push(new Paragraph({ spacing: { before: 220, after: 400 }, children: [new TextRun({ text: cv.clSignOff || 'Yours faithfully,', font: FONT, size: 22 })] }))
  children.push(new Paragraph({ children: [new TextRun({ text: (cv.fullName || '').toUpperCase(), font: FONT, size: 22, bold: true })] }))

  return new Document({
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1), right: convertInchesToTwip(1) } } },
      children,
    }],
  })
}

// ═══════════════════════════════════════════════════════
// 1. CLASSIC — Cambria body, centred name, line-divider headers
// The safest, most universally recruiter-friendly design
// ═══════════════════════════════════════════════════════
function buildClassic(cv: GeneratedCV, accentColor?: string | null): Document {
  // Accent tints the section headings + rule; defaults to near-black so the
  // classic look is unchanged when no colour is picked. Matches the PDF classic
  // design, whose 'rule' headings use the same accent.
  const ACCENT = (accentColor || '#1a1a1a').replace('#', '')
  const sectionHead = (text: string) => new Paragraph({
    children: [new TextRun({
      text: text.toUpperCase(),
      bold: true,
      size: SIZE_SECTION_HEAD,
      font: HEADER_FONT,
      color: ACCENT,
      characterSpacing: 30
    })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT } },
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
  extraSectionParagraphs(cv, sectionHead, { size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' }).forEach(pp => children.push(pp))

  return wrapDoc(children)
}

// ═══════════════════════════════════════════════════════
// SLATE — minimalist, left-aligned, wide letter-spacing, no heading rules.
// Matches the Slate PDF design: monochrome by default, section headings
// tinted by the accent so the colour picker has a real (subtle) effect.
// ═══════════════════════════════════════════════════════
function buildSlate(cv: GeneratedCV, accentColor?: string | null): Document {
  const ACCENT = (accentColor || '#1a1a1a').replace('#', '')
  const sectionHead = (text: string) => new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, font: BODY_FONT, color: ACCENT, characterSpacing: 70 })],
    spacing: { before: 320, after: 120 }
  })

  const children: (Paragraph | Table)[] = []

  // ── HEADER (left-aligned, wide tracking) ──
  children.push(new Paragraph({
    children: [new TextRun({ text: cv.fullName.toUpperCase(), size: 40, font: BODY_FONT, color: '1a1a1a', characterSpacing: 120 })],
    spacing: { after: cv.jobTitle ? 70 : 40 }
  }))
  if (cv.jobTitle) children.push(new Paragraph({
    children: [new TextRun({ text: cv.jobTitle.toUpperCase(), size: 18, font: BODY_FONT, color: '888888', characterSpacing: 80 })],
    spacing: { after: 90 }
  }))
  // Short rule (narrow table cell with a bottom border) — mirrors the PDF's 36px bar.
  children.push(new Table({
    width: { size: 700, type: WidthType.DXA }, columnWidths: [700], borders: NO_BORDERS,
    rows: [new TableRow({ children: [new TableCell({ width: { size: 700, type: WidthType.DXA }, borders: { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 10, color: '1a1a1a' } }, children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })] })] })]
  }))
  children.push(new Paragraph({
    children: [new TextRun({ text: contactStr(cv), size: 19, font: BODY_FONT, color: '999999', characterSpacing: 20 })],
    spacing: { before: 120, after: 240 }
  }))

  // ── COVER LETTER ──
  if (cv.coverLetterBody) {
    cv.coverLetterBody.split('\n\n').forEach(para => children.push(new Paragraph({
      children: [new TextRun({ text: para, size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' })],
      spacing: { after: 200, line: 340 }, alignment: AlignmentType.JUSTIFIED
    })))
    return wrapDoc(children)
  }

  // ── SUMMARY ──
  if (cv.summary) {
    children.push(sectionHead('Profile'))
    children.push(new Paragraph({ children: [new TextRun({ text: cv.summary, size: SIZE_BODY, font: BODY_FONT, color: '555555' })], spacing: { after: 100, line: 360 }, alignment: AlignmentType.JUSTIFIED }))
  }

  // ── EXPERIENCE ──
  if (cv.experience?.length) {
    children.push(sectionHead('Experience'))
    cv.experience.forEach((exp, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.role, bold: true, size: SIZE_ROLE, font: BODY_FONT, color: '1a1a1a' }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${exp.startDate} – ${exp.endDate}`, size: SIZE_DATES, font: BODY_FONT, color: 'bbbbbb', italics: true }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 220, after: 30 }
      }))
      children.push(new Paragraph({ children: [new TextRun({ text: exp.company, size: SIZE_BODY, font: BODY_FONT, color: '888888' })], spacing: { after: 90 } }))
      exp.bullets.forEach(b => children.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: b, size: SIZE_BULLET, font: BODY_FONT, color: '555555' })],
        spacing: { after: 70, line: 320 }
      })))
    })
  }

  // ── EDUCATION ──
  if (cv.education?.length) {
    children.push(sectionHead('Education'))
    cv.education.forEach((edu, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.qualification} in ${edu.field}`, bold: true, size: SIZE_ROLE, font: BODY_FONT, color: '1a1a1a' }),
          new TextRun({ text: '\t', size: SIZE_ROLE }),
          new TextRun({ text: `${edu.startYear} – ${edu.endYear}`, size: SIZE_DATES, font: BODY_FONT, color: 'bbbbbb', italics: true }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: idx === 0 ? 0 : 160, after: 30 }
      }))
      children.push(new Paragraph({ children: [new TextRun({ text: `${edu.institution}${edu.grade ? ` — ${edu.grade}` : ''}`, size: SIZE_BODY, font: BODY_FONT, color: '888888' })], spacing: { after: 80 } }))
    })
  }

  // ── SKILLS ──
  if (cv.skills?.length) {
    children.push(sectionHead('Skills'))
    children.push(new Paragraph({ children: [new TextRun({ text: cv.skills.join('   •   '), size: SIZE_BODY, font: BODY_FONT, color: '555555' })], spacing: { after: 100, line: 360 } }))
  }

  // ── LANGUAGES ──
  if (cv.languages?.length) {
    children.push(sectionHead('Languages'))
    children.push(new Paragraph({ children: [new TextRun({ text: cv.languages.join('   •   '), size: SIZE_BODY, font: BODY_FONT, color: '555555' })], spacing: { after: 100 } }))
  }

  extraSectionParagraphs(cv, sectionHead, { size: SIZE_BODY, font: BODY_FONT, color: '555555' }).forEach(pp => children.push(pp))

  return wrapDoc(children)
}

// ═══════════════════════════════════════════════════════
// Shared single-column composer — header + all sections, given a heading
// renderer (a Paragraph or Table). Used by Compass & Beacon so their bodies
// are identical and only the heading treatment differs.
// ═══════════════════════════════════════════════════════
type ComposeOpts = { center: boolean; bodyFont: string; nameFont: string; nameColor: string; titleUsesAccent: boolean; customHeader?: () => (Paragraph | Table)[] }
function composeSingleColumn(cv: GeneratedCV, heading: (t: string) => Paragraph | Table, ACCENT: string, opts: ComposeOpts): Document {
  const align = opts.center ? AlignmentType.CENTER : AlignmentType.LEFT
  const children: (Paragraph | Table)[] = []

  // customHeader lets a template supply its own masthead (Editorial). Templates
  // that don't pass one keep the standard name/title/contact header unchanged.
  if (opts.customHeader) {
    opts.customHeader().forEach(p => children.push(p))
  } else {
    children.push(new Paragraph({ alignment: align, children: [new TextRun({ text: cv.fullName, bold: true, size: SIZE_NAME, font: opts.nameFont, color: opts.nameColor })], spacing: { after: 60 } }))
    if (cv.jobTitle) children.push(new Paragraph({ alignment: align, children: [new TextRun({ text: cv.jobTitle, size: SIZE_TITLE, font: opts.bodyFont, color: opts.titleUsesAccent ? ACCENT : '4a4a4a', bold: opts.titleUsesAccent, italics: !opts.titleUsesAccent })], spacing: { after: 80 } }))
    children.push(new Paragraph({ alignment: align, children: [new TextRun({ text: contactStr(cv), size: SIZE_CONTACT, font: opts.bodyFont, color: '5a5a5a' })], spacing: { after: 240 } }))
  }

  if (cv.coverLetterBody) {
    cv.coverLetterBody.split('\n\n').forEach(p => children.push(new Paragraph({ children: [new TextRun({ text: p, size: SIZE_BODY, font: opts.bodyFont, color: '1a1a1a' })], spacing: { after: 200, line: 320 }, alignment: AlignmentType.JUSTIFIED })))
    return wrapDoc(children)
  }

  const gapB = () => new Paragraph({ spacing: { before: 220 }, children: [new TextRun({ text: '', size: 2 })] })
  const gapA = () => new Paragraph({ spacing: { after: 90 }, children: [new TextRun({ text: '', size: 2 })] })
  const bullet = (t: string) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: t, size: SIZE_BULLET, font: opts.bodyFont, color: '333333' })], spacing: { after: 60, line: 300 } })
  const sect = (title: string, content: () => void) => { children.push(gapB()); children.push(heading(title)); children.push(gapA()); content() }

  if (cv.summary) sect('Profile', () => children.push(new Paragraph({ children: [new TextRun({ text: cv.summary, size: SIZE_BODY, font: opts.bodyFont, color: '333333' })], spacing: { after: 80, line: 320 }, alignment: AlignmentType.JUSTIFIED })))
  if (cv.experience?.length) sect('Professional Experience', () => cv.experience.forEach((e, i) => {
    children.push(new Paragraph({ children: [new TextRun({ text: e.role, bold: true, size: SIZE_ROLE, font: opts.bodyFont, color: '0a0a0a' }), new TextRun({ text: '\t', size: SIZE_ROLE }), new TextRun({ text: `${e.startDate} – ${e.endDate}`, size: SIZE_DATES, font: opts.bodyFont, color: '6a6a6a', italics: true })], tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }], spacing: { before: i === 0 ? 0 : 200, after: 40 } }))
    children.push(new Paragraph({ children: [new TextRun({ text: e.company, size: SIZE_BODY, font: opts.bodyFont, color: ACCENT, bold: true })], spacing: { after: 80 } }))
    e.bullets.forEach(b => children.push(bullet(b)))
  }))
  if (cv.education?.length) sect('Education', () => cv.education.forEach((e, i) => {
    children.push(new Paragraph({ children: [new TextRun({ text: `${e.qualification} in ${e.field}`, bold: true, size: SIZE_ROLE, font: opts.bodyFont, color: '0a0a0a' }), new TextRun({ text: '\t', size: SIZE_ROLE }), new TextRun({ text: `${e.startYear} – ${e.endYear}`, size: SIZE_DATES, font: opts.bodyFont, color: '6a6a6a', italics: true })], tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }], spacing: { before: i === 0 ? 0 : 160, after: 40 } }))
    children.push(new Paragraph({ children: [new TextRun({ text: `${e.institution}${e.grade ? ` — ${e.grade}` : ''}`, size: SIZE_BODY, font: opts.bodyFont, color: '4a4a4a', italics: true })], spacing: { after: 80 } }))
  }))
  if (cv.skills?.length) sect('Core Skills', () => children.push(new Paragraph({ children: [new TextRun({ text: cv.skills.join('   •   '), size: SIZE_BODY, font: opts.bodyFont, color: '333333' })], spacing: { after: 100, line: 340 } })))
  if (cv.languages?.length) sect('Languages', () => children.push(new Paragraph({ children: [new TextRun({ text: cv.languages!.join('   •   '), size: SIZE_BODY, font: opts.bodyFont, color: '333333' })], spacing: { after: 100 } })))
  if (cv.publications?.length) sect('Publications', () => cv.publications!.forEach(p => children.push(bullet(p))))
  if (cv.research?.length) sect('Research', () => cv.research!.forEach(r => children.push(bullet(r))))
  if (cv.teaching?.length) sect('Teaching Experience', () => cv.teaching!.forEach(t => children.push(bullet(t))))
  extraSectionParagraphs(cv, heading, { size: SIZE_BODY, font: opts.bodyFont, color: '333333' }).forEach(pp => children.push(pp))

  return wrapDoc(children)
}

// ═══════════════════════════════════════════════════════
// COMPASS — centred name, headings flanked by rules (matches PDF 'compass')
// ═══════════════════════════════════════════════════════
function buildCompass(cv: GeneratedCV, accentColor?: string | null): Document {
  const ACCENT = (accentColor || '#64748b').replace('#', '')
  const heading = (text: string) => new Table({
    width: { size: 10200, type: WidthType.DXA }, columnWidths: [2400, 5400, 2400], borders: NO_BORDERS,
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 2400, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT } }, children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })] }),
      new TableCell({ width: { size: 5400, type: WidthType.DXA }, borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, font: HEADER_FONT, color: '1a1a1a', characterSpacing: 40 })] })] }),
      new TableCell({ width: { size: 2400, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT } }, children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })] }),
    ] })]
  })
  return composeSingleColumn(cv, heading, ACCENT, { center: true, bodyFont: BODY_FONT, nameFont: NAME_FONT_SERIF, nameColor: '1a1a1a', titleUsesAccent: false })
}

// ═══════════════════════════════════════════════════════
// BEACON — centred name, filled "tab" headings + rule (matches PDF 'beacon')
// ═══════════════════════════════════════════════════════
function buildBeacon(cv: GeneratedCV, accentColor?: string | null): Document {
  const ACCENT = (accentColor || '#2563eb').replace('#', '')
  const heading = (text: string) => new Table({
    width: { size: 10200, type: WidthType.DXA }, columnWidths: [3200, 7000], borders: NO_BORDERS,
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 3200, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: ACCENT, color: ACCENT }, verticalAlign: VerticalAlign.CENTER, margins: { top: 50, bottom: 50, left: 130, right: 130 }, children: [new Paragraph({ children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color: 'FFFFFF', font: HEADER_FONT, characterSpacing: 20 })] })] }),
      new TableCell({ width: { size: 7000, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 10, color: ACCENT } }, margins: { left: 120 }, children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })] }),
    ] })]
  })
  return composeSingleColumn(cv, heading, ACCENT, { center: true, bodyFont: HEADER_FONT, nameFont: NAME_FONT_SANS, nameColor: '1a2b4a', titleUsesAccent: true })
}

// ═══════════════════════════════════════════════════════
// EDITORIAL — magazine masthead: heavy accent bar, split-weight name, and
// section headings sitting under a thick accent rule. Matches the PDF
// 'editorial' design (id: vertex).
// ═══════════════════════════════════════════════════════
function buildEditorial(cv: GeneratedCV, accentColor?: string | null): Document {
  const ACCENT = (accentColor || '#e0533d').replace('#', '')
  // Thick top border above the heading text = the PDF's accent rule above it.
  const heading = (text: string) => new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 24, color: ACCENT } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 21, font: HEADER_FONT, color: ACCENT, characterSpacing: 50 })],
    spacing: { before: 300, after: 150 }
  })

  const first = cv.fullName.split(' ')[0]
  const rest = cv.fullName.split(' ').slice(1).join(' ')
  const customHeader = (): (Paragraph | Table)[] => [
    // Masthead bar — a heavy rule across the top of the document.
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 40, color: ACCENT } }, children: [new TextRun({ text: '', size: 2 })], spacing: { after: 170 } }),
    // Split-weight name: bold first name, light remainder.
    new Paragraph({ children: [
      new TextRun({ text: `${first.toUpperCase()} `, bold: true, size: 46, font: NAME_FONT_SERIF, color: '1a1a1a' }),
      new TextRun({ text: rest.toUpperCase(), size: 46, font: NAME_FONT_SERIF, color: '1a1a1a' }),
    ], spacing: { after: 70 } }),
    ...(cv.jobTitle ? [new Paragraph({ children: [new TextRun({ text: cv.jobTitle.toUpperCase(), bold: true, size: 20, font: HEADER_FONT, color: ACCENT, characterSpacing: 60 })], spacing: { after: 90 } })] : []),
    new Paragraph({ children: [new TextRun({ text: contactStr(cv), size: SIZE_CONTACT, font: BODY_FONT, color: '777777' })], spacing: { after: 260 } }),
  ]

  return composeSingleColumn(cv, heading, ACCENT, { center: false, bodyFont: BODY_FONT, nameFont: NAME_FONT_SERIF, nameColor: '1a1a1a', titleUsesAccent: true, customHeader })
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

  extraSectionParagraphs(cv, sectionHead, { size: SIZE_BODY, font: HEADER_FONT, color: '1a1a1a' }).forEach(pp => children.push(pp))

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

  extraSectionParagraphs(cv, sectionHead, { size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' }).forEach(pp => children.push(pp))

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

  extraSectionParagraphs(cv, sectionHead, { size: SIZE_BODY, font: BODY_FONT, color: '1a1a1a' }).forEach(pp => children.push(pp))

  return wrapDoc(children)
}

// ── Document wrapper with proper margins ──────────
function wrapDoc(children: (Paragraph | Table)[]): Document {
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
