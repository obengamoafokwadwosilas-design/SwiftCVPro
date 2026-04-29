export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, BorderStyle,
  AlignmentType, WidthType, Table, TableRow, TableCell,
  ShadingType, LevelFormat, HeadingLevel
} from 'docx'
import { GeneratedCV, TemplateId } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { cv, templateId }: { cv: GeneratedCV; templateId: TemplateId } = await req.json()
    if (!cv) return NextResponse.json({ error: 'No CV data' }, { status: 400 })

    const doc = buildDoc(cv, templateId || 'bold-header')
    const buffer = await Packer.toBuffer(doc)
    const fileName = `${cv.fullName.replace(/\s+/g, '_')}_CV.docx`

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      }
    })
  } catch (error) {
    console.error('DOCX error:', error)
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 })
  }
}

// ── Shared constants ──────────────────────────────────
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const ALL_NONE = { top: NONE, bottom: NONE, left: NONE, right: NONE }
const FONT = 'Calibri'

// ── Numbering config ──────────────────────────────────
const numbering = {
  config: [{
    reference: 'bullets',
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: '•',
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360, hanging: 180 } } }
    }]
  }]
}

// ── Helper: text runs ─────────────────────────────────
const run = (text: string, opts: any = {}) =>
  new TextRun({ text, font: FONT, size: 20, ...opts })

const bold = (text: string, size = 22, color = '111111') =>
  new TextRun({ text, font: FONT, size, bold: true, color })

const muted = (text: string, size = 18, color = '888888') =>
  new TextRun({ text, font: FONT, size, color })

// ── Helper: section header ────────────────────────────
const secHead = (text: string, color: string) =>
  new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, font: FONT, color, allCaps: false })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color } },
    spacing: { before: 200, after: 100 }
  })

// ── Helper: bullet paragraph ──────────────────────────
const bul = (text: string) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [run(text, { size: 19, color: '374151' })],
    spacing: { after: 50 }
  })

// ── Helper: gap ───────────────────────────────────────
const gap = (sz = 80) =>
  new Paragraph({ children: [run('')], spacing: { before: sz, after: 0 } })

// ── Helper: contact string ────────────────────────────
const contactStr = (cv: GeneratedCV) =>
  [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(' · ')

// ── Shared body builder ───────────────────────────────
function sharedBody(cv: GeneratedCV, accentColor: string): Paragraph[] {
  const kids: Paragraph[] = []

  // Cover letter
  if (cv.coverLetterBody) {
    kids.push(secHead('Cover Letter', accentColor))
    cv.coverLetterBody.split('\n\n').forEach(para => {
      kids.push(new Paragraph({
        children: [run(para, { size: 20, color: '374151' })],
        spacing: { after: 120 }
      }))
    })
    return kids
  }

  // Summary
  if (cv.summary) {
    kids.push(secHead('Professional Summary', accentColor))
    kids.push(new Paragraph({
      children: [run(cv.summary, { size: 20, color: '374151' })],
      spacing: { after: 100 }
    }))
  }

  // Experience
  if (cv.experience?.length) {
    kids.push(secHead('Work Experience', accentColor))
    cv.experience.forEach(exp => {
      kids.push(new Paragraph({
        children: [
          bold(exp.role, 22),
          run(` — ${exp.company}`, { size: 20, color: '555555' }),
        ],
        spacing: { before: 140, after: 40 }
      }))
      kids.push(new Paragraph({
        children: [muted(`${exp.startDate} – ${exp.endDate}`, 18)],
        spacing: { after: 80 }
      }))
      exp.bullets.forEach(b => kids.push(bul(b)))
    })
  }

  // Education
  if (cv.education?.length) {
    kids.push(secHead('Education', accentColor))
    cv.education.forEach(edu => {
      kids.push(new Paragraph({
        children: [bold(`${edu.qualification} in ${edu.field}`, 22)],
        spacing: { before: 120, after: 40 }
      }))
      kids.push(new Paragraph({
        children: [
          run(edu.institution, { size: 19, color: '444444' }),
          muted(` · ${edu.startYear}–${edu.endYear}${edu.grade ? ` · ${edu.grade}` : ''}`, 18)
        ],
        spacing: { after: 100 }
      }))
    })
  }

  // Publications (academic)
  if (cv.publications?.length) {
    kids.push(secHead('Publications', accentColor))
    cv.publications.forEach(p => kids.push(bul(p)))
  }

  // Research (academic)
  if (cv.research?.length) {
    kids.push(secHead('Research Interests', accentColor))
    kids.push(new Paragraph({
      children: [run(cv.research.join(' · '), { size: 20, color: '374151' })],
      spacing: { after: 100 }
    }))
  }

  // Skills
  if (cv.skills?.length) {
    kids.push(secHead('Skills', accentColor))
    const skillStr = Array.isArray(cv.skills) ? cv.skills.join(' · ') : cv.skills
    kids.push(new Paragraph({
      children: [run(skillStr, { size: 19, color: '374151' })],
      spacing: { after: 100 }
    }))
  }

  // Languages
  if (cv.languages?.length) {
    kids.push(secHead('Languages', accentColor))
    kids.push(new Paragraph({
      children: [run(cv.languages.join(' · '), { size: 19, color: '374151' })],
      spacing: { after: 100 }
    }))
  }

  // Additional info
  if (cv.additionalInfo) {
    kids.push(secHead('Additional Information', accentColor))
    kids.push(new Paragraph({
      children: [run(cv.additionalInfo, { size: 19, color: '374151' })],
      spacing: { after: 100 }
    }))
  }

  return kids
}

// ── Document builder ──────────────────────────────────
function buildDoc(cv: GeneratedCV, templateId: TemplateId): Document {
  switch (templateId) {
    case 'classic':   return buildClassic(cv)
    case 'minimal':   return buildMinimal(cv)
    case 'accent':    return buildAccent(cv)
    case 'academic':  return buildAcademic(cv)
    case 'clean':     return buildClean(cv)
    case 'editorial': return buildEditorial(cv)
    case 'executive': return buildExecutive(cv)
    default:          return buildBoldHeader(cv)
  }
}

// ══════════════════════════════════════════════════════
// 1. BOLD HEADER
// ══════════════════════════════════════════════════════
function buildBoldHeader(cv: GeneratedCV): Document {
  const header: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: cv.fullName.toUpperCase(), bold: true, size: 44, font: 'Georgia', color: 'FFFFFF' })],
      shading: { fill: '1a56c4', type: ShadingType.CLEAR },
      spacing: { before: 0, after: 60 }
    }),
    new Paragraph({
      children: [run(cv.jobTitle, { size: 24, color: 'DDDDFF' })],
      shading: { fill: '1a56c4', type: ShadingType.CLEAR },
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [muted(contactStr(cv), 19, 'AABBDD')],
      shading: { fill: '1a56c4', type: ShadingType.CLEAR },
      spacing: { after: 240 }
    }),
  ]

  return new Document({
    numbering,
    sections: [{
      properties: { page: { margin: { top: 720, right: 900, bottom: 900, left: 900 } } },
      children: [...header, ...sharedBody(cv, '1a56c4')]
    }]
  })
}

// ══════════════════════════════════════════════════════
// 2. CLASSIC
// ══════════════════════════════════════════════════════
function buildClassic(cv: GeneratedCV): Document {
  const header: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: cv.fullName.toUpperCase(), bold: true, size: 44, font: 'Georgia', color: '111111' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [run(cv.jobTitle, { size: 24, color: '6b7280' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [muted(contactStr(cv), 19)],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 }
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e5e7eb' } },
      spacing: { after: 180 }
    }),
  ]

  return new Document({
    numbering,
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children: [...header, ...sharedBody(cv, '475569')]
    }]
  })
}

// ══════════════════════════════════════════════════════
// 3. MINIMAL
// ══════════════════════════════════════════════════════
function buildMinimal(cv: GeneratedCV): Document {
  // Name left, contact right via table
  const topTable = new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [5500, 3526],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: ALL_NONE,
          width: { size: 5500, type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: cv.fullName, bold: true, size: 40, font: 'Georgia', color: '111111' })],
            spacing: { after: 0 }
          })]
        }),
        new TableCell({
          borders: ALL_NONE,
          width: { size: 3526, type: WidthType.DXA },
          children: [
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [muted(cv.email || '', 17)], spacing: { after: 40 } }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [muted(cv.phone || '', 17)], spacing: { after: 40 } }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [muted(cv.location || '', 17)], spacing: { after: 0 } }),
          ]
        })
      ]
    })]
  })

  const rule = new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: '111111' } },
    spacing: { before: 100, after: 180 }
  })

  // Custom section headers for minimal (with inline rule)
  const minSH = (text: string) => new Paragraph({
    children: [
      new TextRun({ text, bold: true, size: 20, font: FONT, color: '111111' }),
      new TextRun({ text: '\t', font: FONT, size: 20 })
    ],
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'd1d5db' } },
    spacing: { before: 180, after: 100 }
  })

  const body: Paragraph[] = []

  if (cv.summary) {
    body.push(minSH('Summary'))
    body.push(new Paragraph({ children: [run(cv.summary, { size: 20, color: '374151' })], spacing: { after: 100 } }))
  }

  if (cv.experience?.length) {
    body.push(minSH('Experience'))
    cv.experience.forEach(exp => {
      body.push(new Paragraph({
        children: [bold(exp.role, 22), muted(`  ${exp.startDate} – ${exp.endDate}`, 18)],
        spacing: { before: 120, after: 40 }
      }))
      body.push(new Paragraph({ children: [run(exp.company, { size: 19, color: '6b7280' })], spacing: { after: 60 } }))
      exp.bullets.forEach(b => body.push(bul(b)))
    })
  }

  if (cv.education?.length) {
    body.push(minSH('Education'))
    cv.education.forEach(edu => {
      body.push(new Paragraph({
        children: [bold(`${edu.qualification} in ${edu.field}`, 22), muted(`  ${edu.endYear}`, 18)],
        spacing: { before: 100, after: 40 }
      }))
      body.push(new Paragraph({ children: [run(`${edu.institution}${edu.grade ? ` · ${edu.grade}` : ''}`, { size: 19, color: '6b7280' })], spacing: { after: 80 } }))
    })
  }

  if (cv.skills?.length) {
    body.push(minSH('Skills'))
    const skillStr = Array.isArray(cv.skills) ? cv.skills.join('  ·  ') : cv.skills
    body.push(new Paragraph({ children: [run(skillStr, { size: 19, color: '374151' })], spacing: { after: 80 } }))
  }

  if (cv.languages?.length) {
    body.push(minSH('Languages'))
    body.push(new Paragraph({ children: [run(cv.languages.join(' · '), { size: 19, color: '374151' })], spacing: { after: 80 } }))
  }

  if (cv.additionalInfo) {
    body.push(minSH('Additional Information'))
    body.push(new Paragraph({ children: [run(cv.additionalInfo, { size: 19, color: '374151' })], spacing: { after: 80 } }))
  }

  return new Document({
    numbering,
    sections: [{
      properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
      children: [topTable as unknown as Paragraph, rule, ...body]
    }]
  })
}

// ══════════════════════════════════════════════════════
// 4. ACCENT
// ══════════════════════════════════════════════════════
function buildAccent(cv: GeneratedCV): Document {
  const accentBar = (children: Paragraph[]) =>
    children.map(p => {
      // Add left border to every paragraph to simulate the bar
      return p
    })

  const header: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: cv.fullName, bold: true, size: 40, font: 'Georgia', color: '1c1917' })],
      border: { left: { style: BorderStyle.SINGLE, size: 32, color: 'b45309' } },
      indent: { left: 200 },
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [run(`${cv.jobTitle}${cv.location ? ` · ${cv.location}` : ''}`, { size: 22, color: '78716c' })],
      border: { left: { style: BorderStyle.SINGLE, size: 32, color: 'b45309' } },
      indent: { left: 200 },
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [muted([cv.email, cv.phone].filter(Boolean).join(' · '), 18)],
      border: { left: { style: BorderStyle.SINGLE, size: 32, color: 'b45309' } },
      indent: { left: 200 },
      spacing: { after: 60 }
    }),
    ...(cv.skills?.length ? [new Paragraph({
      children: [run(`Skills: ${(Array.isArray(cv.skills) ? cv.skills.slice(0, 6) : String(cv.skills).split(",").slice(0, 6)).join(' · ')}`, { size: 18, color: '92400e' })],
      border: { left: { style: BorderStyle.SINGLE, size: 32, color: 'b45309' } },
      indent: { left: 200 },
      spacing: { after: 60 }
    })] : []),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e7e5e4' } },
      border2: { left: { style: BorderStyle.SINGLE, size: 32, color: 'b45309' } } as any,
      spacing: { after: 200 }
    } as any),
  ]

  // Build body with left border accent on all paragraphs
  const accentSH = (text: string) => new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, font: FONT, color: 'b45309', allCaps: false })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'b45309' } },
    spacing: { before: 200, after: 100 }
  })

  const body: Paragraph[] = []

  if (cv.summary) {
    body.push(accentSH('Summary'))
    body.push(new Paragraph({ children: [run(cv.summary, { size: 20, color: '57534e' })], spacing: { after: 100 } }))
  }

  if (cv.experience?.length) {
    body.push(accentSH('Experience'))
    cv.experience.forEach(exp => {
      body.push(new Paragraph({
        children: [bold(`${exp.role} — ${exp.company}`, 22, '1c1917')],
        spacing: { before: 120, after: 40 }
      }))
      body.push(new Paragraph({ children: [muted(`${exp.startDate} – ${exp.endDate}`, 18, 'a8a29e')], spacing: { after: 80 } }))
      exp.bullets.forEach(b => body.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [run(b, { size: 19, color: '57534e' })],
        spacing: { after: 50 }
      })))
    })
  }

  if (cv.education?.length) {
    body.push(accentSH('Education'))
    cv.education.forEach(edu => {
      body.push(new Paragraph({ children: [bold(`${edu.qualification} in ${edu.field}`, 22, '1c1917')], spacing: { before: 100, after: 40 } }))
      body.push(new Paragraph({ children: [muted(`${edu.institution} · ${edu.endYear}${edu.grade ? ` · ${edu.grade}` : ''}`, 18, 'a8a29e')], spacing: { after: 80 } }))
    })
  }

  if (cv.languages?.length) {
    body.push(accentSH('Languages'))
    body.push(new Paragraph({ children: [run(cv.languages.join(' · '), { size: 19, color: '57534e' })], spacing: { after: 80 } }))
  }

  if (cv.additionalInfo) {
    body.push(accentSH('Additional Information'))
    body.push(new Paragraph({ children: [run(cv.additionalInfo, { size: 19, color: '57534e' })], spacing: { after: 80 } }))
  }

  return new Document({
    numbering,
    sections: [{
      properties: { page: { margin: { top: 720, right: 900, bottom: 900, left: 900 } } },
      children: [...header, ...body]
    }]
  })
}

// ══════════════════════════════════════════════════════
// 5. ACADEMIC
// ══════════════════════════════════════════════════════
function buildAcademic(cv: GeneratedCV): Document {
  const header: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: cv.fullName, bold: true, size: 38, font: 'Georgia', color: '111111' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [run(cv.jobTitle, { size: 22, color: '444444' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [muted(contactStr(cv), 18, '666666')],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 }
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333' } },
      spacing: { after: 180 }
    }),
  ]

  const acadSH = (text: string) => new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, font: 'Georgia', color: '111111', smallCaps: true })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '333333' } },
    spacing: { before: 200, after: 100 }
  })

  const body: Paragraph[] = []

  if (cv.summary) {
    body.push(acadSH('Professional Profile'))
    body.push(new Paragraph({ children: [run(cv.summary, { size: 20, font: 'Georgia', color: '222222' })], spacing: { after: 100 } }))
  }

  if (cv.education?.length) {
    body.push(acadSH('Education'))
    cv.education.forEach(edu => {
      body.push(new Paragraph({ children: [bold(`${edu.qualification}, ${edu.field}`, 22, '111111')], spacing: { before: 100, after: 40 } }))
      body.push(new Paragraph({ children: [run(`${edu.institution}, ${edu.endYear}`, { size: 20, font: 'Georgia', color: '333333', italics: true })], spacing: { after: 40 } }))
      if (edu.grade) body.push(new Paragraph({ children: [muted(edu.grade, 18, '555555')], spacing: { after: 80 } }))
    })
  }

  if (cv.experience?.length) {
    body.push(acadSH('Academic & Teaching Experience'))
    cv.experience.forEach(exp => {
      body.push(new Paragraph({ children: [bold(exp.role, 22, '111111')], spacing: { before: 100, after: 40 } }))
      body.push(new Paragraph({ children: [run(`${exp.company} · ${exp.startDate}–${exp.endDate}`, { size: 19, font: 'Georgia', color: '444444', italics: true })], spacing: { after: 60 } }))
      exp.bullets.forEach(b => body.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [run(b, { size: 19, font: 'Georgia', color: '222222' })],
        spacing: { after: 50 }
      })))
    })
  }

  if (cv.publications?.length) {
    body.push(acadSH('Publications'))
    cv.publications.forEach(p => body.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [run(p, { size: 19, font: 'Georgia', color: '222222' })],
      spacing: { after: 50 }
    })))
  }

  if (cv.research?.length) {
    body.push(acadSH('Research Interests'))
    body.push(new Paragraph({ children: [run(cv.research.join(' · '), { size: 19, font: 'Georgia', color: '333333' })], spacing: { after: 80 } }))
  }

  if (cv.skills?.length) {
    body.push(acadSH('Skills & Expertise'))
    body.push(new Paragraph({ children: [run(Array.isArray(cv.skills) ? cv.skills.join(' · ') : cv.skills, { size: 19, font: 'Georgia', color: '333333' })], spacing: { after: 80 } }))
  }

  if (cv.languages?.length) {
    body.push(acadSH('Languages'))
    body.push(new Paragraph({ children: [run(cv.languages.join(' · '), { size: 19, font: 'Georgia', color: '333333' })], spacing: { after: 80 } }))
  }

  if (cv.additionalInfo) {
    body.push(acadSH('Additional Information'))
    body.push(new Paragraph({ children: [run(cv.additionalInfo, { size: 19, font: 'Georgia', color: '333333' })], spacing: { after: 80 } }))
  }

  return new Document({
    numbering,
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children: [...header, ...body]
    }]
  })
}

// ══════════════════════════════════════════════════════
// 6. CLEAN (Professional, no colors)
// ══════════════════════════════════════════════════════
function buildClean(cv: GeneratedCV): Document {
  // Section header for Clean template: ALL CAPS with line below
  const cleanSH = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, font: FONT, color: '111111', allCaps: false })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '111111' } },
      spacing: { before: 240, after: 100 }
    })

  const header: Paragraph[] = [
    // Name in ALL CAPS, left-aligned
    new Paragraph({
      children: [new TextRun({ text: cv.fullName.toUpperCase(), bold: true, size: 40, font: FONT, color: '111111' })],
      spacing: { after: 60 }
    }),
    // Contact on one line
    new Paragraph({
      children: [run(contactStr(cv), { size: 19, color: '444444' })],
      spacing: { after: 180 }
    }),
  ]

  const body: Paragraph[] = []

  // Summary
  if (cv.summary) {
    body.push(cleanSH('Professional Summary'))
    body.push(new Paragraph({
      children: [run(cv.summary, { size: 20, color: '333333' })],
      spacing: { after: 100 }
    }))
  }

  // Experience
  if (cv.experience?.length) {
    body.push(cleanSH('Professional Experience'))
    cv.experience.forEach(exp => {
      // Role and dates on same line
      body.push(new Paragraph({
        children: [
          bold(exp.role, 22, '111111'),
        ],
        spacing: { before: 140, after: 30 }
      }))
      body.push(new Paragraph({
        children: [
          run(exp.company, { size: 19, color: '444444' }),
          muted(` | ${exp.startDate} – ${exp.endDate}`, 18, '777777')
        ],
        spacing: { after: 60 }
      }))
      exp.bullets.forEach(b => body.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [run(b, { size: 19, color: '333333' })],
        spacing: { after: 40 }
      })))
    })
  }

  // Education
  if (cv.education?.length) {
    body.push(cleanSH('Education'))
    cv.education.forEach(edu => {
      body.push(new Paragraph({
        children: [bold(`${edu.qualification} in ${edu.field}`, 22, '111111')],
        spacing: { before: 100, after: 30 }
      }))
      body.push(new Paragraph({
        children: [
          run(edu.institution, { size: 19, color: '444444' }),
          muted(` | ${edu.startYear}–${edu.endYear}${edu.grade ? ` | ${edu.grade}` : ''}`, 18, '777777')
        ],
        spacing: { after: 80 }
      }))
    })
  }

  // Skills
  if (cv.skills?.length) {
    body.push(cleanSH('Skills & Competencies'))
    const skillStr = Array.isArray(cv.skills) ? cv.skills.join(' · ') : cv.skills
    body.push(new Paragraph({
      children: [run(skillStr, { size: 19, color: '333333' })],
      spacing: { after: 80 }
    }))
  }

  // Languages
  if (cv.languages?.length) {
    body.push(cleanSH('Languages'))
    body.push(new Paragraph({
      children: [run(cv.languages.join(' · '), { size: 19, color: '333333' })],
      spacing: { after: 80 }
    }))
  }

  // Additional Info
  if (cv.additionalInfo) {
    body.push(cleanSH('Additional Information'))
    body.push(new Paragraph({
      children: [run(cv.additionalInfo, { size: 19, color: '333333' })],
      spacing: { after: 80 }
    }))
  }

  return new Document({
    numbering,
    sections: [{
      properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
      children: [...header, ...body]
    }]
  })
}

// ══════════════════════════════════════════════════════
// 7. EDITORIAL (Magazine-style, warm cream palette)
// ══════════════════════════════════════════════════════
function buildEditorial(cv: GeneratedCV): Document {
  const BROWN = '9a5f2e'
  const CHARCOAL = '3a3a3a'
  const WARM_GRAY = '9a9588'
  const ITALIC_BROWN = '6b5742'
  const HAIRLINE = 'd9cfbf'

  // Helper: Editorial section with two-column grid (label | content)
  const edRow = (label: string, contentParagraphs: Paragraph[]): Table => {
    return new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [1400, 7600],
      borders: ALL_NONE,
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 1400, type: WidthType.DXA },
            borders: ALL_NONE,
            margins: { top: 0, bottom: 0, left: 0, right: 240 },
            children: [new Paragraph({
              children: [new TextRun({ text: label.toUpperCase(), size: 16, font: FONT, color: BROWN, bold: true, characterSpacing: 40 })],
              spacing: { before: 40, after: 0 }
            })]
          }),
          new TableCell({
            width: { size: 7600, type: WidthType.DXA },
            borders: ALL_NONE,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: contentParagraphs
          })
        ]
      })]
    })
  }

  const header: (Paragraph | Table)[] = [
    // Kicker: "CURRICULUM VITAE"
    new Paragraph({
      children: [new TextRun({ text: 'CURRICULUM VITAE', size: 16, font: FONT, color: BROWN, bold: true, characterSpacing: 80 })],
      spacing: { after: 120 }
    }),
    // Display name (big serif)
    new Paragraph({
      children: [new TextRun({ text: cv.fullName, size: 60, font: 'Georgia', color: '1a1a1a' })],
      spacing: { after: 100 }
    }),
    // Italic subtitle (job title)
    new Paragraph({
      children: [new TextRun({ text: cv.jobTitle, size: 22, font: 'Georgia', color: ITALIC_BROWN, italics: true })],
      spacing: { after: 260 }
    }),
    // Contact line
    new Paragraph({
      children: [new TextRun({ text: contactStr(cv), size: 18, font: FONT, color: WARM_GRAY, characterSpacing: 10 })],
      spacing: { after: 200 }
    }),
    // Hairline divider
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: HAIRLINE } },
      spacing: { after: 300 }
    }),
  ]

  const body: (Paragraph | Table)[] = []

  // Summary
  if (cv.summary) {
    body.push(edRow('Summary', [new Paragraph({
      children: [new TextRun({ text: cv.summary, size: 21, font: FONT, color: CHARCOAL })],
      spacing: { before: 0, after: 0, line: 340 }
    })]))
    body.push(new Paragraph({ children: [new TextRun('')], spacing: { before: 240 } }))
  }

  // Cover letter (if present)
  if (cv.coverLetterBody) {
    const paras = cv.coverLetterBody.split('\n\n').map(p => new Paragraph({
      children: [new TextRun({ text: p, size: 21, font: FONT, color: CHARCOAL })],
      spacing: { after: 180, line: 340 }
    }))
    body.push(edRow('Letter', paras))
    body.push(new Paragraph({ children: [new TextRun('')], spacing: { before: 240 } }))
  }

  // Experience
  if (cv.experience?.length) {
    const expParas: Paragraph[] = []
    cv.experience.forEach((exp, idx) => {
      // Role + dates on same line using tab
      expParas.push(new Paragraph({
        children: [
          new TextRun({ text: exp.role, size: 25, font: 'Georgia', color: '1a1a1a', bold: false }),
          new TextRun({ text: '\t', size: 20 }),
          new TextRun({ text: `${exp.startDate} — ${exp.endDate}`, size: 17, font: FONT, color: WARM_GRAY, italics: true }),
        ],
        tabStops: [{ type: 'right' as any, position: 7200 }],
        spacing: { before: idx === 0 ? 0 : 220, after: 40 }
      }))
      // Italic company
      expParas.push(new Paragraph({
        children: [new TextRun({ text: exp.company, size: 21, font: 'Georgia', color: ITALIC_BROWN, italics: true })],
        spacing: { after: 120 }
      }))
      // Bullets as flowing prose with bullets
      exp.bullets.forEach(b => expParas.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: b, size: 20, font: FONT, color: CHARCOAL })],
        spacing: { after: 60, line: 320 }
      })))
    })
    body.push(edRow('Experience', expParas))
    body.push(new Paragraph({ children: [new TextRun('')], spacing: { before: 260 } }))
  }

  // Education
  if (cv.education?.length) {
    const eduParas: Paragraph[] = []
    cv.education.forEach((edu, idx) => {
      eduParas.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.qualification} in ${edu.field}`, size: 25, font: 'Georgia', color: '1a1a1a' }),
          new TextRun({ text: '\t', size: 20 }),
          new TextRun({ text: `${edu.startYear} — ${edu.endYear}`, size: 17, font: FONT, color: WARM_GRAY, italics: true }),
        ],
        tabStops: [{ type: 'right' as any, position: 7200 }],
        spacing: { before: idx === 0 ? 0 : 200, after: 40 }
      }))
      eduParas.push(new Paragraph({
        children: [
          new TextRun({ text: edu.institution, size: 21, font: 'Georgia', color: ITALIC_BROWN, italics: true }),
          ...(edu.grade ? [new TextRun({ text: ` · ${edu.grade}`, size: 19, font: FONT, color: CHARCOAL })] : [])
        ],
        spacing: { after: 60 }
      }))
    })
    body.push(edRow('Education', eduParas))
    body.push(new Paragraph({ children: [new TextRun('')], spacing: { before: 240 } }))
  }

  // Skills
  if (cv.skills?.length) {
    const skillStr = Array.isArray(cv.skills) ? cv.skills.join('    ·    ') : cv.skills
    body.push(edRow('Skills', [new Paragraph({
      children: [new TextRun({ text: skillStr, size: 20, font: FONT, color: CHARCOAL })],
      spacing: { after: 0, line: 360 }
    })]))
    body.push(new Paragraph({ children: [new TextRun('')], spacing: { before: 240 } }))
  }

  // Languages
  if (cv.languages?.length) {
    body.push(edRow('Languages', [new Paragraph({
      children: [new TextRun({ text: cv.languages.join('    ·    '), size: 20, font: FONT, color: CHARCOAL })],
      spacing: { after: 0 }
    })]))
    body.push(new Paragraph({ children: [new TextRun('')], spacing: { before: 240 } }))
  }

  // Publications (academic)
  if (cv.publications?.length) {
    const pubs = cv.publications.map(p => new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: p, size: 20, font: FONT, color: CHARCOAL })],
      spacing: { after: 60, line: 320 }
    }))
    body.push(edRow('Publications', pubs))
    body.push(new Paragraph({ children: [new TextRun('')], spacing: { before: 240 } }))
  }

  // Additional
  if (cv.additionalInfo) {
    body.push(edRow('Additional', [new Paragraph({
      children: [new TextRun({ text: cv.additionalInfo, size: 20, font: FONT, color: CHARCOAL })],
      spacing: { after: 0, line: 340 }
    })]))
  }

  return new Document({
    numbering,
    sections: [{
      properties: { page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
      children: [...header, ...body]
    }]
  })
}

// ══════════════════════════════════════════════════════
// 8. EXECUTIVE (Deep navy + gold, boardroom-ready)
// ══════════════════════════════════════════════════════
function buildExecutive(cv: GeneratedCV): Document {
  const NAVY = '0a1a3a'
  const GOLD = 'c9a05a'
  const GOLD_LIGHT = 'e5c98f'
  const CHARCOAL = '1f1f1f'
  const MUTED = '6b6b6b'

  // Executive section header: gold thin line + small caps with gold accent
  const execSH = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, font: 'Georgia', color: NAVY, characterSpacing: 60 })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD } },
      spacing: { before: 280, after: 140 }
    })

  // Header block with navy background (full-width table row)
  const headerTable = new Table({
    width: { size: 9000, type: WidthType.DXA },
    borders: ALL_NONE,
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: 9000, type: WidthType.DXA },
        borders: ALL_NONE,
        shading: { fill: NAVY, type: ShadingType.CLEAR },
        margins: { top: 500, bottom: 500, left: 600, right: 600 },
        children: [
          // Kicker
          new Paragraph({
            children: [new TextRun({ text: 'EXECUTIVE PROFILE', size: 16, font: 'Calibri', color: GOLD_LIGHT, characterSpacing: 100, bold: true })],
            spacing: { after: 160 }
          }),
          // Big serif name
          new Paragraph({
            children: [new TextRun({ text: cv.fullName, size: 56, font: 'Georgia', color: 'FFFFFF' })],
            spacing: { after: 60 }
          }),
          // Gold line accent
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: GOLD } },
            spacing: { after: 200 }
          }),
          // Job title
          new Paragraph({
            children: [new TextRun({ text: cv.jobTitle, size: 24, font: 'Calibri', color: GOLD_LIGHT, italics: true })],
            spacing: { after: 200 }
          }),
          // Contact
          new Paragraph({
            children: [new TextRun({ text: contactStr(cv), size: 19, font: 'Calibri', color: 'D0D6E0', characterSpacing: 20 })],
            spacing: { after: 0 }
          }),
        ]
      })]
    })]
  })

  const body: (Paragraph | Table)[] = []

  // Summary
  if (cv.summary) {
    body.push(execSH('Executive Summary'))
    body.push(new Paragraph({
      children: [new TextRun({ text: cv.summary, size: 22, font: 'Calibri', color: CHARCOAL })],
      spacing: { after: 120, line: 340 }
    }))
  }

  // Cover letter
  if (cv.coverLetterBody) {
    body.push(execSH('Letter of Application'))
    cv.coverLetterBody.split('\n\n').forEach(para => {
      body.push(new Paragraph({
        children: [new TextRun({ text: para, size: 22, font: 'Calibri', color: CHARCOAL })],
        spacing: { after: 160, line: 340 }
      }))
    })
  }

  // Experience
  if (cv.experience?.length) {
    body.push(execSH('Professional Experience'))
    cv.experience.forEach(exp => {
      // Role with right-aligned dates
      body.push(new Paragraph({
        children: [
          new TextRun({ text: exp.role, size: 26, font: 'Georgia', color: NAVY, bold: true }),
          new TextRun({ text: '\t', size: 20 }),
          new TextRun({ text: `${exp.startDate} — ${exp.endDate}`, size: 18, font: 'Calibri', color: MUTED, italics: true }),
        ],
        tabStops: [{ type: 'right' as any, position: 8600 }],
        spacing: { before: 180, after: 40 }
      }))
      // Company in gold italic
      body.push(new Paragraph({
        children: [new TextRun({ text: exp.company, size: 22, font: 'Georgia', color: GOLD, italics: true })],
        spacing: { after: 100 }
      }))
      // Bullets
      exp.bullets.forEach(b => body.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: b, size: 21, font: 'Calibri', color: CHARCOAL })],
        spacing: { after: 60, line: 320 }
      })))
    })
  }

  // Education
  if (cv.education?.length) {
    body.push(execSH('Education'))
    cv.education.forEach(edu => {
      body.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.qualification} in ${edu.field}`, size: 24, font: 'Georgia', color: NAVY, bold: true }),
          new TextRun({ text: '\t', size: 20 }),
          new TextRun({ text: `${edu.startYear} — ${edu.endYear}`, size: 18, font: 'Calibri', color: MUTED, italics: true }),
        ],
        tabStops: [{ type: 'right' as any, position: 8600 }],
        spacing: { before: 140, after: 40 }
      }))
      body.push(new Paragraph({
        children: [
          new TextRun({ text: edu.institution, size: 22, font: 'Georgia', color: GOLD, italics: true }),
          ...(edu.grade ? [new TextRun({ text: ` · ${edu.grade}`, size: 20, font: 'Calibri', color: CHARCOAL })] : [])
        ],
        spacing: { after: 80 }
      }))
    })
  }

  // Skills
  if (cv.skills?.length) {
    body.push(execSH('Core Competencies'))
    const skillStr = Array.isArray(cv.skills) ? cv.skills.join('   ·   ') : cv.skills
    body.push(new Paragraph({
      children: [new TextRun({ text: skillStr, size: 21, font: 'Calibri', color: CHARCOAL })],
      spacing: { after: 80, line: 360 }
    }))
  }

  // Languages
  if (cv.languages?.length) {
    body.push(execSH('Languages'))
    body.push(new Paragraph({
      children: [new TextRun({ text: cv.languages.join('   ·   '), size: 21, font: 'Calibri', color: CHARCOAL })],
      spacing: { after: 80 }
    }))
  }

  // Publications
  if (cv.publications?.length) {
    body.push(execSH('Publications'))
    cv.publications.forEach(p => body.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: p, size: 20, font: 'Calibri', color: CHARCOAL })],
      spacing: { after: 60, line: 320 }
    })))
  }

  // Additional
  if (cv.additionalInfo) {
    body.push(execSH('Additional Information'))
    body.push(new Paragraph({
      children: [new TextRun({ text: cv.additionalInfo, size: 21, font: 'Calibri', color: CHARCOAL })],
      spacing: { after: 80, line: 340 }
    }))
  }

  return new Document({
    numbering,
    sections: [{
      properties: { page: { margin: { top: 0, right: 720, bottom: 900, left: 720 } } },
      children: [headerTable, new Paragraph({ children: [new TextRun('')], spacing: { after: 0 } }), ...body]
    }]
  })
}
