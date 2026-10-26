// Blind side-by-side judgement of two eval runs, case by case:
//   npx tsx --env-file=.env.local evals/judge.ts <labelA> <labelB>
// The judge sees the person's input and the two documents as "A" and "B" in a
// random order, never which engine wrote which. Writes judge-<A>-vs-<B>.md.
import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import type { GeneratedCV } from '@/types'
import { cvText } from './score'

const [labelA, labelB] = process.argv.slice(2)
if (!labelA || !labelB) { console.error('usage: evals/judge.ts <labelA> <labelB>'); process.exit(1) }
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const dir = (l: string) => path.join(here, 'results', l)
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CRITERIA = `Judge as an experienced Ghanaian recruiter and HR manager would.
1. TRUTH (most important): anything stated that the person's input does not support — invented numbers, results, skills, upgraded job titles — is a serious fault, however impressive it sounds.
2. INSTRUCTIONS: the person's change requests applied; the job advert or aim reflected honestly.
3. IMPACT: does it make the person sound capable and specific, at their real level? Would you call them?
4. READABILITY: clear, well ordered, no repetition or filler, right length.
For an academic CV, also: does it read unmistakably as an academic CV?`

const schema = {
  type: 'object', additionalProperties: false, required: ['winner', 'truth', 'impact', 'reason'],
  properties: {
    winner: { type: 'string', enum: ['A', 'B', 'tie'] },
    truth: { type: 'string', description: 'Any untrue or unsupported claims in A or B, or "none".' },
    impact: { type: 'string', description: 'Which reads stronger to a recruiter, and why, in one or two sentences.' },
    reason: { type: 'string', description: 'The deciding reason, in one sentence.' },
  },
}

const read = (l: string, id: string) => JSON.parse(fs.readFileSync(path.join(dir(l), `${id}.json`), 'utf8'))
const docText = (r: { doc?: GeneratedCV; letter?: GeneratedCV }) =>
  [r.doc ? cvText(r.doc) : '', r.letter ? `\n--- COVER LETTER ---\n${cvText(r.letter)}` : ''].join('')

async function main() {
  const ids = fs.readdirSync(dir(labelA)).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''))
    .filter(id => fs.existsSync(path.join(dir(labelB), `${id}.json`)))
  const cases = [...JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8')),
    ...(fs.existsSync(path.join(here, 'private/cases.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'private/cases.json'), 'utf8')) : [])]
  const tally = { [labelA]: 0, [labelB]: 0, tie: 0 } as Record<string, number>
  const rows: string[] = []
  for (const id of ids) {
    const a = read(labelA, id), b = read(labelB, id)
    if (a.error || b.error) { rows.push(`| ${id} | — | ${a.error ? labelA : labelB} errored |`); continue }
    const c = cases.find((x: any) => x.id === id)
    // For an uploaded file, the text the writer actually read (saved by run.ts).
    const input = c?.file ? (a.inputText || b.inputText || `(uploaded file ${path.basename(c.file)})`) : JSON.stringify(c?.input?.formData || c?.input || {}, null, 2)
    const flip = Math.random() < 0.5
    const [first, second] = flip ? [b, a] : [a, b]
    const message = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'high', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: `${CRITERIA}\n\nTHE PERSON'S INPUT:\n${input}\n\n=== DOCUMENT A ===\n${docText(first)}\n\n=== DOCUMENT B ===\n${docText(second)}\n\nWhich is better overall?` }],
    })
    const v = JSON.parse(message.content.map(x => (x.type === 'text' ? x.text : '')).join(''))
    const winner = v.winner === 'tie' ? 'tie' : (v.winner === 'A') !== flip ? labelA : labelB
    tally[winner]++
    rows.push(`| ${id} | ${winner} | ${v.reason} Truth: ${v.truth} |`)
    console.log(`${id.padEnd(30)} ${winner}`)
  }
  const md = [`# ${labelA} vs ${labelB}`, '', `**Wins:** ${labelA} ${tally[labelA]} · ${labelB} ${tally[labelB]} · tie ${tally.tie}`, '', '| Case | Better | Why |', '|---|---|---|', ...rows].join('\n')
  fs.writeFileSync(path.join(here, 'results', `judge-${labelA}-vs-${labelB}.md`), md)
  console.log(`\n${labelA} ${tally[labelA]} · ${labelB} ${tally[labelB]} · tie ${tally.tie}`)
}
main().catch(e => { console.error(e); process.exit(1) })
