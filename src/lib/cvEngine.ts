import Anthropic from '@anthropic-ai/sdk'
import type { CVFormData, GeneratedCV } from '@/types'
import { buildGenerationPrompt, buildBulletTrimPrompt, CV_SYSTEM_PROMPT, COVER_LETTER_SYSTEM_PROMPT } from './prompts'
import { CV_SCHEMA, COVER_LETTER_SCHEMA, trimSchema } from './cvSchema'

// The one place CVs and cover letters are written, shared by the API routes and
// the eval runner (evals/), so what the evals measure is what customers get.

export const WRITER_MODEL = 'claude-opus-5-5'
export type Effort = 'low' | 'medium' | 'high'
// Thinking is always on with Opus 5.5; effort is the dial between quality and
// the customer's wait. Chosen on the eval set — rerun it before changing this.
export const WRITER_EFFORT: Effort = 'medium'

let client: Anthropic | null = null
const ai = () => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

export class WriterError extends Error {
  constructor(public kind: 'refusal' | 'truncated' | 'not_a_cv', message: string) { super(message) }
}

export interface WriterUsage { inputTokens: number; outputTokens: number; ms: number }

async function writeJson<T>(opts: {
  system: string; prompt: string; schema: Record<string, unknown>; maxTokens: number; effort: Effort
}): Promise<{ data: T; usage: WriterUsage }> {
  const started = Date.now()
  const message = await ai().beta.messages.stream({
    model: WRITER_MODEL,
    max_tokens: opts.maxTokens,
    // A classifier false positive on an ordinary CV is retried on the model
    // Anthropic recommends for that category instead of failing the customer.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // The system prompt is identical on every request, so it is cached.
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: opts.effort, format: { type: 'json_schema', schema: opts.schema } },
    messages: [{ role: 'user', content: opts.prompt }],
  }).finalMessage()

  if (message.stop_reason === 'refusal') throw new WriterError('refusal', 'The writer declined this request.')
  if (message.stop_reason === 'max_tokens') throw new WriterError('truncated', 'The document was too long to finish.')
  const text = message.content.map(b => (b.type === 'text' ? b.text : '')).join('')
  return {
    data: JSON.parse(text) as T,
    usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, ms: Date.now() - started },
  }
}

// The upload / paste path's request body, as the writer reads it. The guided
// form path sends a ready CVFormData instead.
export function cvFormDataFromRequest(body: Record<string, any>): CVFormData {
  return {
    cvType: body.cvType || 'professional',
    fullName: '', email: '', phone: '', location: '',
    // Set by "Tailor my CV for…", so a CV with no advert can still be aimed.
    jobTitle: body.jobTitle || '',
    targetIndustry: body.targetIndustry || undefined,
    // Academic aiming: the institution and course being applied to.
    company: body.company || undefined,
    targetProgramme: body.targetProgramme || undefined,
    rawContent: body.rawContent,
    jobDescription: body.jobDescription,
    whyRole: body.whyRole || undefined,
    changes: body.changes || undefined,
  }
}

// Turn a finished CV into plain text the cover-letter prompt can build from.
export function serializeCV(cv: GeneratedCV): string {
  const lines: string[] = []
  if (cv.fullName) lines.push(`Name: ${cv.fullName}`)
  if (cv.jobTitle) lines.push(`Current/target title: ${cv.jobTitle}`)
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(' · ')
  if (contact) lines.push(`Contact: ${contact}`)
  if (cv.summary) lines.push(`\nPROFILE:\n${cv.summary}`)

  if (cv.experience?.length) {
    lines.push('\nEXPERIENCE:')
    cv.experience.forEach(e => {
      lines.push(`- ${e.role || ''}${e.company ? `, ${e.company}` : ''}${e.startDate || e.endDate ? ` (${e.startDate || ''} – ${e.endDate || ''})` : ''}`)
      ;(e.bullets || []).forEach(b => lines.push(`  • ${b}`))
    })
  }
  if (cv.education?.length) {
    lines.push('\nEDUCATION:')
    cv.education.forEach(e => lines.push(`- ${e.qualification || ''}${e.field ? ` in ${e.field}` : ''}${e.institution ? `, ${e.institution}` : ''}${e.endYear ? ` (${e.startYear || ''}–${e.endYear})` : ''}`))
  }
  if (cv.skills?.length) lines.push(`\nSKILLS: ${cv.skills.join(', ')}`)
  if (cv.languages?.length) lines.push(`LANGUAGES: ${cv.languages.join(', ')}`)
  const extras = cv.extraSections
  if (extras?.length) {
    extras.forEach(sec => { if (sec?.items?.length) lines.push(`\n${sec.heading.toUpperCase()}: ${sec.items.join('; ')}`) })
  } else if (cv.additionalInfo) {
    lines.push(`\nADDITIONAL: ${cv.additionalInfo}`)
  }
  if (cv.attributes?.length) lines.push(`\nATTRIBUTES: ${cv.attributes.join('; ')}`)
  return lines.join('\n')
}

export async function writeDocument(formData: CVFormData, effort: Effort = WRITER_EFFORT): Promise<{ doc: GeneratedCV; usage: WriterUsage }> {
  const isLetter = formData.cvType === 'cover_letter'
  const { data: doc, usage } = await writeJson<GeneratedCV>({
    system: isLetter ? COVER_LETTER_SYSTEM_PROMPT : CV_SYSTEM_PROMPT,
    prompt: buildGenerationPrompt(formData),
    schema: isLetter ? COVER_LETTER_SCHEMA : CV_SCHEMA,
    maxTokens: isLetter ? 12000 : 24000,
    effort,
  })

  if (isLetter) {
    // The formal Ghanaian frame — recipient block, salutation, sign-off — is
    // built from the inputs, never invented; a subject is guaranteed.
    const { buildCoverLetterFrame, defaultSubject } = await import('./coverLetter')
    const frame = buildCoverLetterFrame({ addressee: formData.addressee, company: formData.company, companyAddress: formData.companyAddress })
    doc.clRecipient = frame.clRecipient
    doc.clSalutation = frame.clSalutation
    doc.clSignOff = frame.clSignOff
    if (!doc.clSubject?.trim()) doc.clSubject = defaultSubject(doc.jobTitle)
    doc.clSubject = doc.clSubject.toUpperCase()
    doc.summary = ''; doc.experience = []; doc.education = []; doc.skills = []; doc.languages = []
    return { doc, usage }
  }

  // The writer invents nothing, so a file that isn't a CV (a letter, a list, a
  // certificate) comes back with no person in it. Failing here refunds the
  // credit or preview and tells them, instead of delivering an empty CV.
  if (!doc.fullName?.trim() && !doc.experience?.length && !doc.education?.length) {
    throw new WriterError('not_a_cv', 'No CV details were found in this input.')
  }

  // No headline under the name (owner's rule); the role the CV is aimed at
  // lives in targetRole instead.
  doc.jobTitle = ''
  doc.cvType = formData.cvType
  if (!formData.changes?.trim()) doc.changesReport = []
  // The trim pass is cosmetic, so a slow main write skips it rather than push
  // the whole request towards the server's time limit.
  if (usage.ms < 35000) {
    try {
      await runPaginationRiskPass(doc)
    } catch (err) {
      console.error('Pagination-risk pass failed (non-fatal):', err)
    }
  }
  return { doc, usage }
}

// ── Pagination-risk pass ──────────────────────────────────────
// This app has no reliable way to know real page-break positions
// server-side (running headless Chrome in a Vercel function was
// already tried for PDF export and abandoned twice in favour of an
// external renderer — see git history on app/api/export-pdf/route.ts).
// So instead of detecting real page breaks, this deterministically
// flags the *shape* of content most likely to strand as a page
// orphan or widow: the last bullet/item in a role or list running
// much longer than its siblings. Best-effort only — never blocks
// or fails CV delivery.
type RiskyItem = { id: string; text: string; context: string; maxWords: number; set: (text: string) => void }

function wordCount(s: string): number {
  return (s || '').trim().split(/\s+/).filter(Boolean).length
}

function flagTrailingOutlier(
  list: string[] | undefined,
  idPrefix: string,
  context: string,
  hardCap: number,
  targetMaxWords: number,
  set: (index: number, text: string) => void,
  out: RiskyItem[]
) {
  if (!list || !list.length) return
  const lastIdx = list.length - 1
  const counts = list.map(wordCount)
  const last = counts[lastIdx]
  const others = counts.slice(0, lastIdx)
  const avgOthers = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0
  const isTrailingOutlier = others.length >= 1 && last > avgOthers * 1.4 && last > targetMaxWords
  const isHardOverCap = last > hardCap
  if (isTrailingOutlier || isHardOverCap) {
    out.push({
      id: `${idPrefix}-${lastIdx}`,
      text: list[lastIdx],
      context,
      maxWords: targetMaxWords,
      set: (text: string) => set(lastIdx, text),
    })
  }
}

function findPaginationRiskyItems(cv: GeneratedCV): RiskyItem[] {
  const items: RiskyItem[] = []

  cv.experience?.forEach((e, i) => {
    flagTrailingOutlier(e.bullets, `exp${i}`, `${e.role} at ${e.company}`, 26, 18, (idx, text) => { e.bullets[idx] = text }, items)
  })
  if (cv.attributes?.length) {
    flagTrailingOutlier(cv.attributes, 'attr', 'Professional attribute', 18, 15, (idx, text) => { cv.attributes![idx] = text }, items)
  }
  flagTrailingOutlier(cv.publications, 'pub', 'Publication citation', 34, 24, (idx, text) => { cv.publications![idx] = text }, items)
  flagTrailingOutlier(cv.research, 'res', 'Research item', 34, 24, (idx, text) => { cv.research![idx] = text }, items)
  flagTrailingOutlier(cv.teaching, 'teach', 'Teaching item', 34, 24, (idx, text) => { cv.teaching![idx] = text }, items)
  cv.extraSections?.forEach((sec, i) => {
    if (!sec?.items?.length) return
    flagTrailingOutlier(sec.items, `extra${i}`, sec.heading || 'Additional item', 34, 24, (idx, text) => { sec.items[idx] = text }, items)
  })

  // Cap so the extra call stays small, fast, and genuinely surgical.
  return items.slice(0, 4)
}

async function runPaginationRiskPass(cv: GeneratedCV): Promise<void> {
  const risky = findPaginationRiskyItems(cv)
  if (!risky.length) return
  const call = writeJson<Record<string, string>>({
    system: 'You are a precise copy editor. Follow instructions exactly.',
    prompt: buildBulletTrimPrompt(risky.map(r => ({ id: r.id, text: r.text, context: r.context, maxWords: r.maxWords }))),
    schema: trimSchema(risky.map(r => r.id)),
    maxTokens: 4000,
    effort: 'low',
  })
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('pagination-risk pass timed out')), 15000))
  const { data } = await Promise.race([call, timeout])
  risky.forEach(r => {
    const replacement = data[r.id]
    if (typeof replacement === 'string' && replacement.trim()) r.set(replacement.trim())
  })
  console.log(`[Writer] Pagination-risk pass tightened ${risky.length} item(s)`)
}
