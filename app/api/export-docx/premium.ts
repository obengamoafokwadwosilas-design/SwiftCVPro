import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, LevelFormat, VerticalAlign, ShadingType
} from 'docx'
import { GeneratedCV } from '@/types'
import { extraSectionParagraphs } from './_extra'

// ════════════════════════════════════════════════════════════════
// PREMIUM WORD BUILDERS — Vertex · Sovereign · Meridian · Ascend · Harbour
// Each matches its PDF design. Single-column ones (Sovereign, Ascend,
// Harbour) are guaranteed safe at any length. Vertex & Meridian use
// a two-column table for visual impact.
// ════════════════════════════════════════════════════════════════

const BODY = 'Calibri'
const SERIF = 'Georgia'
const nb = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: nb, bottom: nb, left: nb, right: nb, insideHorizontal: nb, insideVertical: nb }
const hex = (c?: string | null, fallback = '0d9488') => (c || fallback).replace('#', '')
const contactStr = (cv: GeneratedCV) => [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean).join('   •   ')
const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// shared: academic + additional sections appended to a single-column children array
function appendExtras(c: any[], cv: GeneratedCV, heading: (t: string) => any, bullet: (t: string) => any, para: (t: string) => any) {
  if (cv.publications?.length) { c.push(heading('Publications')); cv.publications.forEach(p => c.push(bullet(p))) }
  if (cv.research?.length) { c.push(heading('Research')); cv.research.forEach(r => c.push(bullet(r))) }
  if (cv.teaching?.length) { c.push(heading('Teaching Experience')); cv.teaching.forEach(t => c.push(bullet(t))) }
  extraSectionParagraphs(cv, heading, { size: 19, font: BODY, color: '333333' }).forEach(pp => c.push(pp))
}

function pageDoc(children: any[], ref: string, bulletColor: string, bulletChar = '•', margin = { top: 850, right: 850, bottom: 850, left: 850 }): Document {
  return new Document({
    numbering: { config: [{ reference: ref, levels: [{ level: 0, format: LevelFormat.BULLET, text: bulletChar, alignment: AlignmentType.LEFT, style: { run: { color: bulletColor, size: 21, font: BODY }, paragraph: { indent: { left: 300, hanging: 190 } } } }] }] },
    styles: { default: { document: { run: { font: BODY, size: 21, color: '1a1a1a' } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin } }, children }],
  })
}

// ════════════════════════════════════════════════════════════════
// VERTEX — orange rail, split-weight name, two columns
// ════════════════════════════════════════════════════════════════
export function buildVertex(cv: GeneratedCV, accent?: string | null): Document {
  const A = hex(accent, 'e0533d'), DARK = '1c1c1c', GREY = '666666', LIGHT = '999999'
  if (cv.coverLetterBody) return coverLetter(cv, A, BODY)

  const heading = (t: string) => new Paragraph({ spacing: { before: 200, after: 90 }, children: [new TextRun({ text: `— ${t.toUpperCase()}`, bold: true, size: 21, color: DARK, font: BODY, characterSpacing: 30 })] })
  const bullet = (t: string) => new Paragraph({ numbering: { reference: 'vertex-b', level: 0 }, spacing: { before: 40, after: 40, line: 264 }, children: [new TextRun({ text: t, size: 21, font: BODY, color: '555555' })] })

  const first = cv.fullName.split(' ')[0], rest = cv.fullName.split(' ').slice(1).join(' ')
  const nameP = new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: first.toUpperCase() + ' ', bold: true, size: 52, color: DARK, font: BODY }), new TextRun({ text: rest.toUpperCase(), size: 52, color: DARK, font: BODY })] })
  const titleP = new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: cv.jobTitle?.toUpperCase() || '', bold: true, size: 24, color: A, font: BODY, characterSpacing: 60 })] })
  const contactP = new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: contactStr(cv), size: 18, color: GREY, font: BODY })] })

  const left: any[] = []
  left.push(heading('Profile'))
  left.push(new Paragraph({ spacing: { after: 100, line: 264 }, children: [new TextRun({ text: cv.summary, size: 21, font: BODY, color: '555555' })] }))
  left.push(heading('Experience'))
  cv.experience?.forEach(e => {
    left.push(new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: e.role, bold: true, size: 23, color: DARK, font: BODY })] }))
    left.push(new Paragraph({ children: [new TextRun({ text: e.company.toUpperCase(), bold: true, size: 19, color: A, font: BODY, characterSpacing: 20 })] }))
    left.push(new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: `${e.startDate} – ${e.endDate}`, size: 17, color: LIGHT, font: BODY, italics: true })] }))
    e.bullets.forEach(b => left.push(bullet(b)))
  })

  const right: any[] = []
  if (cv.skills?.length) { right.push(heading('Skills')); cv.skills.forEach(s => right.push(bullet(s))) }
  if (cv.education?.length) {
    right.push(heading('Education'))
    cv.education.forEach(e => {
      right.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `${e.qualification} ${e.field}`, bold: true, size: 20, color: DARK, font: BODY })] }))
      right.push(new Paragraph({ children: [new TextRun({ text: e.institution, size: 18, color: GREY, font: BODY })] }))
      right.push(new Paragraph({ children: [new TextRun({ text: `${e.startYear}–${e.endYear}${e.grade ? ` · ${e.grade}` : ''}`, size: 16, color: LIGHT, font: BODY, italics: true })] }))
    })
  }
  if (cv.languages?.length) { right.push(heading('Languages')); cv.languages.forEach(l => right.push(bullet(l))) }
  if (cv.publications?.length) { right.push(heading('Publications')); cv.publications.forEach(p => right.push(bullet(p))) }
  if (cv.research?.length) { right.push(heading('Research')); cv.research.forEach(r => right.push(bullet(r))) }
  if (cv.teaching?.length) { right.push(heading('Teaching')); cv.teaching.forEach(t => right.push(bullet(t))) }
  extraSectionParagraphs(cv, heading, { size: 18, font: BODY, color: '555555' }).forEach(pp => right.push(pp))

  const bodyTable = new Table({ width: { size: 10100, type: WidthType.DXA }, columnWidths: [5550, 4550], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ borders: NO_BORDERS, width: { size: 5550, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 0, right: 260 }, children: left }), new TableCell({ borders: NO_BORDERS, width: { size: 4550, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 260, right: 0 }, children: right })] })] })

  const rail = new Table({ width: { size: 10800, type: WidthType.DXA }, columnWidths: [150, 10650], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ borders: NO_BORDERS, width: { size: 150, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: A, color: A }, children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })] }), new TableCell({ borders: NO_BORDERS, width: { size: 10650, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 300, right: 0 }, children: [nameP, titleP, contactP, bodyTable] })] })] })

  return pageDoc([rail], 'vertex-b', A, '•', { top: 800, right: 700, bottom: 800, left: 700 })
}

// ════════════════════════════════════════════════════════════════
// SOVEREIGN — single column, crest, gold prestige, centered
// ════════════════════════════════════════════════════════════════
export function buildSovereign(cv: GeneratedCV, accent?: string | null): Document {
  const A = hex(accent, 'b08d3f'), DARK = '1a2238', GREY = '666666', LIGHT = '999999'
  if (cv.coverLetterBody) return coverLetter(cv, A, SERIF)

  const heading = (t: string) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 130 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: A, space: 3 } }, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 21, color: DARK, font: SERIF, characterSpacing: 60 })] })
  const bullet = (t: string) => new Paragraph({ numbering: { reference: 'sov-b', level: 0 }, spacing: { before: 40, after: 40, line: 276 }, children: [new TextRun({ text: t, size: 21, font: BODY, color: '444444' })] })
  const cpara = (t: string) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 300 }, children: [new TextRun({ text: t, size: 18, color: '444444', font: BODY })] })

  const c: any[] = []
  c.push(new Table({ width: { size: 900, type: WidthType.DXA }, alignment: AlignmentType.CENTER, columnWidths: [900], borders: { top: { style: BorderStyle.SINGLE, size: 12, color: A }, bottom: { style: BorderStyle.SINGLE, size: 12, color: A }, left: { style: BorderStyle.SINGLE, size: 12, color: A }, right: { style: BorderStyle.SINGLE, size: 12, color: A }, insideHorizontal: nb, insideVertical: nb }, rows: [new TableRow({ children: [new TableCell({ width: { size: 900, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 120, bottom: 120, left: 0, right: 0 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: initials(cv.fullName), bold: true, size: 30, color: DARK, font: SERIF })] })] })] })] }))
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160 }, children: [new TextRun({ text: cv.fullName.toUpperCase(), bold: true, size: 42, color: DARK, font: SERIF, characterSpacing: 90 })] }))
  if (cv.jobTitle) c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 90 }, children: [new TextRun({ text: cv.jobTitle.toUpperCase(), size: 22, color: A, font: SERIF, characterSpacing: 120, bold: true })] }))
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: A, space: 6 } }, children: [new TextRun({ text: '', size: 2 })] }))
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: contactStr(cv), size: 17, color: GREY, font: BODY })] }))

  if (cv.summary) { c.push(heading('Profile')); c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, line: 300 }, children: [new TextRun({ text: cv.summary, size: 21, font: BODY, color: '444444', italics: true })] })) }

  if (cv.experience?.length) {
    c.push(heading('Experience'))
    cv.experience.forEach(e => {
      c.push(new Table({ width: { size: 9700, type: WidthType.DXA }, columnWidths: [6900, 2800], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ borders: NO_BORDERS, width: { size: 6900, type: WidthType.DXA }, margins: { top: 80, bottom: 0, left: 0, right: 60 }, children: [new Paragraph({ children: [new TextRun({ text: e.role, bold: true, size: 23, color: DARK, font: SERIF })] })] }), new TableCell({ borders: NO_BORDERS, width: { size: 2800, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 0, left: 60, right: 0 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${e.startDate} – ${e.endDate}`, size: 17, color: A, italics: true, font: BODY })] })] })] })] }))
      c.push(new Paragraph({ spacing: { before: 20, after: 40 }, children: [new TextRun({ text: e.company, size: 20, color: A, italics: true, font: SERIF })] }))
      e.bullets.forEach(b => c.push(bullet(b)))
    })
  }

  if (cv.education?.length) {
    c.push(heading('Education'))
    cv.education.forEach(e => {
      c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: `${e.qualification} in ${e.field}`, bold: true, size: 21, color: DARK, font: SERIF })] }))
      c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: e.institution, size: 18, color: GREY, italics: true, font: BODY })] }))
      c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${e.startYear} – ${e.endYear}${e.grade ? ` · ${e.grade}` : ''}`, size: 16, color: LIGHT, font: BODY })] }))
    })
  }

  if (cv.skills?.length) {
    c.push(heading('Expertise'))
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30, line: 300 }, children: [new TextRun({ text: cv.skills.join('   ·   '), size: 19, color: '444444', font: BODY })] }))
    if (cv.languages?.length) c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cv.languages.join('   ·   '), size: 18, color: GREY, font: BODY })] }))
  }

  appendExtras(c, cv, heading, bullet, cpara)
  return pageDoc(c, 'sov-b', A, '•', { top: 900, right: 1100, bottom: 900, left: 1100 })
}

// ════════════════════════════════════════════════════════════════
// MERIDIAN — teal sidebar (two-column), modern professional
// ════════════════════════════════════════════════════════════════
export function buildMeridianV2(cv: GeneratedCV, accent?: string | null): Document {
  const A = hex(accent, '0d9488'), INK = '1a1a1a', GREY = '888888', white = 'FFFFFF'
  if (cv.coverLetterBody) return coverLetter(cv, A, BODY)

  const sbHeading = (t: string) => new Paragraph({ spacing: { before: 200, after: 90 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '5eead4', space: 3 } }, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 18, color: white, characterSpacing: 40, font: BODY })] })
  const sbText = (t: string) => new Paragraph({ spacing: { before: 30, after: 30, line: 240 }, children: [new TextRun({ text: t, size: 17, color: white, font: BODY })] })

  const sidebar: any[] = []
  sidebar.push(sbHeading('Contact'));[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).forEach(c => sidebar.push(sbText(c as string)))
  if (cv.skills?.length) { sidebar.push(sbHeading('Skills')); cv.skills.forEach(s => sidebar.push(new Paragraph({ spacing: { before: 28, after: 28 }, children: [new TextRun({ text: '› ', size: 17, color: '5eead4', font: BODY }), new TextRun({ text: s, size: 17, color: white, font: BODY })] }))) }
  if (cv.languages?.length) { sidebar.push(sbHeading('Languages')); cv.languages.forEach(l => sidebar.push(sbText(l))) }

  const mainHeading = (t: string) => new Paragraph({ spacing: { before: 220, after: 110 }, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 21, color: A, characterSpacing: 40, font: BODY })] })
  const bullet = (t: string) => new Paragraph({ numbering: { reference: 'mer-b', level: 0 }, spacing: { before: 40, after: 40, line: 276 }, children: [new TextRun({ text: t, size: 21, font: BODY, color: '333333' })] })
  const mpara = (t: string) => new Paragraph({ spacing: { line: 288 }, children: [new TextRun({ text: t, size: 19, color: '333333', font: BODY })] })

  const main: any[] = []
  main.push(new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: cv.fullName, bold: true, size: 38, color: INK, font: BODY })] }))
  if (cv.jobTitle) main.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: cv.jobTitle.toUpperCase(), size: 20, color: A, bold: true, characterSpacing: 30, font: BODY })] }))
  if (cv.summary) { main.push(mainHeading('Profile')); main.push(new Paragraph({ spacing: { after: 60, line: 288 }, children: [new TextRun({ text: cv.summary, size: 21, color: '333333', font: BODY })] })) }
  if (cv.experience?.length) {
    main.push(mainHeading('Experience'))
    cv.experience.forEach(e => {
      main.push(new Table({ width: { size: 6400, type: WidthType.DXA }, columnWidths: [4400, 2000], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ borders: NO_BORDERS, width: { size: 4400, type: WidthType.DXA }, margins: { top: 60, bottom: 0, left: 0, right: 40 }, children: [new Paragraph({ children: [new TextRun({ text: e.role, bold: true, size: 22, color: INK, font: BODY })] })] }), new TableCell({ borders: NO_BORDERS, width: { size: 2000, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 60, bottom: 0, left: 40, right: 0 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${e.startDate} – ${e.endDate}`, size: 16, color: GREY, italics: true, font: BODY })] })] })] })] }))
      main.push(new Paragraph({ spacing: { before: 10, after: 40 }, children: [new TextRun({ text: e.company, size: 19, color: A, bold: true, font: BODY })] }))
      e.bullets.forEach(b => main.push(bullet(b)))
    })
  }
  if (cv.education?.length) {
    main.push(mainHeading('Education'))
    cv.education.forEach(e => {
      main.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `${e.qualification} in ${e.field}`, bold: true, size: 21, color: INK, font: BODY })] }))
      main.push(new Paragraph({ children: [new TextRun({ text: `${e.institution}${e.grade ? ` — ${e.grade}` : ''}`, size: 18, color: '666666', font: BODY }), new TextRun({ text: `    ${e.startYear} – ${e.endYear}`, size: 16, color: GREY, italics: true, font: BODY })] }))
    })
  }
  appendExtras(main, cv, mainHeading, bullet, mpara)

  const layout = new Table({ width: { size: 10800, type: WidthType.DXA }, columnWidths: [3550, 7250], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ width: { size: 3550, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: A, color: A }, margins: { top: 400, bottom: 400, left: 280, right: 280 }, children: sidebar }), new TableCell({ width: { size: 7250, type: WidthType.DXA }, margins: { top: 400, bottom: 400, left: 360, right: 200 }, children: main })] })] })

  return pageDoc([layout], 'mer-b', A, '•', { top: 0, right: 0, bottom: 0, left: 0 })
}

// ════════════════════════════════════════════════════════════════
// ASCEND — single column, blue colour-bar section titles
// ════════════════════════════════════════════════════════════════
export function buildAscend(cv: GeneratedCV, accent?: string | null): Document {
  const A = hex(accent, '1d4ed8'), INK = '1a1a1a', GREY = '777777'
  if (cv.coverLetterBody) return coverLetter(cv, A, BODY)

  const heading = (t: string) => new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: [10200], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ width: { size: 10200, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: A, color: A }, margins: { top: 70, bottom: 70, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 19, color: 'FFFFFF', characterSpacing: 50, font: BODY })] })] })] })] })
  const sp = () => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: '', size: 2 })] })
  const bullet = (t: string) => new Paragraph({ numbering: { reference: 'asc-b', level: 0 }, spacing: { before: 40, after: 40, line: 276 }, children: [new TextRun({ text: t, size: 21, font: BODY, color: '333333' })] })
  const para = (t: string) => new Paragraph({ spacing: { line: 288 }, children: [new TextRun({ text: t, size: 19, color: '333333', font: BODY })] })

  const c: any[] = []
  c.push(new Paragraph({ children: [new TextRun({ text: cv.fullName.toUpperCase(), bold: true, size: 48, color: INK, font: BODY, characterSpacing: 20 })] }))
  if (cv.jobTitle) c.push(new Paragraph({ spacing: { before: 40, after: 80 }, children: [new TextRun({ text: cv.jobTitle, size: 24, color: A, font: BODY, bold: true })] }))
  c.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: contactStr(cv).replace(/•/g, '|'), size: 18, color: GREY, font: BODY })] }))

  if (cv.summary) { c.push(heading('Profile')); c.push(sp()); c.push(new Paragraph({ spacing: { after: 80, line: 288 }, children: [new TextRun({ text: cv.summary, size: 21, color: '333333', font: BODY })] })) }
  if (cv.experience?.length) {
    c.push(heading('Professional Experience')); c.push(sp())
    cv.experience.forEach(e => {
      c.push(new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: [7400, 2800], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ borders: NO_BORDERS, width: { size: 7400, type: WidthType.DXA }, margins: { top: 80, bottom: 0, left: 0, right: 60 }, children: [new Paragraph({ children: [new TextRun({ text: e.role, bold: true, size: 23, color: INK, font: BODY })] })] }), new TableCell({ borders: NO_BORDERS, width: { size: 2800, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 0, left: 60, right: 0 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${e.startDate} – ${e.endDate}`, size: 17, color: GREY, italics: true, font: BODY })] })] })] })] }))
      c.push(new Paragraph({ spacing: { before: 10, after: 40 }, children: [new TextRun({ text: e.company, size: 20, color: A, bold: true, font: BODY })] }))
      e.bullets.forEach(b => c.push(bullet(b)))
    })
  }
  if (cv.education?.length) {
    c.push(heading('Education')); c.push(sp())
    cv.education.forEach(e => {
      c.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `${e.qualification} in ${e.field}`, bold: true, size: 21, color: INK, font: BODY }), new TextRun({ text: `     ${e.startYear} – ${e.endYear}`, size: 16, color: GREY, italics: true, font: BODY })] }))
      c.push(new Paragraph({ children: [new TextRun({ text: `${e.institution}${e.grade ? ` — ${e.grade}` : ''}`, size: 18, color: '666666', font: BODY })] }))
    })
  }
  if (cv.skills?.length) {
    c.push(heading('Core Skills')); c.push(sp())
    c.push(new Paragraph({ spacing: { line: 300 }, children: [new TextRun({ text: cv.skills.join('   •   '), size: 20, color: '333333', font: BODY })] }))
    if (cv.languages?.length) c.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: 'Languages: ', bold: true, size: 19, color: INK, font: BODY }), new TextRun({ text: cv.languages.join(', '), size: 19, color: '333333', font: BODY })] }))
  }
  if (cv.publications?.length) { c.push(heading('Publications')); c.push(sp()); cv.publications.forEach(p => c.push(bullet(p))) }
  if (cv.research?.length) { c.push(heading('Research')); c.push(sp()); cv.research.forEach(r => c.push(bullet(r))) }
  if (cv.teaching?.length) { c.push(heading('Teaching Experience')); c.push(sp()); cv.teaching.forEach(t => c.push(bullet(t))) }
  extraSectionParagraphs(cv, heading, { size: 19, font: BODY, color: '444444' }).forEach(pp => c.push(pp))

  return pageDoc(c, 'asc-b', A, '•', { top: 850, right: 850, bottom: 850, left: 850 })
}

// ════════════════════════════════════════════════════════════════
// AURORA — colourful single column: filled accent header band + filled
// accent section bars. Matches the Aurora PDF design (both lean on solid
// colour fills, which Word reproduces exactly via paragraph/cell shading).
// ════════════════════════════════════════════════════════════════
export function buildAurora(cv: GeneratedCV, accent?: string | null): Document {
  const A = hex(accent, '7c3aed'), INK = '1a1a1a', GREY = '777777'
  if (cv.coverLetterBody) return coverLetter(cv, A, BODY)

  // Bold colour text + a thin colour rule reads far lighter than a full-width
  // solid-fill block repeated for every heading (the old look, stacked 6-8
  // times down a page). Matches the PDF's lighter 'beacon'-style heading.
  const heading = (t: string) => new Paragraph({ spacing: { before: 220, after: 90 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: A, space: 4 } }, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 20, color: A, characterSpacing: 30, font: BODY })] })
  const sp = () => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: '', size: 2 })] })
  const bullet = (t: string) => new Paragraph({ numbering: { reference: 'aur-b', level: 0 }, spacing: { before: 40, after: 40, line: 276 }, children: [new TextRun({ text: t, size: 21, font: BODY, color: '333333' })] })

  const c: any[] = []
  // ── HEADER BAND (filled accent, white text) ──
  c.push(new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: [10200], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ width: { size: 10200, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: A, color: A }, margins: { top: 240, bottom: 240, left: 280, right: 280 }, children: [
    new Paragraph({ children: [new TextRun({ text: cv.fullName.toUpperCase(), bold: true, size: 40, color: 'FFFFFF', font: BODY, characterSpacing: 30 })] }),
    ...(cv.jobTitle ? [new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: cv.jobTitle, size: 23, color: 'FFFFFF', font: BODY })] })] : []),
    new Paragraph({ spacing: { before: 90 }, children: [new TextRun({ text: contactStr(cv).replace(/•/g, '|'), size: 17, color: 'FFFFFF', font: BODY })] }),
  ] })] })] }))
  c.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: '', size: 2 })] }))

  if (cv.summary) { c.push(heading('Profile')); c.push(sp()); c.push(new Paragraph({ spacing: { after: 80, line: 288 }, children: [new TextRun({ text: cv.summary, size: 21, color: '333333', font: BODY })] })) }
  if (cv.experience?.length) {
    c.push(heading('Professional Experience')); c.push(sp())
    cv.experience.forEach(e => {
      c.push(new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: [7400, 2800], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ borders: NO_BORDERS, width: { size: 7400, type: WidthType.DXA }, margins: { top: 80, bottom: 0, left: 0, right: 60 }, children: [new Paragraph({ children: [new TextRun({ text: e.role, bold: true, size: 23, color: INK, font: BODY })] })] }), new TableCell({ borders: NO_BORDERS, width: { size: 2800, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 0, left: 60, right: 0 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${e.startDate} – ${e.endDate}`, size: 17, color: GREY, italics: true, font: BODY })] })] })] })] }))
      c.push(new Paragraph({ spacing: { before: 10, after: 40 }, children: [new TextRun({ text: e.company, size: 20, color: A, bold: true, font: BODY })] }))
      e.bullets.forEach(b => c.push(bullet(b)))
    })
  }
  if (cv.education?.length) {
    c.push(heading('Education')); c.push(sp())
    cv.education.forEach(e => {
      c.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `${e.qualification} in ${e.field}`, bold: true, size: 21, color: INK, font: BODY }), new TextRun({ text: `     ${e.startYear} – ${e.endYear}`, size: 16, color: GREY, italics: true, font: BODY })] }))
      c.push(new Paragraph({ children: [new TextRun({ text: `${e.institution}${e.grade ? ` — ${e.grade}` : ''}`, size: 18, color: '666666', font: BODY })] }))
    })
  }
  if (cv.skills?.length) {
    c.push(heading('Core Skills')); c.push(sp())
    c.push(new Paragraph({ spacing: { line: 300 }, children: [new TextRun({ text: cv.skills.join('   •   '), size: 20, color: '333333', font: BODY })] }))
    if (cv.languages?.length) c.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: 'Languages: ', bold: true, size: 19, color: INK, font: BODY }), new TextRun({ text: cv.languages.join(', '), size: 19, color: '333333', font: BODY })] }))
  }
  if (cv.publications?.length) { c.push(heading('Publications')); c.push(sp()); cv.publications.forEach(p => c.push(bullet(p))) }
  if (cv.research?.length) { c.push(heading('Research')); c.push(sp()); cv.research.forEach(r => c.push(bullet(r))) }
  if (cv.teaching?.length) { c.push(heading('Teaching Experience')); c.push(sp()); cv.teaching.forEach(t => c.push(bullet(t))) }
  extraSectionParagraphs(cv, heading, { size: 19, font: BODY, color: '444444' }).forEach(pp => c.push(pp))

  return pageDoc(c, 'aur-b', A, '•', { top: 850, right: 850, bottom: 850, left: 850 })
}

// ════════════════════════════════════════════════════════════════
// HARBOUR — single column, teal tick headings, editorial serif
// ════════════════════════════════════════════════════════════════
export function buildHarbour(cv: GeneratedCV, accent?: string | null): Document {
  const A = hex(accent, '0f766e'), INK = '1a2a2a', GREY = '778080'
  if (cv.coverLetterBody) return coverLetter(cv, A, SERIF)

  const heading = (t: string) => new Paragraph({ spacing: { before: 260, after: 120 }, children: [new TextRun({ text: '▎ ', size: 24, color: A, font: BODY }), new TextRun({ text: t.toUpperCase(), bold: true, size: 20, color: INK, characterSpacing: 80, font: BODY })] })
  const bullet = (t: string) => new Paragraph({ numbering: { reference: 'har-b', level: 0 }, spacing: { before: 46, after: 46, line: 288 }, children: [new TextRun({ text: t, size: 21, font: BODY, color: '444444' })] })
  const para = (t: string) => new Paragraph({ spacing: { line: 300 }, children: [new TextRun({ text: t, size: 19, color: '444444', font: BODY })] })

  const c: any[] = []
  c.push(new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: [80, 10120], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ borders: NO_BORDERS, width: { size: 80, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: A, color: A }, children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })] }), new TableCell({ borders: NO_BORDERS, width: { size: 10120, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 240, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: cv.fullName, bold: true, size: 44, color: INK, font: SERIF })] }), new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: cv.jobTitle || '', size: 21, color: A, italics: true, font: SERIF })] })] })] })] }))
  c.push(new Paragraph({ spacing: { before: 140, after: 80 }, children: [new TextRun({ text: contactStr(cv).replace(/   •   /g, '     '), size: 17, color: GREY, font: BODY })] }))
  c.push(new Paragraph({ spacing: { after: 40 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'd8e0e0', space: 2 } }, children: [new TextRun({ text: '', size: 2 })] }))

  if (cv.summary) { c.push(heading('Profile')); c.push(new Paragraph({ spacing: { after: 60, line: 300 }, children: [new TextRun({ text: cv.summary, size: 21, color: '444444', font: BODY })] })) }
  if (cv.experience?.length) {
    c.push(heading('Experience'))
    cv.experience.forEach(e => {
      c.push(new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: [7400, 2800], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ borders: NO_BORDERS, width: { size: 7400, type: WidthType.DXA }, margins: { top: 80, bottom: 0, left: 0, right: 60 }, children: [new Paragraph({ children: [new TextRun({ text: e.role, bold: true, size: 22, color: INK, font: SERIF })] })] }), new TableCell({ borders: NO_BORDERS, width: { size: 2800, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 0, left: 60, right: 0 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${e.startDate} – ${e.endDate}`, size: 16, color: GREY, italics: true, font: BODY })] })] })] })] }))
      c.push(new Paragraph({ spacing: { before: 10, after: 40 }, children: [new TextRun({ text: e.company, size: 19, color: A, bold: true, font: BODY })] }))
      e.bullets.forEach(b => c.push(bullet(b)))
    })
  }
  if (cv.education?.length) {
    c.push(heading('Education'))
    cv.education.forEach(e => {
      c.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `${e.qualification} in ${e.field}`, bold: true, size: 21, color: INK, font: SERIF }), new TextRun({ text: `     ${e.startYear} – ${e.endYear}`, size: 16, color: GREY, italics: true, font: BODY })] }))
      c.push(new Paragraph({ children: [new TextRun({ text: `${e.institution}${e.grade ? ` — ${e.grade}` : ''}`, size: 18, color: '666666', italics: true, font: BODY })] }))
    })
  }
  if (cv.skills?.length) {
    c.push(heading('Skills'))
    c.push(new Paragraph({ spacing: { line: 300 }, children: [new TextRun({ text: cv.skills.join('   ·   '), size: 20, color: '444444', font: BODY })] }))
    if (cv.languages?.length) c.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: 'Languages — ', bold: true, size: 19, color: INK, font: BODY }), new TextRun({ text: cv.languages.join(', '), size: 19, color: '444444', font: BODY })] }))
  }
  appendExtras(c, cv, heading, bullet, para)

  return pageDoc(c, 'har-b', A, '–', { top: 900, right: 950, bottom: 900, left: 950 })
}


// ════════════════════════════════════════════════════════════════
// PULSE — dark sidebar on RIGHT, pill title, name top-left
// ════════════════════════════════════════════════════════════════
export function buildPulse(cv: GeneratedCV, accent?: string | null): Document {
  const A = hex(accent, '6d4aff'), DARK = '15131f', INK = '1a1a1a', GREY = '999999', white = 'FFFFFF'
  if (cv.coverLetterBody) return coverLetter(cv, A, BODY)

  // ── MAIN (left) ──
  const mainHeading = (t: string) => new Paragraph({ spacing: { before: 220, after: 110 }, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 22, color: A, characterSpacing: 30, font: BODY })] })
  const bullet = (t: string) => new Paragraph({ numbering: { reference: 'pulse-b', level: 0 }, spacing: { before: 40, after: 40, line: 276 }, children: [new TextRun({ text: t, size: 21, font: BODY, color: '444444' })] })
  const mpara = (t: string) => new Paragraph({ spacing: { line: 288 }, children: [new TextRun({ text: t, size: 19, color: '444444', font: BODY })] })

  const main: any[] = []
  // name
  main.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: cv.fullName, bold: true, size: 40, color: DARK, font: BODY })] }))
  if (cv.jobTitle) main.push(new Paragraph({ spacing: { after: 80 }, shading: { type: ShadingType.CLEAR, fill: A, color: A }, children: [new TextRun({ text: `  ${cv.jobTitle.toUpperCase()}  `, size: 18, color: white, bold: true, characterSpacing: 30, font: BODY })] }))
  main.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: contactStr(cv), size: 17, color: '777777', font: BODY })] }))
  if (cv.summary) { main.push(mainHeading('Profile')); main.push(new Paragraph({ spacing: { after: 60, line: 288 }, children: [new TextRun({ text: cv.summary, size: 21, color: '444444', font: BODY })] })) }
  if (cv.experience?.length) {
    main.push(mainHeading('Experience'))
    cv.experience.forEach(e => {
      main.push(new Paragraph({ spacing: { before: 80 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: A, space: 8 } }, children: [new TextRun({ text: e.role, bold: true, size: 22, color: DARK, font: BODY })] }))
      main.push(new Paragraph({ border: { left: { style: BorderStyle.SINGLE, size: 18, color: A, space: 8 } }, spacing: { after: 10 }, children: [new TextRun({ text: e.company, size: 19, color: A, bold: true, font: BODY }), new TextRun({ text: `    ${e.startDate} – ${e.endDate}`, size: 16, color: GREY, italics: true, font: BODY })] }))
      e.bullets.forEach(b => main.push(bullet(b)))
    })
  }
  appendExtras(main, cv, mainHeading, bullet, mpara)

  // ── SIDEBAR (right, dark) ──
  const sbHeading = (t: string) => new Paragraph({ spacing: { before: 200, after: 90 }, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 18, color: A, characterSpacing: 40, font: BODY })] })
  const sbText = (t: string) => new Paragraph({ spacing: { before: 30, after: 30, line: 240 }, children: [new TextRun({ text: t, size: 17, color: 'd8d8e0', font: BODY })] })
  const sidebar: any[] = []
  if (cv.skills?.length) { sidebar.push(sbHeading('Skills')); cv.skills.forEach(s => sidebar.push(new Paragraph({ spacing: { before: 28, after: 28 }, children: [new TextRun({ text: s, size: 17, color: 'd8d8e0', font: BODY })] }))) }
  if (cv.education?.length) { sidebar.push(sbHeading('Education')); cv.education.forEach(e => { sidebar.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `${e.qualification} ${e.field}`, bold: true, size: 17, color: white, font: BODY })] })); sidebar.push(new Paragraph({ children: [new TextRun({ text: e.institution, size: 15, color: 'b0b0c0', font: BODY })] })); sidebar.push(new Paragraph({ children: [new TextRun({ text: `${e.startYear}–${e.endYear}${e.grade ? ` · ${e.grade}` : ''}`, size: 14, color: '9090a0', font: BODY })] })) }) }
  if (cv.languages?.length) { sidebar.push(sbHeading('Languages')); cv.languages.forEach(l => sidebar.push(sbText(l))) }
  extraSectionParagraphs(cv, sbHeading, { size: 15, font: BODY, color: 'b0b0c0' }).forEach(pp => sidebar.push(pp))

  const layout = new Table({ width: { size: 10800, type: WidthType.DXA }, columnWidths: [7250, 3550], borders: NO_BORDERS, rows: [new TableRow({ children: [
    new TableCell({ width: { size: 7250, type: WidthType.DXA }, margins: { top: 400, bottom: 400, left: 360, right: 280 }, children: main }),
    new TableCell({ width: { size: 3550, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: DARK, color: DARK }, margins: { top: 400, bottom: 400, left: 280, right: 280 }, children: sidebar }),
  ] })] })

  return pageDoc([layout], 'pulse-b', A, '•', { top: 0, right: 0, bottom: 0, left: 0 })
}

// ════════════════════════════════════════════════════════════════
// shared cover letter (single column, any accent/font)
// ════════════════════════════════════════════════════════════════
function coverLetter(cv: GeneratedCV, A: string, font: string): Document {
  const c: any[] = []
  c.push(new Paragraph({ spacing: { after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: A, space: 6 } }, children: [new TextRun({ text: cv.fullName, bold: true, size: 36, color: A, font })] }))
  if (cv.jobTitle) c.push(new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: cv.jobTitle, size: 20, color: '666666', italics: true, font })] }))
  c.push(new Paragraph({ spacing: { before: 60, after: 240 }, children: [new TextRun({ text: contactStr(cv), size: 17, color: '666666', font: BODY })] }))
  ;(cv.coverLetterBody || '').split('\n\n').forEach(p => c.push(new Paragraph({ spacing: { before: 100, after: 100, line: 320 }, children: [new TextRun({ text: p, size: 21, color: '222222', font: BODY })] })))
  return pageDoc(c, 'cl-b', A, '•', { top: 1000, right: 1100, bottom: 1000, left: 1100 })
}

// ════════════════════════════════════════════════════════════════
// REGENT — classic HR/recruiter template: full-width navy-blue header
// band (centred white caps name + contact), blue underline section
// headings, serif body. Pairs 1:1 with the CVPreview.tsx 'regent' design.
// ════════════════════════════════════════════════════════════════
export function buildRegent(cv: GeneratedCV, accent?: string | null): Document {
  const A = hex(accent, '1e3a6e'), INK = '1a1a1a', GREY = '777777'
  if (cv.coverLetterBody) return coverLetter(cv, A, SERIF)

  const heading = (t: string) => new Paragraph({
    spacing: { before: 280, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: A } },
    children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 20, color: A, characterSpacing: 20, font: SERIF })],
  })
  const bullet = (t: string) => new Paragraph({ numbering: { reference: 'reg-b', level: 0 }, spacing: { before: 40, after: 40, line: 288 }, children: [new TextRun({ text: t, size: 21, font: SERIF, color: '333333' })] })

  const c: any[] = []
  // ── HEADER BAND (filled accent, centred white text) ──
  c.push(new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: [10200], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ width: { size: 10200, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: A, color: A }, margins: { top: 260, bottom: 220, left: 280, right: 280 }, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cv.fullName.toUpperCase(), bold: true, size: 34, color: 'FFFFFF', font: SERIF, characterSpacing: 15 })] }),
    ...(cv.jobTitle ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 70 }, children: [new TextRun({ text: cv.jobTitle, size: 21, color: 'FFFFFF', italics: true, font: SERIF })] })] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 110 }, children: [new TextRun({ text: contactStr(cv).replace(/•/g, '/'), size: 18, color: 'FFFFFF', font: SERIF })] }),
  ] })] })] }))
  c.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: '', size: 2 })] }))

  if (cv.summary) c.push(heading('Summary'), new Paragraph({ spacing: { after: 80, line: 300 }, children: [new TextRun({ text: cv.summary, size: 21, color: '333333', font: SERIF })] }))
  if (cv.experience?.length) {
    c.push(heading('Career History'))
    cv.experience.forEach(e => {
      c.push(new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: [7400, 2800], borders: NO_BORDERS, rows: [new TableRow({ children: [new TableCell({ borders: NO_BORDERS, width: { size: 7400, type: WidthType.DXA }, margins: { top: 80, bottom: 0, left: 0, right: 60 }, children: [new Paragraph({ children: [new TextRun({ text: e.role, bold: true, size: 23, color: INK, font: SERIF })] })] }), new TableCell({ borders: NO_BORDERS, width: { size: 2800, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 0, left: 60, right: 0 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${e.startDate} – ${e.endDate}`, size: 17, color: GREY, italics: true, font: SERIF })] })] })] })] }))
      c.push(new Paragraph({ spacing: { before: 10, after: 40 }, children: [new TextRun({ text: e.company, size: 20, color: A, italics: true, bold: true, font: SERIF })] }))
      e.bullets.forEach(b => c.push(bullet(b)))
    })
  }
  if (cv.education?.length) {
    c.push(heading('Education'))
    cv.education.forEach(e => {
      c.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `${e.qualification} in ${e.field}`, bold: true, size: 21, color: INK, font: SERIF }), new TextRun({ text: `     ${e.startYear} – ${e.endYear}`, size: 16, color: GREY, italics: true, font: SERIF })] }))
      c.push(new Paragraph({ children: [new TextRun({ text: `${e.institution}${e.grade ? ` — ${e.grade}` : ''}`, size: 18, color: '666666', italics: true, font: SERIF })] }))
    })
  }
  if (cv.skills?.length) {
    c.push(heading('Core Skills'))
    c.push(new Paragraph({ spacing: { line: 300 }, children: [new TextRun({ text: cv.skills.join('   •   '), size: 20, color: '333333', font: SERIF })] }))
    if (cv.languages?.length) c.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: 'Languages: ', bold: true, size: 19, color: INK, font: SERIF }), new TextRun({ text: cv.languages.join(', '), size: 19, color: '333333', font: SERIF })] }))
  }
  appendExtras(c, cv, heading, bullet, (t: string) => new Paragraph({ spacing: { line: 300 }, children: [new TextRun({ text: t, size: 19, color: '333333', font: SERIF })] }))

  return pageDoc(c, 'reg-b', A, '•', { top: 850, right: 850, bottom: 850, left: 850 })
}
