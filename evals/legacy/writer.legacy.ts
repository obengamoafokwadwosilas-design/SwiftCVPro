import Anthropic from '@anthropic-ai/sdk'
import type { CVFormData, GeneratedCV } from '@/types'
import { buildGenerationPrompt, CV_SYSTEM_PROMPT } from './prompts.legacy'
import { buildCoverLetterFrame, defaultSubject } from '@/lib/coverLetter'

// The engine as it was at tag before-engine-v2 (Opus 4.7, free-text JSON, the
// old prompts verbatim), kept only as the baseline the evals compare against.
// The old pagination trim pass is left out: it only shortened long last bullets.

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function legacyWrite(formData: CVFormData): Promise<{ doc: GeneratedCV; usage: { inputTokens: number; outputTokens: number; ms: number } }> {
  const isLetter = formData.cvType === 'cover_letter'
  const started = Date.now()
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: isLetter ? 4000 : 6000,
    system: CV_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildGenerationPrompt(formData) }],
  })
  const raw = message.content.map(b => (b.type === 'text' ? b.text : '')).join('')
  const doc = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()) as GeneratedCV
  if (isLetter) {
    const frame = buildCoverLetterFrame({ addressee: formData.addressee, company: formData.company, companyAddress: formData.companyAddress })
    doc.clRecipient = frame.clRecipient
    doc.clSalutation = frame.clSalutation
    doc.clSignOff = frame.clSignOff
    doc.clSubject = (doc.clSubject?.trim() || defaultSubject(doc.jobTitle)).toUpperCase()
  }
  return { doc, usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, ms: Date.now() - started } }
}
