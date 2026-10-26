// Checks the scorecard itself, offline (no AI calls): a deliberately flawed CV
// must fail exactly the checks it breaks, and a clean one must pass them.
//   npx tsx evals/selftest.ts
import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import type { GeneratedCV } from '@/types'
import { scoreCv, scoreLetter } from './score'

const input = 'Gifty Amponsah. Accounts Clerk, Sunyani Municipal Assembly 2018 - present. Prepare payment vouchers. Reconcile revenue accounts. Principal Administrative Assistant. Student Enrollment Committee. Phone 0557 334 120.'
const base: GeneratedCV = {
  fullName: 'Gifty Amponsah', jobTitle: '', email: 'g@x.com', phone: '0557 334 120', location: 'Sunyani',
  summary: 'Accounts clerk with 6 years of public-sector experience in payments and reconciliations.',
  experience: [{ id: 'exp1', role: 'Accounts Clerk', company: 'Sunyani Municipal Assembly', startDate: '2018', endDate: 'Present',
    bullets: ['Prepared payment vouchers for the Assembly, checking each against approved budgets before submission to the coordinating director.',
      'Reconciled the revenue accounts each month so internal auditors received complete, balanced records for review.'] }],
  education: [], skills: ['Payment vouchers', 'Account reconciliation'], attributes: [], languages: [],
  extraSections: [], changesReport: [],
}
const flawed: GeneratedCV = JSON.parse(JSON.stringify(base))
flawed.jobTitle = 'Senior Accountant'
flawed.experience[0].role = 'Principal Administrative Officer'
flawed.experience[0].startDate = '01/2018'
flawed.experience[0].bullets[0] = 'Processed 1,200 payment vouchers monthly, cutting approval time by 35% and saving GHS 40,000 for the organization.'
flawed.summary = 'Passionate, results-driven accounts clerk with [Number] years of experience.'

const fails = (cv: GeneratedCV) => scoreCv(cv, input, { facts: ['Principal Administrative Assistant|Accounts Clerk'], absent: ['Principal Administrative Officer'] }, 'professional').filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`)
console.log('CLEAN CV fails:', fails(base))
console.log('FLAWED CV fails:', fails(flawed))
const letter = { ...base, clSubject: 'APPLICATION FOR EMPLOYMENT', coverLetterBody: 'Dear Sir, I wish to apply. I saved 50 million cedis. Yours faithfully' } as GeneratedCV
console.log('FLAWED LETTER fails:', scoreLetter(letter, input, { letterSubjectIncludes: 'ACCOUNTS OFFICER' }).filter(c => !c.pass).map(c => c.name))

;(async () => {
  const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  const priv = path.join(here, 'private/cases.json')
  if (!fs.existsSync(priv)) return
  for (const c of JSON.parse(fs.readFileSync(priv, 'utf8'))) {
    const buf = fs.readFileSync(c.file)
    const text = /\.docx?$/i.test(c.file) ? (await mammoth.extractRawText({ buffer: buf })).value : (await pdfParse(buf)).text
    console.log(`${c.id.padEnd(22)} ${text.trim().length} chars${text.trim().length < 50 ? ' → needs AI reading (scan)' : ''}`)
  }
})()
