import { Paragraph, TextRun } from 'docx'

// Convert legacy additionalInfo (labelled string) into sections so older CVs still export.
function legacyToSections(text?: string): { heading: string; items: string[] }[] {
  if (!text) return []
  const lines = String(text).split('\n').map(l => l.trim()).filter(Boolean)
  const out: { heading: string; items: string[] }[] = []
  lines.forEach(line => {
    const ci = line.indexOf(':')
    if (ci > 0 && ci <= 32) out.push({ heading: line.slice(0, ci).trim(), items: [line.slice(ci + 1).trim()].filter(Boolean) })
    else if (out.length) out[out.length - 1].items.push(line)
    else out.push({ heading: 'Additional Information', items: [line] })
  })
  return out
}

export function getExtraSections(cv: any): { heading: string; items: string[] }[] {
  const secs = (cv && cv.extraSections && cv.extraSections.length) ? [...cv.extraSections] : legacyToSections(cv && cv.additionalInfo)
  // Professional Attributes renders in Word too (parity with the PDF), ahead of the other extras.
  if (cv && cv.attributes && cv.attributes.length) secs.unshift({ heading: 'Professional Attributes', items: cv.attributes })
  return secs
}

function isRefs(h: string): boolean {
  const t = (h || '').trim().toLowerCase()
  return t === 'references' || t === 'reference'
}

// Render every extra section as: heading (via the caller's own heading builder) + one paragraph per item.
// Items are bulleted with a literal "•  " (no numbering config needed). References render as plain tight lines.
export function extraSectionParagraphs(
  cv: any,
  headingFn: (t: string) => any,
  style: { size: number; font: string; color: string }
): any[] {
  const out: any[] = []
  getExtraSections(cv).forEach(sec => {
    if (!sec || !sec.items || !sec.items.length) return
    out.push(headingFn(sec.heading))
    const refs = isRefs(sec.heading)
    sec.items.forEach(it => {
      out.push(new Paragraph({
        spacing: { after: refs ? 20 : 30, line: 288 },
        indent: refs ? undefined : { left: 200, hanging: 150 },
        children: [new TextRun({ text: (refs ? '' : '\u2022  ') + it, size: style.size, font: style.font, color: style.color })]
      }))
    })
  })
  return out
}
