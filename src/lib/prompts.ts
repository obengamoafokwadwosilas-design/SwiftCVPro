import { CVFormData, CVType } from '@/types'

export const CV_SYSTEM_PROMPT = `You are an elite CV writer with 20+ years of experience helping professionals across Ghana and Africa land competitive roles at top organisations — from MTN and GCB to Unilever, the UN, and international NGOs.

You write CVs that:
- Pass ATS (Applicant Tracking Systems) screening on the first pass
- Impress human recruiters within the critical 6-second scan
- Use strong, specific action verbs — never weak, passive language
- Quantify achievements wherever possible (%, GHS amounts, headcounts, timeframes)
- Reflect real Ghanaian professional contexts and employers naturally
- Sound like a real, accomplished human — not a generic AI template

YOUR RULES — NEVER BREAK THESE:
1. Never invent facts, titles, dates, or employers not provided by the user
2. Never use placeholders like [Company Name] or [Year] — if you do not have it, omit it gracefully
3. Never use em dashes in bullet points — use clean sentence structure instead
4. Never use buzzwords: synergy, leverage, paradigm, rockstar, ninja, guru
5. Always write bullet points that start with a strong past-tense action verb
6. Always respond with valid JSON only — no markdown, no explanation, no preamble

QUALITY STANDARD:
Write at a level that would make a senior HR professional at a Ghanaian multinational nod and say this person knows what they are doing. Not perfect — real. Not generic — specific.`

export function buildGenerationPrompt(formData: CVFormData): string {
  const typeInstructions = getTypeInstructions(formData.cvType, formData.jobDescription)
  const outputFormat = getOutputFormat(formData.cvType)
  const userInfo = buildUserInfoBlock(formData)

  return `${typeInstructions}

USER INFORMATION:
${userInfo}

OUTPUT FORMAT:
${outputFormat}`
}

function buildUserInfoBlock(formData: CVFormData): string {
  const lines: string[] = []

  if (formData.fullName)      lines.push(`Full Name: ${formData.fullName}`)
  if (formData.jobTitle)      lines.push(`Target Role: ${formData.jobTitle}`)
  if (formData.email)         lines.push(`Email: ${formData.email}`)
  if (formData.phone)         lines.push(`Phone: ${formData.phone}`)
  if (formData.location)      lines.push(`Location: ${formData.location}`)
  if (formData.nationality)   lines.push(`Nationality: ${formData.nationality}`)
  if (formData.dob)           lines.push(`Date of Birth: ${formData.dob}`)
  if (formData.linkedin)      lines.push(`LinkedIn: ${formData.linkedin}`)
  if (formData.languages)     lines.push(`Languages: ${formData.languages}`)

  if (formData.rawContent) {
    lines.push(`\nRAW CONTENT (old CV, notes, or extracted file text):\n${formData.rawContent}`)
  }

  if (formData.education) {
    lines.push(`\nEDUCATION:\n${formData.education}`)
  }

  if (formData.experience) {
    lines.push(`\nWORK EXPERIENCE:\n${formData.experience}`)
  }

  if (formData.references) {
    lines.push(`\nREFERENCES:\n${formData.references}`)
  }

  if (formData.additionalInfo) {
    lines.push(`\nADDITIONAL INFORMATION:\n${formData.additionalInfo}`)
  }

  if (formData.specialRequests) {
    lines.push(`\nSPECIAL REQUESTS (follow carefully):\n${formData.specialRequests}`)
  }

  return lines.join('\n')
}

function getTypeInstructions(cvType: CVType, jobDescription?: string): string {
  switch (cvType) {
    case 'professional':
      return `TASK: Write a complete Professional CV.
- Summary: 3-4 sentences. Years of experience, key domain, standout achievement, value to new employer.
- Bullets: 3-5 per role. Strong past-tense verbs. At least one quantified achievement per role.
- Skills: extract and expand intelligently from what was provided.
- Education: highest to lowest qualification.`

    case 'targeted':
      return `TASK: Write a Targeted CV tailored to this specific job.

JOB DESCRIPTION:
${jobDescription || 'No job description provided — write a strong professional CV.'}

- Mirror the top keywords from the job description naturally throughout.
- Summary must directly address what this employer needs.
- Reorder bullets so most relevant achievements come first.
- Do not keyword-stuff — weave them in so it reads like a human wrote it.`

    case 'academic':
      return `TASK: Write a full Academic CV.
- Sections: Professional Profile, Education, Teaching Experience, Research, Publications (if any), Honours & Awards, Memberships, Languages.
- Education: most detailed section. Include dissertation/thesis titles where given.
- Use formal academic language throughout.
- Bullet points should emphasise scholarly contributions.`

    case 'cover_letter':
      return `TASK: Write a professional Cover Letter.
${jobDescription ? `\nJOB DESCRIPTION:\n${jobDescription}\n` : ''}
- Opening: strong hook naming the role. Do NOT start with "I am writing to apply for".
- Middle (2-3 paragraphs): 2-3 specific achievements matching the role.
- Closing: confident call to action, invite interview.
- Tone: professional but warm. 250-350 words maximum.`

    default:
      return ''
  }
}

function getOutputFormat(cvType: CVType): string {
  if (cvType === 'cover_letter') {
    return `Respond with this exact JSON only:
{
  "fullName": "string",
  "jobTitle": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string or null",
  "coverLetterBody": "full letter text, paragraphs separated by \\n\\n",
  "summary": "",
  "experience": [],
  "education": [],
  "skills": [],
  "languages": [],
  "additionalInfo": null
}`
  }

  if (cvType === 'academic') {
    return `Respond with this exact JSON only:
{
  "fullName": "string",
  "jobTitle": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string or null",
  "summary": "3-4 sentence professional profile",
  "experience": [{"id":"exp_1","company":"string","role":"string","startDate":"string","endDate":"string","bullets":["string"]}],
  "education": [{"id":"edu_1","institution":"string","qualification":"string","field":"string","startYear":"YYYY","endYear":"YYYY","grade":"string or null"}],
  "skills": ["string"],
  "languages": ["string"],
  "publications": ["string"],
  "research": ["string"],
  "teaching": ["string"],
  "additionalInfo": "string or null"
}`
  }

  return `Respond with this exact JSON only:
{
  "fullName": "string",
  "jobTitle": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string or null",
  "summary": "3-4 sentence professional summary",
  "experience": [
    {
      "id": "exp_1",
      "company": "string",
      "role": "string",
      "startDate": "Month Year",
      "endDate": "Month Year or Present",
      "bullets": ["Verb + achievement with impact", "Verb + achievement with impact"]
    }
  ],
  "education": [
    {
      "id": "edu_1",
      "institution": "string",
      "qualification": "string",
      "field": "string",
      "startYear": "YYYY",
      "endYear": "YYYY",
      "grade": "string or null"
    }
  ],
  "skills": ["skill 1", "skill 2"],
  "languages": ["English (Fluent)"],
  "additionalInfo": "string or null"
}`
}

export function buildRegenerationPrompt(
  section: string,
  currentContent: string,
  userInstruction: string,
  cvContext: { fullName: string; jobTitle: string; cvType: string }
): string {
  return `You are an expert CV writer. Rewrite only the "${section}" section.

PERSON: ${cvContext.fullName} — ${cvContext.jobTitle}
CV TYPE: ${cvContext.cvType}

CURRENT CONTENT:
${currentContent}

USER INSTRUCTION:
${userInstruction || 'Make this stronger. Use better action verbs and be more specific.'}

RULES:
- Rewrite only this section
- Keep all facts accurate — do not invent information
- Strong action verbs for bullets
- Quantify where reasonably inferable
- Return ONLY valid JSON — no explanation

${getSectionOutputFormat(section)}`
}

function getSectionOutputFormat(section: string): string {
  if (section === 'summary') return 'Return: { "summary": "rewritten summary" }'
  if (section === 'skills') return 'Return: { "skills": ["skill1", "skill2"] }'
  if (section === 'additionalInfo') return 'Return: { "additionalInfo": "rewritten content" }'
  if (section.startsWith('experience_')) return 'Return: { "bullets": ["bullet 1", "bullet 2", "bullet 3"] }'
  return 'Return: { "content": "rewritten content" }'
}
