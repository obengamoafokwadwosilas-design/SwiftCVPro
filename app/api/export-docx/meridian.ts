import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat,
  VerticalAlign
} from 'docx'
import { GeneratedCV } from '@/types'
import { extraSectionParagraphs } from './_extra'

// ════════════════════════════════════════════════════════════════
// FLAGSHIP "MERIDIAN" DOCX BUILDER
// Parameterised version of the bold-header / shaded-table technique.
// Works for ANY GeneratedCV. Colour-customisable via accent param.
// ════════════════════════════════════════════════════════════════

const WHITE = 'FFFFFF'
const MID_GREY = '666666'
const BODY_GREY = '333333'

// Derive a darker "navy" companion from any accent, plus a light tint.
// We keep a curated map for the common picker colours so pairings look
// intentional; anything else falls back to sensible defaults.
const PALETTES: Record<string, { navy: string; accent: string; tint: string; subtitle: string }> = {
  '0a1f44': { navy: '0A1F44', accent: '1A7A7A', tint: 'E8F5F5', subtitle: 'A8D8D8' }, // navy + teal (Nightingale)
  '1A7A7A': { navy: '0D2B45', accent: '1A7A7A', tint: 'E8F5F5', subtitle: 'A8D8D8' },
  'a01e1e': { navy: '4A0E0E', accent: 'A01E1E', tint: 'F8EAEA', subtitle: 'E8B4B4' }, // crimson
  '3b0a45': { navy: '24062B', accent: '6B2178', tint: 'F2E9F4', subtitle: 'D4B8DD' }, // plum
  'dc6e3a': { navy: '7A2E12', accent: 'DC6E3A', tint: 'FBEDE4', subtitle: 'F2C4A8' }, // coral
  '1f5132': { navy: '0F2A1A', accent: '1F5132', tint: 'E6F0EA', subtitle: 'A8CBB4' }, // forest
  '0d7d8c': { navy: '06343A', accent: '0D7D8C', tint: 'E4F2F4', subtitle: 'A8D8DD' }, // teal
  '1e3a8a': { navy: '0F1D45', accent: '1E3A8A', tint: 'E8ECF6', subtitle: 'B4C2E2' }, // royal
  '8b5e34': { navy: '46301A', accent: '8B5E34', tint: 'F2EBE2', subtitle: 'D8C2A8' }, // bronze
}

function resolvePalette(accent?: string | null) {
  const key = (accent || '0a1f44').replace('#', '')
  if (PALETTES[key]) return PALETTES[key]
  // Unknown colour: use it as the accent, pair with a near-black navy + light tint.
  return { navy: '14233B', accent: key, tint: 'EEF3F5', subtitle: 'C7D6DC' }
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE }
const noBorders = {
  top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
  insideHorizontal: noBorder, insideVertical: noBorder,
}

const FONT = 'Calibri'

// Total usable content width in twips (A4 minus ~0.8in margins each side)
const CONTENT_W = 9026

export function buildMeridian(cv: GeneratedCV, accent?: string | null): Document {
  const P = resolvePalette(accent)

  // ── small helpers ──────────────────────────────────────────────
  const spacer = (pt = 6) =>
    new Paragraph({ spacing: { before: 0, after: 0, line: pt * 20 }, children: [new TextRun('')] })

  const sectionHeading = (text: string) =>
    new Paragraph({
      spacing: { before: 200, after: 70 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 4 } },
      children: [new TextRun({
        text: text.toUpperCase(), bold: true, size: 22, color: P.navy,
        font: FONT, characterSpacing: 40,
      })],
    })

  const bullet = (text: string) =>
    new Paragraph({
      numbering: { reference: 'meridian-bullets', level: 0 },
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, size: 20, font: FONT, color: BODY_GREY })],
    })

  // role | dates two-column row
  const roleRow = (role: string, company: string, period: string) =>
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [5800, 3226],
      borders: noBorders,
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: noBorders, width: { size: 5800, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 0, right: 60 },
            children: [
              new Paragraph({ spacing: { before: 120, after: 0 }, children: [new TextRun({ text: role, bold: true, size: 22, color: P.navy, font: FONT })] }),
              new Paragraph({ spacing: { before: 20, after: 0 }, children: [new TextRun({ text: company, size: 20, color: P.accent, font: FONT, bold: true })] }),
            ],
          }),
          new TableCell({
            borders: noBorders, width: { size: 3226, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
            margins: { top: 0, bottom: 0, left: 60, right: 0 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 60, after: 0 }, children: [new TextRun({ text: period, size: 18, color: MID_GREY, font: FONT, italics: true })] })],
          }),
        ],
      })],
    })

  // shaded skill row: coloured label cell | items cell
  const skillRow = (label: string, items: string) =>
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 7026],
      borders: noBorders,
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: noBorders, width: { size: 2000, type: WidthType.DXA },
            shading: { fill: P.tint, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: P.accent, font: FONT })] })],
          }),
          new TableCell({
            borders: noBorders, width: { size: 7026, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 160, right: 0 },
            children: [new Paragraph({ children: [new TextRun({ text: items, size: 18, font: FONT, color: BODY_GREY })] })],
          }),
        ],
      })],
    })

  // ── HEADER: navy name block | accent contact block ─────────────
  const contactLines: Paragraph[] = []
  const pushContact = (text: string, first = false) =>
    contactLines.push(new Paragraph({ spacing: first ? {} : { before: 60 }, children: [new TextRun({ text, size: 18, color: WHITE, font: FONT })] }))
  if (cv.location) pushContact(`📍  ${cv.location}`, contactLines.length === 0)
  if (cv.phone) pushContact(`📞  ${cv.phone}`, contactLines.length === 0)
  if (cv.email) pushContact(`✉   ${cv.email}`, contactLines.length === 0)
  if (cv.linkedin) pushContact(`🔗  ${cv.linkedin}`, contactLines.length === 0)
  if (contactLines.length === 0) pushContact('—', true)

  const header = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [5200, 3826],
    borders: noBorders,
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders, width: { size: 5200, type: WidthType.DXA },
          shading: { fill: P.navy, type: ShadingType.CLEAR, color: 'auto' },
          margins: { top: 300, bottom: 300, left: 300, right: 200 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({ children: [new TextRun({ text: (cv.fullName || '').toUpperCase(), bold: true, size: 36, color: WHITE, font: FONT, characterSpacing: 20 })] }),
            ...(cv.jobTitle ? [new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: cv.jobTitle, size: 20, color: P.subtitle, font: FONT, italics: true })] })] : []),
          ],
        }),
        new TableCell({
          borders: noBorders, width: { size: 3826, type: WidthType.DXA },
          shading: { fill: P.accent, type: ShadingType.CLEAR, color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 200, bottom: 200, left: 240, right: 200 },
          children: contactLines,
        }),
      ],
    })],
  })

  // ── BODY ───────────────────────────────────────────────────────
  const children: (Paragraph | Table)[] = [header, spacer(10)]

  // Cover letter short-circuit
  if (cv.coverLetterBody) {
    cv.coverLetterBody.split('\n\n').forEach(p =>
      children.push(new Paragraph({ spacing: { before: 80, after: 80, line: 300 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: p, size: 20, font: FONT, color: BODY_GREY })] }))
    )
    return assemble(children, P)
  }

  if (cv.summary) {
    children.push(sectionHeading('Professional Profile'))
    children.push(new Paragraph({ spacing: { before: 80, after: 80, line: 290 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: cv.summary, size: 20, font: FONT, color: BODY_GREY })] }))
  }

  if (cv.experience?.length) {
    children.push(sectionHeading('Professional Experience'))
    cv.experience.forEach((e, i) => {
      children.push(roleRow(e.role, e.company, `${e.startDate} – ${e.endDate}`))
      e.bullets.forEach(b => children.push(bullet(b)))
      if (i < cv.experience.length - 1) children.push(spacer(6))
    })
  }

  if (cv.education?.length) {
    children.push(sectionHeading('Education & Qualifications'))
    cv.education.forEach(ed => {
      children.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [5800, 3226],
        borders: noBorders,
        rows: [new TableRow({
          children: [
            new TableCell({
              borders: noBorders, width: { size: 5800, type: WidthType.DXA }, margins: { top: 80, bottom: 40, left: 0, right: 120 },
              children: [
                new Paragraph({ children: [new TextRun({ text: ed.field ? `${ed.qualification} in ${ed.field}` : ed.qualification, bold: true, size: 20, color: P.navy, font: FONT })] }),
                new Paragraph({ spacing: { before: 30 }, children: [new TextRun({ text: ed.institution, size: 18, color: MID_GREY, font: FONT, italics: true })] }),
                ...(ed.grade ? [new Paragraph({ spacing: { before: 20 }, children: [new TextRun({ text: ed.grade, size: 17, color: P.accent, font: FONT })] })] : []),
              ],
            }),
            new TableCell({
              borders: noBorders, width: { size: 3226, type: WidthType.DXA }, margins: { top: 80, bottom: 40, left: 120, right: 0 },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${ed.startYear} – ${ed.endYear}`, size: 18, color: MID_GREY, font: FONT, italics: true })] })],
            }),
          ],
        })],
      }))
    })
  }

  // Skills as shaded category rows. Group generically; the AI already
  // hands us a flat list, so we present it as one "Skills" row unless
  // languages exist (then they get their own labelled row).
  if (cv.skills?.length) {
    children.push(sectionHeading('Core Competencies'))
    children.push(spacer(4))
    children.push(skillRow('Skills', cv.skills.join('  •  ')))
    if (cv.languages?.length) {
      children.push(spacer(3))
      children.push(skillRow('Languages', cv.languages.join('  •  ')))
    }
  } else if (cv.languages?.length) {
    children.push(sectionHeading('Languages'))
    children.push(spacer(4))
    children.push(skillRow('Languages', cv.languages.join('  •  ')))
  }

  if (cv.publications?.length) {
    children.push(sectionHeading('Publications'))
    cv.publications.forEach(p => children.push(bullet(p)))
  }
  if (cv.research?.length) {
    children.push(sectionHeading('Research'))
    cv.research.forEach(r => children.push(bullet(r)))
  }
  if (cv.teaching?.length) {
    children.push(sectionHeading('Teaching'))
    cv.teaching.forEach(t => children.push(bullet(t)))
  }

  extraSectionParagraphs(cv, sectionHeading, { size: 20, font: FONT, color: BODY_GREY }).forEach(pp => children.push(pp))

  return assemble(children, P)
}

function assemble(children: (Paragraph | Table)[], P: { accent: string }): Document {
  return new Document({
    numbering: {
      config: [{
        reference: 'meridian-bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '▸', alignment: AlignmentType.LEFT,
          style: { run: { color: P.accent, size: 18, font: FONT }, paragraph: { indent: { left: 400, hanging: 260 } } },
        }],
      }],
    },
    styles: { default: { document: { run: { font: FONT, size: 20, color: BODY_GREY } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 800, bottom: 800, left: 800 } } },
      children,
    }],
  })
}
