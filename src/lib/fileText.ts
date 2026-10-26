import Anthropic from '@anthropic-ai/sdk'

// Reading an uploaded CV or advert, shared by /api/extract-content and the
// eval runner (evals/) so private test cases are read exactly as customers' are.

export const CLAUDE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
export type ClaudeImageType = typeof CLAUDE_IMAGE_TYPES[number]

let client: Anthropic | null = null
const ai = () => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

export async function extractWithClaude(buffer: Buffer, mediaType: 'application/pdf' | ClaudeImageType): Promise<string> {
  const data = buffer.toString('base64')
  const source = mediaType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: mediaType, data } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data } }
  const message = await ai().messages.create({
    // Opus over Sonnet here on purpose: this call reads real phone photos of
    // CVs — often skewed, poorly lit, or slightly blurry — where the extra
    // interpretive accuracy matters more than the cost difference. Both are in
    // the high-resolution vision tier (2576px long edge), so Opus's edge here
    // is model quality, not image resolution.
    model: 'claude-opus-5',
    max_tokens: 8000,
    // Opus 5 runs adaptive thinking whenever this field is omitted, and
    // max_tokens caps thinking and output together. Transcription needs no
    // reasoning, so turning it off keeps the whole budget for the extracted
    // text. Valid because effort is left at its high default here — disabled
    // thinking on Opus 5 only 400s above that (xhigh/max).
    thinking: { type: 'disabled' },
    messages: [{
      role: 'user',
      content: [
        source,
        { type: 'text', text: 'Extract all text from this document or image exactly as it appears. Do not summarise. Return only the raw text.' },
      ],
    }],
  })
  return message.content.map(b => (b.type === 'text' ? b.text : '')).join('')
}
