import type { GeneratedCV } from '@/types'

// Automatic checks on one written document. "hard" checks are the promises
// (truth, instructions followed, correct format); "soft" ones are house style.

export interface Expect {
  facts?: string[]            // must appear; "A|B" means either
  absent?: string[]           // must not appear anywhere
  minChanges?: number         // changesReport entries expected
  notAppliedOk?: boolean      // a request may honestly be reported as not applied
  targetRole?: string
  maxWords?: number
  academic?: boolean
  minResearch?: number
  minTeaching?: number
  letterSubjectIncludes?: string
  letterFacts?: string[]
  letterOnly?: boolean
  allowNumbers?: string[]    // true figures the writer may add (e.g. the year in a law's official name)
  rejects?: boolean          // input is not a CV: the writer must refuse, not deliver an empty CV
}

export interface Check { name: string; level: 'hard' | 'soft'; pass: boolean; detail?: string }

const BUZZWORDS = ['synergy', 'leverage', 'paradigm', 'rockstar', 'ninja', 'guru', 'passionate', 'hardworking', 'hard-working', 'dynamic', 'results-driven', 'go-getter', 'team player', 'detail-oriented']
const US_SPELLINGS = ['organize', 'organized', 'organizing', 'organization', 'organizational', 'analyze', 'analyzed', 'analyzing', 'behavior', 'center', 'centers', 'labor', 'color', 'honor', 'favor', 'enroll', 'enrollment', 'catalog', 'defense', 'optimize', 'optimized', 'prioritize', 'prioritized', 'utilize', 'utilized', 'specialize', 'specialized', 'recognize', 'recognized', 'mobilize', 'mobilized', 'standardize', 'standardized', 'fertilizer', 'judgment']
const DATE_RE = /^(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) )?\d{4}$|^Present$/

const norm = (s: string) => s.toLowerCase().replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').trim()
const words = (s: string) => (s || '').trim().split(/\s+/).filter(Boolean).length
const has = (hay: string, needle: string) => needle.split('|').some(n => norm(hay).includes(norm(n)))

// Everything the reader sees, as text.
export function cvText(cv: GeneratedCV, withContact = true): string {
  const parts: string[] = []
  if (withContact) parts.push(cv.fullName, cv.email, cv.phone, cv.location, cv.linkedin || '')
  parts.push(cv.summary || '')
  for (const e of cv.experience || []) parts.push(e.role, e.company, e.startDate, e.endDate, ...(e.bullets || []))
  for (const e of cv.education || []) parts.push(e.qualification, e.field, e.institution, e.startYear, e.endYear, e.grade || '')
  parts.push(...(cv.skills || []), ...(cv.attributes || []), ...(cv.languages || []))
  parts.push(...(cv.publications || []), ...(cv.research || []), ...(cv.teaching || []))
  for (const s of cv.extraSections || []) parts.push(s.heading, ...(s.items || []))
  if (cv.additionalInfo) parts.push(cv.additionalInfo)
  if (cv.coverLetterBody) parts.push(cv.clSubject || '', cv.coverLetterBody)
  return parts.filter(Boolean).join('\n')
}

// Prose the writer composed (not copied fields like dates or contact details),
// which is where invented numbers would appear.
function writtenText(cv: GeneratedCV): string {
  return [
    cv.summary, ...(cv.experience || []).flatMap(e => e.bullets || []),
    ...(cv.attributes || []), ...(cv.skills || []), ...(cv.research || []), ...(cv.teaching || []),
    ...(cv.extraSections || []).flatMap(s => s.items || []), cv.coverLetterBody || '',
  ].filter(Boolean).join('\n')
}

const numberTokens = (s: string) => (s.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => n.replace(/,/g, '').replace(/\.0+$/, ''))

// Numbers in the written prose that appear nowhere in the person's input.
// Small counts directly before "year(s)" are allowed: years of experience is
// arithmetic on their own dates, which the rules permit.
export function inventedNumbers(cv: GeneratedCV, input: string): string[] {
  const allowed = new Set(numberTokens(input))
  const out: string[] = []
  const text = writtenText(cv)
  const re = /\d[\d,]*(?:\.\d+)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const n = m[0].replace(/,/g, '').replace(/\.0+$/, '')
    if (allowed.has(n)) continue
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 12).toLowerCase()
    if (Number(n) <= 45 && /^\+?\s*(?:years?|yrs)/.test(after)) continue
    out.push(m[0])
  }
  return [...new Set(out)]
}

export function scoreCv(cv: GeneratedCV, input: string, expect: Expect, cvType: string): Check[] {
  const checks: Check[] = []
  const all = cvText(cv)
  const add = (name: string, level: Check['level'], pass: boolean, detail?: string) => checks.push({ name, level, pass, detail })

  add('has core content', 'hard', !!cv.fullName && (cv.experience?.length || 0) + (cv.education?.length || 0) > 0)
  add('no headline under the name', 'hard', !cv.jobTitle?.trim(), cv.jobTitle || undefined)

  const invented = inventedNumbers(cv, input).filter(n => !(expect.allowNumbers || []).includes(n))
  add('no invented numbers', 'hard', invented.length === 0, invented.join(', ') || undefined)

  const missing = (expect.facts || []).filter(f => !has(all, f))
  add('facts kept exactly', 'hard', missing.length === 0, missing.join(' · ') || undefined)

  const leaked = (expect.absent || []).filter(a => has(all, a))
  add('removed / forbidden content absent', 'hard', leaked.length === 0, leaked.join(' · ') || undefined)

  const placeholders = all.match(/\[[A-Za-z][^\]]{1,30}\]/g) || []
  add('no placeholders', 'hard', placeholders.length === 0, placeholders.join(' ') || undefined)

  if (expect.minChanges) {
    const report = cv.changesReport || []
    const skipped = report.filter(r => r.status === 'not_applied')
    add('every change request reported', 'hard', report.length >= expect.minChanges, `${report.length} of ${expect.minChanges}`)
    if (!expect.notAppliedOk) add('every change request applied', 'hard', skipped.length === 0, skipped.map(r => r.request).join(' · ') || undefined)
  }

  if (expect.targetRole) add('target role recognised', 'soft', has(cv.targetRole || '', expect.targetRole), cv.targetRole || '(empty)')

  const badDates = (cv.experience || []).flatMap(e => [e.startDate, e.endDate]).filter(d => d && !DATE_RE.test(d.trim()))
  add('dates in house format', 'soft', badDates.length === 0, badDates.join(' · ') || undefined)

  const lowerInput = norm(input)
  const us = US_SPELLINGS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(all) && !new RegExp(`\\b${w}\\b`, 'i').test(lowerInput))
  add('British spelling', 'soft', us.length === 0, us.join(', ') || undefined)

  const buzz = BUZZWORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(writtenText(cv)))
  add('no buzzwords', 'soft', buzz.length === 0, buzz.join(', ') || undefined)

  const bullets = (cv.experience || []).flatMap(e => e.bullets || [])
  const offLength = bullets.filter(b => words(b) < 10 || words(b) > 30)
  add('bullet length 10–30 words', 'soft', offLength.length === 0, offLength.length ? `${offLength.length} of ${bullets.length}` : undefined)

  const repeatedVerb = (cv.experience || []).filter(e => {
    const firsts = (e.bullets || []).map(b => b.split(/\s+/)[0]?.toLowerCase())
    return new Set(firsts).size !== firsts.length
  }).map(e => e.role)
  add('no repeated opening verb within a role', 'soft', repeatedVerb.length === 0, repeatedVerb.join(' · ') || undefined)

  const sentences = (cv.summary || '').split(/(?<=[.!?])\s+/).filter(s => s.trim()).length
  const summaryMax = cvType === 'academic' ? { s: 5, w: 120 } : { s: 4, w: 90 }
  add('summary length', 'soft', sentences <= summaryMax.s && words(cv.summary || '') <= summaryMax.w, `${sentences} sentences, ${words(cv.summary || '')} words`)

  const total = words(cvText(cv, false))
  add('length within target', 'soft', total <= (expect.maxWords ?? (cvType === 'academic' ? 1100 : 900)), `${total} words`)

  if (cvType === 'academic' || expect.academic) {
    add('academic: no professional attributes', 'hard', !(cv.attributes || []).length)
    if (expect.minResearch) add('academic: research drawn out', 'hard', (cv.research || []).length >= expect.minResearch, `${(cv.research || []).length} item(s)`)
    if (expect.minTeaching) add('academic: teaching drawn out', 'hard', (cv.teaching || []).length >= expect.minTeaching, `${(cv.teaching || []).length} item(s)`)
  } else {
    const n = (cv.attributes || []).length
    add('4 professional attributes (or none)', 'soft', n === 4 || n === 0, `${n}`)
  }
  return checks
}

export function scoreLetter(letter: GeneratedCV, input: string, expect: Expect): Check[] {
  const checks: Check[] = []
  const add = (name: string, level: Check['level'], pass: boolean, detail?: string) => checks.push({ name, level, pass, detail })
  const body = letter.coverLetterBody || ''
  const n = words(body)
  add('letter: has a body', 'hard', n > 0)
  add('letter: 200–340 words', 'soft', n >= 200 && n <= 340, `${n} words`)
  if (expect.letterSubjectIncludes) add('letter: subject names the role', 'hard', has(letter.clSubject || '', expect.letterSubjectIncludes), letter.clSubject)
  add('letter: no salutation or sign-off in the body', 'hard', !/\bDear\b|Yours (faithfully|sincerely)/i.test(body))
  add('letter: no placeholders', 'hard', !/\[[A-Za-z][^\]]{1,30}\]/.test(body))
  const invented = inventedNumbers(letter, input).filter(n => !(expect.allowNumbers || []).includes(n))
  add('letter: no invented numbers', 'hard', invented.length === 0, invented.join(', ') || undefined)
  const missing = (expect.letterFacts || []).filter(f => !has(`${letter.clSubject}\n${body}`, f))
  add('letter: facts used', 'hard', missing.length === 0, missing.join(' · ') || undefined)
  const buzz = BUZZWORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(body))
  add('letter: no buzzwords', 'soft', buzz.length === 0, buzz.join(', ') || undefined)
  return checks
}
