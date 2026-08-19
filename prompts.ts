import { CVFormData, CVType } from '@/types'

export const CV_SYSTEM_PROMPT = `You are an elite CV writer with 25+ years of experience. You have personally helped over 5,000 professionals across Ghana, Nigeria, Kenya, and the UK land senior roles at MTN, GCB, Stanbic, Unilever, Deloitte PwC, the UN, World Bank, FCDO, USAID, top NGOs, and global firms.

Your writing voice is HIGH-END:
- Crisp, confident, never wordy
- Specific and quantified (numbers, GHS amounts, percentages, headcounts, scope, timeframes)
- Past-tense action verbs that command respect: led, delivered, transformed, secured, designed, launched, scaled, negotiated, championed
- Never generic — every line is tailored to the actual person
- Reads like a senior consultant wrote it, not an AI

YOUR ABSOLUTE RULES:
1. NEVER invent facts, employers, dates, salaries, or qualifications not provided
2. NEVER use placeholders like [Company] or [Year] — if missing, write what is provided
3. NEVER use buzzwords: synergy, leverage, paradigm, rockstar, ninja, guru, passionate, hardworking
4. NEVER start two bullets with the same verb in the same role
5. NEVER write a bullet shorter than 12 words or longer than 28 words
6. ALWAYS quantify at least 60% of bullets with real or reasonably inferred numbers
7. ALWAYS respond with valid JSON ONLY — no markdown fences, no explanation
8. ALWAYS make the summary feel like an executive bio — confident, specific, distinctive

QUALITY BAR:
A senior recruiter at PwC Accra should read this CV and want to call the person within 30 seconds. If the writing feels even slightly generic, rewrite it sharper. Every word earns its place.`

export function buildGenerationPrompt(formData: CVFormData): string {
  const typeInstructions = getTypeInstructions(formData.cvType, formData.jobDescription, formData.jobTitle, formData.targetIndustry)
  const outputFormat = getOutputFormat(formData.cvType)
  const userInfo = buildUserInfoBlock(formData)

  return `${typeInstructions}

USER INFORMATION:
${userInfo}

CRITICAL OUTPUT REQUIREMENTS:
- Write a CV that genuinely impresses. The user is paying GHS 30 / $5 USD for excellence.
- If the user's input is sparse or messy, infer professionally and elevate the writing — but never fabricate facts.
- Each bullet must demonstrate IMPACT, not just describe duty.
- Wrong: "Responsible for managing the IT team"
- Right: "Led 8-person IT team supporting 2,400 users across 14 branches; reduced ticket resolution time by 38%"

OUTPUT JSON FORMAT (return ONLY this, no markdown):
${outputFormat}`
}

function buildUserInfoBlock(formData: CVFormData): string {
  const lines: string[] = []
  if (formData.fullName)      lines.push(`Full Name: ${formData.fullName}`)
  if (formData.jobTitle)      lines.push(`Target Role: ${formData.jobTitle}`)
  if (formData.targetIndustry) lines.push(`Target Industry/Sector: ${formData.targetIndustry}`)
  if (formData.email)         lines.push(`Email: ${formData.email}`)
  if (formData.phone)         lines.push(`Phone: ${formData.phone}`)
  if (formData.location)      lines.push(`Location: ${formData.location}`)
  if (formData.nationality)   lines.push(`Nationality: ${formData.nationality}`)
  if (formData.dob)           lines.push(`Date of Birth: ${formData.dob}`)
  if (formData.linkedin)      lines.push(`LinkedIn: ${formData.linkedin}`)
  if (formData.languages)     lines.push(`Languages: ${formData.languages}`)
  if (formData.rawContent)    lines.push(`\nRAW CONTENT (old CV / notes / extracted text):\n${formData.rawContent}`)
  if (formData.education)     lines.push(`\nEDUCATION:\n${formData.education}`)
  if (formData.experience)    lines.push(`\nWORK EXPERIENCE:\n${formData.experience}`)
  if (formData.references)    lines.push(`\nREFERENCES:\n${formData.references}`)
  if (formData.additionalInfo) lines.push(`\nADDITIONAL INFORMATION:\n${formData.additionalInfo}`)
  if (formData.specialRequests) lines.push(`\nSPECIAL REQUESTS (follow carefully):\n${formData.specialRequests}`)
  if (formData.whyRole)       lines.push(`\nWHY THIS ROLE (use to sharpen the opening paragraph):\n${formData.whyRole}`)
  return lines.join('\n')
}

function getTypeInstructions(cvType: CVType, jobDescription?: string, jobTitle?: string, targetIndustry?: string): string {
  switch (cvType) {
    case 'professional': {
      const base = `STRUCTURE & STANDARDS:
- SUMMARY (3-4 sentences): Open with years of experience and domain expertise. Include one signature achievement with numbers. End with what value the person brings to a future employer. Make it sound like an executive bio, not a job-seeker plea.

- EXPERIENCE BULLETS: 4-5 per role for senior positions, 3-4 for junior.
  • Start each bullet with a different strong past-tense verb
  • Lead with the impact (number, scale, outcome)
  • Follow with the action (what they did)
  • Optionally end with the context (for whom, where)
  • Example structure: "Reduced operational costs by GHS 240,000 annually by [action] across [scope]"

- SKILLS: Extract from the user's actual experience. Group by category if 8+ skills. Use industry-standard names.

- EDUCATION: Highest first. Include grade/class only if shared.

TONE: Confident senior professional. Never apologetic, never overstated. Specific over generic, always.`

      // A pasted job advert is the strongest signal — tailor hard, the same
      // way the (otherwise unreachable) 'targeted' case below does.
      if (jobDescription) {
        return `TASK: Write a Professional CV laser-focused on this specific role.

THE JOB:
${jobDescription}

${base}

TAILORING — READ THIS CAREFULLY:
- Identify the top 5-7 skills/keywords/competencies the employer wants from the job description above.
- Weave those keywords NATURALLY into the summary, bullets, and skills section.
- Reorder bullets within each role so the most job-relevant achievement appears first.
- The summary must directly address why THIS person fits THIS role — be specific about what they bring.
- Do NOT keyword-stuff. Read it back: does it sound natural? If not, rewrite.
- Match the seniority and tone of the role. Manager job → managerial language. Specialist role → technical depth.

QUALITY: A hiring manager should read the first 6 lines and say "this person is exactly who we need."`
      }

      // No advert, but the user named a target role or industry — a lighter
      // touch than a full advert: slant emphasis and tone, don't invent
      // keywords to match a posting that doesn't exist.
      if (jobTitle || targetIndustry) {
        const target = [jobTitle, targetIndustry].filter(Boolean).join(' in ')
        return `TASK: Write a Professional CV aimed at ${target}.

${base}

TAILORING:
- No specific job advert was provided, but the person is aiming at ${target}.
- Let this shape emphasis and tone: foreground the experience, skills and achievements most relevant to ${target}, and use language natural to that field.
- Do not invent employers, skills, or experience the person doesn't have just to fit the target — work only with what's provided, emphasised toward the goal.`
      }

      return `TASK: Write a Professional CV that commands attention.

${base}`
    }

    case 'targeted':
      return `TASK: Write a Targeted CV laser-focused on this specific role.

THE JOB:
${jobDescription || 'No job description provided — write a strong professional CV.'}

YOUR APPROACH:
- Read the job description carefully. Identify the top 5-7 skills/keywords/competencies the employer wants.
- Weave those keywords NATURALLY into the summary, bullets, and skills section.
- Reorder bullets within each role so the most job-relevant achievement appears first.
- The summary must directly address why THIS person fits THIS role — be specific about what they bring.
- Do NOT keyword-stuff. Read it back: does it sound natural? If not, rewrite.
- Match the seniority and tone of the role. Manager job → managerial language. Specialist role → technical depth.

QUALITY: A hiring manager should read the first 6 lines and say "this person is exactly who we need."`

    case 'academic':
      return `TASK: Write a full Academic CV in scholarly format.

SECTIONS (in this order):
- Professional Profile / Research Statement (4-5 sentences, scholarly tone)
- Education (most recent first, include thesis/dissertation titles if mentioned)
- Teaching Experience (courses taught, levels, institutions)
- Research Experience (projects, methodologies, funding if mentioned)
- Publications (use scholarly format — Author. (Year). Title. Journal/Publisher.)
- Conference Presentations (if mentioned)
- Honours, Awards & Fellowships
- Professional Memberships
- Languages
- References

TONE: Scholarly, precise, no marketing language. Use academic conventions throughout.`

    case 'cover_letter':
      return `TASK: Write a powerful, personalised cover letter — NOT a CV.

THE JOB:
${jobDescription || 'No job description provided — write a strong general cover letter.'}

LETTER STRUCTURE (4 paragraphs):
- Para 1 (Hook): State the role being applied for. Open with a specific, attention-grabbing statement about your fit — quantified achievement preferred. Avoid "I am writing to apply for..." clichés.
- Para 2 (Why You): 2-3 specific, quantified achievements that directly map to what the role requires. Show, don't tell.
- Para 3 (Why Them): Demonstrate genuine knowledge of/interest in the employer. Show what value you bring.
- Para 4 (Close): Clear, confident call to action. Available to discuss. Thank them.

LENGTH: 250-320 words. Tight, professional, never rambling.

TONE: Confident, warm, professional. Never desperate, never generic.

OUTPUT NOTE: Put the entire letter body into the "coverLetterBody" field. Still include name, contact, jobTitle in the JSON.`
  }
}

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
  "coverLetterBody": "Full cover letter text — 4 paragraphs, separated by \\n\\n. NO greeting like 'Dear Hiring Manager' (that goes elsewhere). Start directly with paragraph 1."
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
  "summary": "Research/Professional Profile, 4-5 scholarly sentences",
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
      "qualification": "string (e.g. PhD, MA, BA)",
      "field": "string",
      "institution": "string",
      "startYear": "string",
      "endYear": "string",
      "grade": "thesis title or grade if known, else null"
    }
  ],
  "skills": ["array of research methods/competencies"],
  "languages": ["array"],
  "publications": ["scholarly format strings"],
  "research": ["research projects array"],
  "teaching": ["courses taught array"]
}`
  }

  return `{
  "fullName": "string",
  "jobTitle": "string (target role or current title)",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string or null",
  "summary": "Executive-level professional summary, 3-4 sentences",
  "experience": [
    {
      "id": "exp1",
      "role": "string",
      "company": "string",
      "startDate": "string (e.g. Mar 2021)",
      "endDate": "string (e.g. Present or Aug 2023)",
      "bullets": ["3-5 strong, quantified bullets per role"]
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
  "skills": ["8-12 strong skills array"],
  "languages": ["array if known"],
  "additionalInfo": "string with awards/certifications/memberships, or null"
}`
}

export function buildRegenerationPrompt(
  section: string,
  currentContent: any,
  instruction: string,
  cvContext: { fullName: string; jobTitle: string; cvType: string }
): string {
  return `You are improving a single section of an existing CV.

PERSON: ${cvContext.fullName}, ${cvContext.jobTitle}
SECTION TO REWRITE: ${section}
USER'S INSTRUCTION: ${instruction}

CURRENT CONTENT:
${JSON.stringify(currentContent, null, 2)}

Rewrite this section following the user's instruction. Keep the same JSON structure. Make it sharper, more specific, and more impactful.

Return ONLY the new JSON for this section — no markdown, no explanation.`
}
