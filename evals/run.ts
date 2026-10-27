// Runs the CV / cover-letter test set and scores every document.
//
//   npx tsx --env-file=.env.local evals/run.ts                    new engine, synthetic cases
//   npx tsx --env-file=.env.local evals/run.ts --engine legacy    the engine before v2 (baseline)
//   options: --private (add evals/private/cases.json — real CVs, never committed)
//            --only id1,id2   --effort low|medium|high   --label name   --concurrency 3
//
// Results: evals/results/<label>/<case>.json (the full documents, for reading)
// and evals/results/<label>/summary.md. Compare two runs with evals/judge.ts.
import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'
// pdf-parse's index runs a self-test when it has no parent module (as under tsx); the lib entry doesn't.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import type { CVFormData, GeneratedCV } from '@/types'
import { writeDocument, cvFormDataFromRequest, serializeCV, type Effort } from '@/lib/cvEngine'
import { extractWithClaude } from '@/lib/fileText'
import { legacyWrite } from './legacy/writer.legacy'
import { scoreCv, scoreLetter, type Check, type Expect } from './score'

interface Case {
  id: string; about?: string; file?: string
  input: Record<string, any> & { cvType: string; formData?: CVFormData }
  letter?: { jobDescription?: string; company?: string }
  expect: Expect
}
interface Usage { inputTokens: number; outputTokens: number; ms: number }
interface Result {
  id: string; about?: string; engine: string; effort?: Effort; checks: Check[]; usage: Usage[]; ms: number
  doc?: GeneratedCV; letter?: GeneratedCV; error?: string; inputText?: string
}

const args = process.argv.slice(2)
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const engine = (opt('engine') || 'new') as 'new' | 'legacy'
const effort = opt('effort') as Effort | undefined
const label = opt('label') || `${engine}${effort ? '-' + effort : ''}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}`
const only = opt('only')?.split(',')
const concurrency = Number(opt('concurrency') || 3)
const PRICE = engine === 'new' ? { in: 4, out: 20 } : { in: 5, out: 25 }   // $ per million tokens

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const load = (f: string): Case[] => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'))
let cases = load('cases.json')
if (args.includes('--private')) cases = cases.concat(load('private/cases.json'))
if (only) cases = cases.filter(c => only.includes(c.id))
const outDir = path.join(here, 'results', label)
fs.mkdirSync(outDir, { recursive: true })

async function fileText(file: string): Promise<string> {
  const buffer = fs.readFileSync(file)
  if (/\.docx?$/i.test(file)) return (await mammoth.extractRawText({ buffer })).value
  const text = (await pdfParse(buffer)).text || ''
  return text.trim().length >= 50 ? text : extractWithClaude(buffer, 'application/pdf')
}

const write = (formData: CVFormData) => engine === 'new' ? writeDocument(formData, effort) : legacyWrite(formData)

async function runCase(c: Case): Promise<Result> {
  const t0 = Date.now()
  const usage: Usage[] = []
  try {
    const rawContent = c.file ? await fileText(c.file) : c.input.rawContent
    const formData: CVFormData = c.input.formData || cvFormDataFromRequest({ ...c.input, rawContent })
    const inputText = [rawContent, ...Object.values(c.input.formData || {}), c.input.changes, c.input.jobDescription, c.input.jobTitle, c.input.targetIndustry, c.input.company, c.input.targetProgramme].filter(v => typeof v === 'string').join('\n')

    const first = await write(formData)
    usage.push(first.usage)
    const checks: Check[] = []
    let doc: GeneratedCV | undefined, letter: GeneratedCV | undefined
    if (c.expect.letterOnly) {
      letter = first.doc
      checks.push(...scoreLetter(letter, inputText, c.expect))
    } else {
      doc = first.doc
      checks.push(...scoreCv(doc, inputText, c.expect, c.input.cvType))
      if (c.letter) {
        // As the results page does it: the letter is written from the finished CV.
        const lf: CVFormData = {
          cvType: 'cover_letter', fullName: doc.fullName || '', email: doc.email || '', phone: doc.phone || '', location: doc.location || '',
          jobTitle: engine === 'legacy' ? (doc.jobTitle || '') : '',
          rawContent: serializeCV(doc), jobDescription: c.letter.jobDescription, company: c.letter.company,
        }
        const l = await write(lf)
        usage.push(l.usage)
        letter = l.doc
        checks.push(...scoreLetter(letter, `${inputText}\n${c.letter.jobDescription || ''}`, c.expect))
      }
    }
    const result: Result = { id: c.id, about: c.about, engine, effort, checks, usage, doc, letter, inputText, ms: Date.now() - t0 }
    fs.writeFileSync(path.join(outDir, `${c.id}.json`), JSON.stringify(result, null, 2))
    return result
  } catch (err: any) {
    if (c.expect.rejects && err?.kind === 'not_a_cv') {
      const result: Result = { id: c.id, about: c.about, engine, effort, checks: [{ name: 'refuses a non-CV input', level: 'hard', pass: true }], usage, ms: Date.now() - t0 }
      fs.writeFileSync(path.join(outDir, `${c.id}.json`), JSON.stringify(result, null, 2))
      return result
    }
    const result: Result = { id: c.id, about: c.about, engine, effort, error: String(err?.message || err), checks: [], usage, ms: Date.now() - t0 }
    fs.writeFileSync(path.join(outDir, `${c.id}.json`), JSON.stringify(result, null, 2))
    return result
  }
}

async function main() {
  console.log(`Running ${cases.length} case(s) on the ${engine} engine${effort ? ` (effort ${effort})` : ''} → evals/results/${label}`)
  const results: Result[] = []
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, async () => {
    while (next < cases.length) {
      const c = cases[next++]
      const r = await runCase(c)
      const hard = r.checks.filter(k => k.level === 'hard')
      console.log(`${r.error ? '✗ ERROR' : hard.every(k => k.pass) ? '✓' : '✗'} ${c.id.padEnd(30)} hard ${hard.filter(k => k.pass).length}/${hard.length}  ${(r.ms / 1000).toFixed(0)}s${r.error ? '  ' + r.error : ''}`)
      results.push(r)
    }
  }))

  results.sort((a, b) => cases.findIndex(c => c.id === a.id) - cases.findIndex(c => c.id === b.id))
  const lines = [`# ${label}`, '', `Engine: ${engine}${effort ? `, effort ${effort}` : ''} · ${results.length} case(s)`, '', '| Case | Hard | Soft | Time | Failures |', '|---|---|---|---|---|']
  let hardPass = 0, hardAll = 0, softPass = 0, softAll = 0, tokIn = 0, tokOut = 0, errors = 0
  const writerMs: number[] = []
  for (const r of results) {
    const hard = r.checks.filter(k => k.level === 'hard'), soft = r.checks.filter(k => k.level === 'soft')
    hardPass += hard.filter(k => k.pass).length; hardAll += hard.length
    softPass += soft.filter(k => k.pass).length; softAll += soft.length
    for (const u of r.usage) { tokIn += u.inputTokens; tokOut += u.outputTokens; writerMs.push(u.ms) }
    if (r.error) errors++
    const fails = r.error ? `ERROR: ${r.error}` : r.checks.filter(k => !k.pass).map(k => `${k.level === 'hard' ? '**' : ''}${k.name}${k.level === 'hard' ? '**' : ''}${k.detail ? ` (${k.detail})` : ''}`).join('; ')
    lines.push(`| ${r.id} | ${hard.filter(k => k.pass).length}/${hard.length} | ${soft.filter(k => k.pass).length}/${soft.length} | ${(r.ms / 1000).toFixed(0)}s | ${fails} |`)
  }
  // Two applicants must never get the same letter. Openings are drawn from a
  // small set of formal phrases, so compare beyond the phrase (15 words).
  const openings = results.filter(r => r.letter?.coverLetterBody).map(r => ({ id: r.id, open: r.letter!.coverLetterBody!.split(/\s+/).slice(0, 15).join(' ').toLowerCase() }))
  const repeated = openings.filter((o, i) => openings.some((p, j) => j !== i && p.open === o.open))
  lines.push('', `**Letter openings:** ${openings.length} letters, ${repeated.length ? `repeated: ${repeated.map(o => `${o.id} ("${o.open}…")`).join(', ')}` : 'all different'}`)

  writerMs.sort((a, b) => a - b)
  const median = writerMs.length ? writerMs[Math.floor(writerMs.length / 2)] / 1000 : 0
  const cost = (tokIn * PRICE.in + tokOut * PRICE.out) / 1e6
  lines.push('', `**Hard checks:** ${hardPass}/${hardAll} · **Soft checks:** ${softPass}/${softAll} · **Errors:** ${errors}`,
    `**Median time per document:** ${median.toFixed(0)}s (slowest ${((writerMs.at(-1) || 0) / 1000).toFixed(0)}s) · **Cost:** $${cost.toFixed(2)} total, $${(cost / Math.max(1, writerMs.length)).toFixed(3)} per document (system-prompt caching not counted)`)
  fs.writeFileSync(path.join(outDir, 'summary.md'), lines.join('\n'))
  console.log('\n' + lines.slice(-2).join('\n'))
}

main().catch(e => { console.error(e); process.exit(1) })
