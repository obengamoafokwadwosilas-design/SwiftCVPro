import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, LevelFormat, VerticalAlign
} from 'docx'
import { GeneratedCV } from '@/types'

// ════════════════════════════════════════════════════════════════
// "NEW YORK" — Editorial / Magazine DOCX builder
// Bold centered serif name · thin full-width rules · crimson accent
// Centered header, left-aligned editorial body. A distinct identity
// from Meridian's navy-sidebar look.
// ════════════════════════════════════════════════════════════════

const INK = '1A1A1A'        // near-black body
const GREY = '5A5A5A'       // muted secondary
const LIGHT_GREY = '8A8A8A' // dates / subtle
const HAIRLINE = 'C8C8C8'   // thin rule colour

const SERIF = 'Georgia'     // editorial serif for name + headings
const BODY = 'Calibri'      // clean body text

const CONTENT_W = 9026

// Crimson by default; honour a custom accent if supplied.
function resolveAccent(accent?: string | null): string {
  const key = (accent || 'a01e1e').replace('#', '')
  return key
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const noBorders = {
  top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
  insideHorizontal: noBorder, insideVertical: noBorder,
}

export function buildNewYork(cv: GeneratedCV, accent?: string | null): Document {
  const ACCENT = resolveAccent(accent)

  // ── helpers ──────────────────────────────────────────────────
  const spacer = (pt = 6) =>
    new Paragraph({ spacing: { before: 0, after: 0, line: pt * 20 }, children: [new TextRun('')] })

  // Full-width thin rule
  const rule = (color = HAIRLINE, size = 4) =>
    new Paragraph({
      spacing: { before: 60, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
      children: [new TextRun({ text: '', size: 2 })],
    })

  // Centered small-caps section heading with accent
  const sectionHeading = (text: string) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 40 },
      children: [new TextRun({
        text: text.toUpperCase(), bold: true, size: 21, color: ACCENT,
        font: SERIF, characterSpacing: 80,
      })],
    })

  const bullet = (text: string) =>
    new Paragraph({
      numbering: { reference: 'ny-bullets', level: 0 },
      spacing: { before: 46, after: 46, line: 276 },
      children: [new TextRun({ text, size: 20, font: BODY, color: INK })],
    })

  // role | dates row — role left in bold serif, dates right italic
  const roleRow = (role: string, company: string, period: string) =>
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [6000, 3026],
      borders: noBorders,
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: noBorders, width: { size: 6000, type: WidthType.DXA },
            margins: { top: 100, bottom: 0, left: 0, right: 80 },
            children: [
              new Paragraph({ children: [new TextRun({ text: role, bold: true, size: 22, color: INK, font: SERIF })] }),
              new Paragraph({ spacing: { before: 24 }, children: [new TextRun({ text: company, size: 19, color: ACCENT, font: BODY, bold: true, allCaps: true, characterSpacing: 20 })] }),
            ],
          }),
          new TableCell({
            borders: noBorders, width: { size: 3026, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
            margins: { top: 100, bottom: 0, left: 80, right: 0 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: period, size: 18, color: LIGHT_GREY, font: BODY, italics: true })] })],
          }),
        ],
      })],
    })

  // ── HEADER: centered name, title, contact ─────────────────────
  const children: (Paragraph | Table)[] = []

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: (cv.fullName || '').toUpperCase(), bold: true, size: 48, color: INK, font: SERIF, characterSpacing: 60 })],
  }))

  if (cv.jobTitle) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 90, after: 0 },
      children: [new TextRun({ text: cv.jobTitle, size: 22, color: ACCENT, font: SERIF, italics: true, characterSpacing: 30 })],
    }))
  }

  // contact line, centered, dot-separated
  const contactParts = [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean)
  if (contactParts.length) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 110, after: 0 },
      children: [new TextRun({ text: contactParts.join('   •   '), size: 18, color: GREY, font: BODY })],
    }))
  }

  // double rule under header for editorial feel
  children.push(rule(ACCENT, 12))

  // ── COVER LETTER short circuit ────────────────────────────────
  if (cv.coverLetterBody) {
    children.push(spacer(6))
    cv.coverLetterBody.split('\n\n').forEach(p =>
      children.push(new Paragraph({ spacing: { before: 100, after: 100, line: 320 }, alignment: AlignmentType.LEFT, children: [new TextRun({ text: p, size: 21, font: BODY, color: INK })] }))
    )
    return assemble(children, ACCENT)
  }

  // ── PROFILE ───────────────────────────────────────────────────
  if (cv.summary) {
    children.push(sectionHeading('Profile'))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 60, line: 300 },
      children: [new TextRun({ text: cv.summary, size: 21, font: BODY, color: INK, italics: true })],
    }))
  }

  // ── EXPERIENCE ────────────────────────────────────────────────
  if (cv.experience?.length) {
    children.push(sectionHeading('Experience'))
    cv.experience.forEach((e, i) => {
      children.push(roleRow(e.role, e.company, `${e.startDate} – ${e.endDate}`))
      e.bullets.forEach(b => children.push(bullet(b)))
      if (i < cv.experience.length - 1) children.push(spacer(5))
    })
  }

  // ── EDUCATION ─────────────────────────────────────────────────
  if (cv.education?.length) {
    children.push(sectionHeading('Education'))
    cv.education.forEach(ed => {
      children.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [6000, 3026],
        borders: noBorders,
        rows: [new TableRow({
          children: [
            new TableCell({
              borders: noBorders, width: { size: 6000, type: WidthType.DXA }, margins: { top: 90, bottom: 30, left: 0, right: 80 },
              children: [
                new Paragraph({ children: [new TextRun({ text: ed.field ? `${ed.qualification} in ${ed.field}` : ed.qualification, bold: true, size: 21, color: INK, font: SERIF })] }),
                new Paragraph({ spacing: { before: 24 }, children: [new TextRun({ text: ed.institution, size: 18, color: GREY, font: BODY, italics: true })] }),
                ...(ed.grade ? [new Paragraph({ spacing: { before: 18 }, children: [new TextRun({ text: ed.grade, size: 17, color: ACCENT, font: BODY })] })] : []),
              ],
            }),
            new TableCell({
              borders: noBorders, width: { size: 3026, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 90, bottom: 30, left: 80, right: 0 },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${ed.startYear} – ${ed.endYear}`, size: 18, color: LIGHT_GREY, font: BODY, italics: true })] })],
            }),
          ],
        })],
      }))
    })
  }

  // ── SKILLS — centered, dot-separated inline editorial style ────
  if (cv.skills?.length) {
    children.push(sectionHeading('Expertise'))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 50, after: 40, line: 300 },
      children: [new TextRun({ text: cv.skills.join('   •   '), size: 19, font: BODY, color: INK })],
    }))
  }

  if (cv.languages?.length) {
    children.push(sectionHeading('Languages'))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 50, after: 40 },
      children: [new TextRun({ text: cv.languages.join('   •   '), size: 19, font: BODY, color: INK })],
    }))
  }

  // ── ACADEMIC SECTIONS ─────────────────────────────────────────
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

  // ── ADDITIONAL ────────────────────────────────────────────────
  if (cv.additionalInfo) {
    children.push(sectionHeading('Additional Information'))
    children.push(new Paragraph({ spacing: { before: 50, after: 40, line: 300 }, alignment: AlignmentType.LEFT, children: [new TextRun({ text: cv.additionalInfo, size: 20, font: BODY, color: INK })] }))
  }

  return assemble(children, ACCENT)
}

function assemble(children: (Paragraph | Table)[], accent: string): Document {
  return new Document({
    numbering: {
      config: [{
        reference: 'ny-bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '—', alignment: AlignmentType.LEFT,
          style: { run: { color: accent, size: 20, font: BODY }, paragraph: { indent: { left: 360, hanging: 240 } } },
        }],
      }],
    },
    styles: { default: { document: { run: { font: BODY, size: 20, color: INK } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, right: 1000, bottom: 900, left: 1000 } } },
      children,
    }],
  })
}
