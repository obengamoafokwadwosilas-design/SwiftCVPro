import { CVFormData, CVType } from '@/types'

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────
export const CV_SYSTEM_PROMPT = `You are an elite CV writer with 25+ years of experience. You have personally helped over 5,000 professionals across Ghana, Nigeria, Kenya, and the UK land senior roles at MTN, GCB, Stanbic, Unilever, Deloitte, PwC, the UN, World Bank, and top NGOs.

Your writing voice is HIGH-END:
- Crisp, confident, never wordy
- Specific and quantified (numbers, GHS amounts, percentages, headcounts, scope, timeframes)
- Past-tense action verbs that command respect: led, delivered, transformed, secured, designed, launched, scaled, negotiated, championed
- Never generic — every line is tailored to the actual person
- Reads like a senior consultant wrote it, not an AI

YOUR ABSOLUTE RULES:
1. NEVER invent facts, employers, dates, salaries, or qualifications not provided
2. NEVER use placeholders like [Company] or [Year] — if missing, omit gracefully
3. NEVER use buzzwords: synergy, leverage, paradigm, rockstar, ninja, guru, passionate, hardworking
4. NEVER start two bullets with the same verb in the same role
5. NEVER write a bullet shorter than 12 words or longer than 28 words
6. ALWAYS quantify at least 60% of bullets with real or reasonably inferred numbers
7. ALWAYS respond with valid JSON ONLY — no markdown fences, no explanation, no preamble
8. ALWAYS make the summary feel like an executive bio — confident, specific, distinctive

QUALITY BAR:
A senior recruiter at PwC Accra should read this CV and want to call the person within 30 seconds. If the writing feels even slightly generic, rewrite it sharper. Every word earns its place.

MATCH SENIORITY TO EVIDENCE:
- Write at the level the person's actual input supports. Do not inflate limited experience into seniority, and do not write a student or early-career person in a seasoned-executive voice.
- If the input shows little or no professional experience, or indicates the person is currently studying, lead with education, projects, internships, coursework, and volunteering; keep the tone capable and emerging rather than senior; and never assign a job-title headline the person has not actually held (use a field-based or direction headline such as "Final-Year Economics Student" or "Aspiring Data Analyst", or omit the headline).
- Judge this conservatively from real signals. A career-changer, someone with a gap, or a returning professional is NOT a student — when unsure, use the normal professional treatment. Never call an experienced person "aspiring".

HEADLINE (jobTitle):
- For a targeted CV, align the headline to the role being applied for (only where the person's background genuinely supports it).
- For a general CV, use the most senior or representative title from the person's real history — not merely their latest job.
- Never invent a title the person has not held.

LOCATION INFERENCE:
- Use any location the user provided verbatim. Never override a provided location.
- You may state the established location of a WELL-KNOWN employer or institution (e.g. KNUST → Kumasi, University of Ghana → Accra, MTN, GCB, Stanbic). Ghanaian universities have fixed, known locations — placing them is safe.
- For any company or school you cannot place with genuine confidence, OMIT the location rather than guess. A missing city is invisible; a wrong city is a verifiable error on a document going to an employer.
- NEVER let the applicant's home city stand in for the location of a workplace you cannot place. You cannot look anything up live — rely only on what is genuinely well-known.

SKILLS (evidence-gated):
- Prefer hard, specific, demonstrable skills drawn from what the person actually did.
- Include a soft skill ONLY when a bullet in their experience proves it (e.g. "supervised 4 staff" → "Team Leadership"). Never pad the list with generic soft skills like "Communication", "Teamwork", or "Problem-solving" just to look fuller — an unproven soft skill weakens the CV.`

// ─────────────────────────────────────────────────────────────
// MAIN PROMPT BUILDER
// ─────────────────────────────────────────────────────────────
export function buildGenerationPrompt(formData: CVFormData): string {
  const typeInstructions = getTypeInstructions(formData)
  const outputFormat = getOutputFormat(formData.cvType)
  const userInfo = buildUserInfoBlock(formData)

  return `${typeInstructions}

USER INFORMATION:
${userInfo}

CRITICAL OUTPUT REQUIREMENTS:
- Write a CV that genuinely impresses. The user is paying GHS 35 for excellence.
- If the user's input is sparse or messy, infer professionally and elevate the writing — but never fabricate facts.
- Each bullet must demonstrate IMPACT, not just describe duty.
- Wrong: "Responsible for managing the IT team"
- Right: "Led 8-person IT team supporting 2,400 users across 14 branches; reduced ticket resolution time by 38%"

ADDITIONAL INFORMATION (only from what the user actually provided — never invent):
- Order by recruiter value: (1) professional licences & memberships with the body named (e.g. ICAG, GIHRM, Nursing & Midwifery Council of Ghana, GhIE, the Bar); (2) certifications not tied to a degree (e.g. PMP, Google, Cisco, safety certs); (3) references — write "Available on request" if the user did not list referees; (4) volunteering, leadership roles, and genuinely relevant interests, last and only where they add signal.
- If the user provided none of the above, return null. Do not manufacture content to fill the section.

DO NOT WEAKEN THE CV:
- Never ADD or infer marital status, religion, date of birth, a photo, or hobbies-for-the-sake-of-hobbies — these date a CV and hurt modern and international applications. Do not include them just because they might be expected. Include an interest ONLY if it carries real professional signal.
- If the user explicitly provided one of these, you may keep it (it is their choice) but keep it minimal and never lead with it.

OUTPUT JSON FORMAT (return ONLY this, no markdown):
${outputFormat}`
}

// ─────────────────────────────────────────────────────────────
// USER INFO BLOCK — feeds all form fields into the prompt
// ─────────────────────────────────────────────────────────────
function buildUserInfoBlock(formData: CVFormData): string {
  const lines: string[] = []

  // Personal details
  if (formData.fullName)      lines.push(`Full Name: ${formData.fullName}`)
  if (formData.jobTitle)      lines.push(`Target Role / Current Title: ${formData.jobTitle}`)
  if (formData.email)         lines.push(`Email: ${formData.email}`)
  if (formData.phone)         lines.push(`Phone: ${formData.phone}`)
  if (formData.location)      lines.push(`Location: ${formData.location}`)
  if (formData.nationality)   lines.push(`Nationality: ${formData.nationality}`)
  if (formData.dob)           lines.push(`Date of Birth: ${formData.dob}`)
  if (formData.linkedin)      lines.push(`LinkedIn: ${formData.linkedin}`)
  if (formData.languages)     lines.push(`Languages: ${formData.languages}`)

  // Raw content (paste/upload path)
  if (formData.rawContent)    lines.push(`\nRAW CONTENT (old CV / notes / extracted file text):\n${formData.rawContent}`)

  // Form path structured fields
  if (formData.education) {
    lines.push(`\nEDUCATION:\n${formData.education}`)
    // Academic optional extras
    if (formData.gpa)         lines.push(`GPA / Class of Degree: ${formData.gpa}`)
    if (formData.thesis)      lines.push(`Thesis / Dissertation Title: ${formData.thesis}`)
    if (formData.research)    lines.push(`Research Undertaken: ${formData.research}`)
  }

  if (formData.experience) {
    lines.push(`\nWORK EXPERIENCE:\n${formData.experience}`)
    // Academic experience extras
    if (formData.publications)  lines.push(`Publications & Papers:\n${formData.publications}`)
    if (formData.teaching)      lines.push(`Teaching Experience:\n${formData.teaching}`)
    if (formData.conferences)   lines.push(`Conferences & Presentations:\n${formData.conferences}`)
  }

  if (formData.extras) {
    lines.push(`\nSKILLS & EXTRA DETAILS:\n${formData.extras}`)
    // Academic extras
    if (formData.grants)        lines.push(`Grants & Fellowships:\n${formData.grants}`)
    if (formData.supervision)   lines.push(`Student Supervision:\n${formData.supervision}`)
    if (formData.orcid)         lines.push(`ORCID ID: ${formData.orcid}`)
  }

  if (formData.references)      lines.push(`\nREFERENCES:\n${formData.references}`)
  if (formData.additionalInfo)  lines.push(`\nADDITIONAL INFORMATION:\n${formData.additionalInfo}`)
  if (formData.specialRequests) lines.push(`\nSPECIAL REQUESTS (follow carefully):\n${formData.specialRequests}`)

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// TYPE INSTRUCTIONS
// ─────────────────────────────────────────────────────────────
function getTypeInstructions(formData: CVFormData): string {
  const { cvType, jobDescription, company, whyRole } = formData

  switch (cvType) {

    case 'professional':
    case 'targeted': {
      const base = `TASK: Write a Professional CV that commands attention.

STRUCTURE & STANDARDS:
- SUMMARY (3-4 sentences): Open with years of experience and domain expertise. Include one signature achievement with numbers. End with what value the person brings to a future employer. Make it sound like an executive bio, not a job-seeker plea.

- EXPERIENCE BULLETS: 4-5 per role for senior positions, 3-4 for junior.
  • Start each bullet with a different strong past-tense verb
  • Lead with the impact (number, scale, outcome)
  • Follow with the action (what they did)
  • Optionally end with the context (for whom, where)
  • Example: "Reduced operational costs by GHS 240,000 annually by restructuring procurement across 6 departments"

- SKILLS: Extract from the user's actual experience. Group by category if 8+ skills. Use industry-standard names.

- EDUCATION: Highest first. Include grade/class only if shared.

TONE: Confident senior professional. Never apologetic, never overstated. Specific over generic, always.`

      // Optional tailoring: only when the user provided a job description.
      if (jobDescription && jobDescription.trim()) {
        return `${base}

TAILOR THIS CV TO THE JOB BELOW:
${jobDescription}
${company ? `\\nTARGET COMPANY: ${company}` : ''}

TAILORING APPROACH:
- Read the job description carefully. Identify the top 5-7 skills, keywords, and competencies the employer wants.
- Weave those keywords NATURALLY into the summary, bullets, and skills section — only where the person's real experience supports them. Never claim a skill the person has not shown.
- Reorder bullets within each role so the most job-relevant achievement appears first.
- The summary must directly address why THIS person fits THIS role — specific, not generic.
- Do NOT keyword-stuff. Read it back — does it sound natural? If not, rewrite.
- Match the seniority and tone of the role, but stay truthful to the person's actual level (see MATCH SENIORITY TO EVIDENCE).

QUALITY: A hiring manager should read the first 6 lines and say "this person is exactly who we need."`
      }

      return base
    }

    case 'academic':
      return `TASK: Write a full Academic CV in scholarly format.

SECTIONS (in this order, include only those with content):
- Professional Profile / Research Statement (4-5 sentences, scholarly tone)
- Education (most recent first — include thesis/dissertation titles if mentioned, GPA if provided)
- Teaching Experience (courses taught, levels, institutions — only if provided)
- Research Experience (projects, methodologies, funding — only if provided)
- Publications (use scholarly citation format — only if provided, NEVER fabricate)
- Conference Presentations (only if mentioned)
- Honours, Awards & Fellowships (only if mentioned)
- Professional Memberships (only if mentioned)
- Languages
- References

TONE: Scholarly, precise, no marketing language. Use academic conventions throughout.
CRITICAL: Never fabricate publications, conference presentations, awards, or affiliations.`


    case 'cover_letter':
      return `TASK: Write a powerful, personalised cover letter — NOT a CV.

THE JOB:
${jobDescription || 'No job description provided — write a strong general cover letter.'}
${company ? `\nCOMPANY: ${company}` : ''}
${whyRole ? `\nWHY THE CANDIDATE WANTS THIS ROLE (use this authentically):\n${whyRole}` : ''}

LETTER STRUCTURE (4 paragraphs):
- Para 1 (Hook): State the role being applied for. Open with a specific, attention-grabbing statement about fit — quantified achievement preferred. Avoid "I am writing to apply for..." clichés.
- Para 2 (Why You): 2-3 specific, quantified achievements that directly map to what the role requires. Show, don't tell.
- Para 3 (Why Them): If company name provided, show genuine knowledge of/interest in the employer. If no company, focus on value brought to any employer in this field.
- Para 4 (Close): Clear, confident call to action. Available to discuss. Thank them.

LENGTH: 250-320 words. Tight, professional, never rambling.
TONE: Confident, warm, professional. Never desperate, never generic.
OUTPUT NOTE: Put the entire letter body into "coverLetterBody". Still include name, contact, jobTitle in JSON.`

    default:
      return ''
  }
}

// ─────────────────────────────────────────────────────────────
// OUTPUT FORMAT — what the AI returns as JSON
// ─────────────────────────────────────────────────────────────
function getOutputFormat(cvType: CVType): string {
  if (cvType === 'cover_letter') {
    return `{
  "fullName": "string",
  "jobTitle": "string (target role)",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string or null",
  "summary": "",
  "experience": [],
  "education": [],
  "skills": [],
  "languages": [],
  "coverLetterBody": "Full cover letter text — 4 paragraphs separated by \\n\\n. Start directly with paragraph 1, no greeting line."
}`
  }

  if (cvType === 'academic') {
    return `{
  "fullName": "string",
  "jobTitle": "string (academic position or research focus)",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string or null",
  "summary": "Research/Professional Profile — 4-5 scholarly sentences",
  "experience": [
    {
      "id": "exp1",
      "role": "string",
      "company": "string (institution)",
      "startDate": "string",
      "endDate": "string",
      "bullets": ["3-4 scholarly bullets per role"]
    }
  ],
  "education": [
    {
      "id": "edu1",
      "qualification": "string (e.g. PhD, MA, BSc)",
      "field": "string",
      "institution": "string",
      "startYear": "string",
      "endYear": "string",
      "grade": "thesis title or grade if known, else null"
    }
  ],
  "skills": ["research methods and technical competencies"],
  "languages": ["array"],
  "publications": ["scholarly citation format strings — only if provided"],
  "research": ["research projects array — only if provided"],
  "teaching": ["courses taught array — only if provided"],
  "additionalInfo": "awards, fellowships, memberships, conference presentations if provided — else null"
}`
  }

  // Professional and Targeted CV
  return `{
  "fullName": "string",
  "jobTitle": "string (target role or current title)",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string or null",
  "summary": "Executive-level professional summary — 3-4 sentences, confident, specific, quantified",
  "experience": [
    {
      "id": "exp1",
      "role": "string",
      "company": "string",
      "startDate": "string (e.g. Mar 2021)",
      "endDate": "string (e.g. Present or Aug 2023)",
      "bullets": ["3-5 strong, quantified impact bullets per role"]
    }
  ],
  "education": [
    {
      "id": "edu1",
      "qualification": "string (e.g. BSc, MBA, MSc)",
      "field": "string",
      "institution": "string",
      "startYear": "string",
      "endYear": "string",
      "grade": "string if known, else null"
    }
  ],
  "skills": ["8-12 strong industry-standard skills"],
  "languages": ["array if known"],
  "additionalInfo": "awards, certifications, memberships, or null"
}`
}

// ─────────────────────────────────────────────────────────────
// REGENERATION PROMPT — for section-level rewrites on preview
// ─────────────────────────────────────────────────────────────
export function buildRegenerationPrompt(
  section: string,
  currentContent: any,
  instruction: string,
  cvContext: { fullName: string; jobTitle: string; cvType: string }
): string {
  return `You are improving a single section of an existing CV.

PERSON: ${cvContext.fullName}, ${cvContext.jobTitle}
CV TYPE: ${cvContext.cvType}
SECTION TO REWRITE: ${section}
USER'S INSTRUCTION: ${instruction || 'Make this stronger. Use better action verbs and be more specific.'}

CURRENT CONTENT:
${JSON.stringify(currentContent, null, 2)}

Rewrite this section following the user's instruction. Keep the same JSON structure. Make it sharper, more specific, and more impactful. Never fabricate facts.

Return ONLY the new JSON for this section — no markdown, no explanation.`
}

function getSectionOutputFormat(section: string): string {
  if (section === 'summary') return 'Return: { "summary": "rewritten summary" }'
  if (section === 'skills') return 'Return: { "skills": ["skill1", "skill2"] }'
  if (section === 'additionalInfo') return 'Return: { "additionalInfo": "rewritten content" }'
  if (section.startsWith('experience_')) return 'Return: { "bullets": ["bullet 1", "bullet 2", "bullet 3"] }'
  return 'Return: { "content": "rewritten content" }'
}
