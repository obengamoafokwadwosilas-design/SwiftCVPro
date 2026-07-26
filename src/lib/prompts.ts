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
5. NEVER write a bullet shorter than 14 words or longer than 24 words
6. ALWAYS quantify at least 60% of bullets with real or reasonably inferred numbers
7. ALWAYS respond with valid JSON ONLY — no markdown fences, no explanation, no preamble
8. ALWAYS make the summary feel like an executive bio — confident, specific, distinctive

QUALITY BAR:
A senior recruiter at PwC Accra should read this CV and want to call the person within 30 seconds. If the writing feels even slightly generic, rewrite it sharper. Every word earns its place.

MATCH SENIORITY TO EVIDENCE:
- Write at the level the person's actual input supports. Do not inflate limited experience into seniority, and do not write a student or early-career person in a seasoned-executive voice.
- If the input shows little or no professional experience, or indicates the person is currently studying, lead with education, projects, internships, coursework, and volunteering, and keep the tone capable and emerging rather than senior. For this group, LEAVE THE HEADLINE EMPTY — do not assign a job title they have not held, and do not use a label like "Aspiring …" or "… Student". The CV should read confident and capable, never apologetic; the education and skills carry it. (jobTitle should be an empty string in this case.)
- GHANA FRESH-GRAD SIGNAL: National Service (NSS) is the line between student and professional. If the person's only work entry is their National Service year — or they have nothing substantive beyond it — treat them as a FRESH GRADUATE: lead with education, keep the headline EMPTY (no label of any kind), and never inflate the service year into a senior role. A person with real roles AFTER their service year is a normal professional and keeps a normal job-title headline.
- Judge this conservatively from real signals. A career-changer, someone with a gap, or a returning professional is NOT a student — when unsure, use the normal professional treatment. Never call an experienced person "aspiring".

HEADLINE (jobTitle):
- For every CV/resume, return jobTitle as an empty string. Do not invent or display a profession, career label, headline, or target-role label beneath the person's name. Actual roles must remain only inside Professional Experience.
- For a targeted CV, align the headline to the role being applied for (only where the person's background genuinely supports it).
- For a general CV, use the most senior or representative title from the person's real history — not merely their latest job.
- Never invent a title the person has not held.
- NEVER upgrade or reword an actual job title. If their title is "Principal Administrative Assistant", keep it exactly — do not render it as "Principal Administrative Officer" or anything more senior. Use their real titles verbatim in both the headline and each experience entry.
- For fresh graduates, students, or entry-level people (see MATCH SENIORITY TO EVIDENCE), leave jobTitle empty — no headline, no label.

LOCATION INFERENCE:
- Use any location the user provided verbatim. Never override a provided location.
- You may state the established location of a WELL-KNOWN employer or institution (e.g. KNUST → Kumasi, University of Ghana → Accra, MTN, GCB, Stanbic). Ghanaian universities have fixed, known locations — placing them is safe.
- For any company or school you cannot place with genuine confidence, OMIT the location rather than guess. A missing city is invisible; a wrong city is a verifiable error on a document going to an employer.
- NEVER let the applicant's home city stand in for the location of a workplace you cannot place. You cannot look anything up live — rely only on what is genuinely well-known.

PROFESSIONAL ATTRIBUTES (attributes) — character traits, NOT technical:
- Return exactly 4 short sentences in the "attributes" array (string[]). Each sentence describes a personal quality or work habit — NOT a technical skill or functional competency.
- STRICT LENGTH: maximum 15 words per sentence. One line, one idea. No two-line sentences.
- INFER from real signals in the experience — do NOT pick from a generic stock list. Ask: what does this person's actual behavior reveal about their character? A nurse who mentored junior staff shows patience; someone who maintained error-free records under pressure shows composure and discipline.
- These should feel DIFFERENT from Core Competencies. Competencies say what they achieved; Attributes say what kind of person they are at work.
  Good: "Approaches high-pressure situations with composure and sound judgment."
  Bad: "Excellent communication skills" (generic, unproven, could apply to anyone)
- If the experience is too thin to infer genuine attributes, return [] rather than inventing stock phrases.
- Prefer hard, specific, demonstrable skills drawn from what the person actually did.
- Include a soft skill ONLY when a bullet in their experience proves it (e.g. "supervised 4 staff" → "Team Leadership"). Never pad the list with generic soft skills like "Communication", "Teamwork", or "Problem-solving" just to look fuller — an unproven soft skill weakens the CV.

`

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

EXTRA SECTIONS (extraSections) — build PROPER headed sections, never one "Additional Information" dump:
- Return "extraSections": an array of { "heading": string, "items": string[] }. Each object becomes its OWN heading on the CV with its items bulleted underneath. ONLY from what the user actually provided — never invent.
- Give substantial content its own real heading. Use clear, standard headings such as:
  • "Publications" — each item a full citation (for anyone with written/published work, not just academics)
  • "Leadership & Involvement" — student leadership, associations, committee/board roles (item = role, body, years)
  • "Volunteer & Community Work" — NGO, church, or community roles (common and valued in Ghana)
  • "Awards & Recognition" — scholarships, commendations, distinctions
  • "Memberships" — professional licences & bodies (ICAG, GIHRM, Nursing & Midwifery Council of Ghana, GhIE, the Bar)
  • "Certifications" — certs not tied to a degree (PMP, Google, Cisco, BLS, ACLS). Never "Professional Certifications".
  • "References" — one item per referee ("Name, Institution — email"), or a single item "Available on request" if none were given.
- One item per distinct entry (e.g. 5 publications = 5 items), so they render as a clean bulleted list — NOT one comma-separated blob.
- Do NOT use a vague "Additional Information" heading unless a stray item genuinely fits nowhere else. With real headings available, that should almost never happen.
- Order roughly: Publications, Research (if separate), Leadership & Involvement, Volunteer & Community Work, Awards & Recognition, Memberships, Certifications, References.
- If the user gave nothing beyond the core CV, return an empty array []. Never manufacture sections to fill space.

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
  const { cvType, jobDescription, company, whyRole, jobTitle } = formData

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
      return `TASK: Write a formal application letter in the standard GHANAIAN style — NOT a CV, and NOT an American-style cover letter.

THE ROLE: ${jobTitle || 'the advertised position'}
${company ? `EMPLOYER: ${company}` : ''}
THE JOB / ADVERT:
${jobDescription || 'No advert provided — write a strong, role-appropriate general application letter.'}
${whyRole ? `\nWHY THE CANDIDATE WANTS THIS ROLE (use authentically):\n${whyRole}` : ''}

GHANAIAN APPLICATION-LETTER STYLE — this is the exact convention to follow:
- SUBJECT LINE (put in "clSubject", bold ALL-CAPS): ${(jobTitle && jobTitle.trim())
    ? `name the role — "APPLICATION FOR THE POSITION OF ${jobTitle.toUpperCase()}" (or "APPLICATION FOR APPOINTMENT AS …" if it reads better).`
    : `no specific role was given, so use a GENERAL heading — "APPLICATION FOR EMPLOYMENT" (acceptable alternatives: "JOB APPLICATION", "APPLICATION FOR A VACANT POSITION", "APPLICATION FOR CONSIDERATION"). Do NOT invent a job title.`}
- OPENING: begin formally and directly — ${(jobTitle && jobTitle.trim())
    ? `"I respectfully submit my application for the position of ${jobTitle}${company ? ` at ${company}` : ''}, as advertised."`
    : `"I respectfully submit my application for employment${company ? ` at ${company}` : ''}, and would be glad to be considered for any suitable vacancy."`} This traditional opening is CORRECT here; do NOT avoid it.
- BODY (2–3 paragraphs): current/most recent role and what it has given you; then your qualifications and key strengths that fit the role; draw only on the details provided. Formal, measured, respectful — never chatty, never salesy, no American buzzwords or clichés.
- CLOSING PARAGRAPH: express gratitude for consideration and reference the attachments, e.g. "I would be grateful for the opportunity to be considered. Please find attached my curriculum vitae and supporting documents for your kind consideration." End the body with a short "Thank you for your time and consideration." line.

LENGTH: 220–320 words for the body. Formal Ghanaian register.
NO PLACEHOLDERS: never output blanks like [Company], [Position], [Address] or [Hiring Manager]. Write around anything not provided so the letter is complete and ready to submit.

OUTPUT NOTES:
- "coverLetterBody": ONLY the body paragraphs (opening through the thank-you line), separated by \\n\\n. Do NOT include the subject line, the salutation ("Dear …"), the sign-off ("Yours faithfully"), the recipient address, or the sender's own details — those are laid out separately by the template.
- "clSubject": the bold ALL-CAPS subject line described above.
- Also fill name, contact and jobTitle as normal.`

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
  "clSubject": "Bold ALL-CAPS subject line, e.g. APPLICATION FOR THE POSITION OF ACCOUNTS OFFICER",
  "coverLetterBody": "Body paragraphs only, separated by \\n\\n — no subject, no salutation, no sign-off, no addresses."
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
  "extraSections": [{ "heading": "Publications | Conference Presentations | Awards & Recognition | Memberships | References | …", "items": ["one item per entry"] }]
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
  "skills": ["8-10 strong industry-standard skills — quality over quantity, no filler like \"Stakeholder Communication\" that is implied elsewhere"],
  "attributes": ["exactly 4 short sentences, max 15 words each, personal qualities inferred from experience signals — NOT generic stock phrases"],
  "languages": ["array if known"],
  "extraSections": [{ "heading": "Publications | Leadership & Involvement | Memberships | Certifications | References | …", "items": ["one item per entry — full citations for publications, role+body+years for leadership, one referee per item, etc."] }]
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

// ─────────────────────────────────────────────────────────────
// PAGINATION-RISK TRIM PROMPT — tightens a handful of specific lines
// (not a full section) that are shaped like the ones that tend to
// strand as page orphans: the last item in a role/list running much
// longer than its siblings. Scoped and surgical — only these lines
// are touched, everything else in the CV is untouched.
// ─────────────────────────────────────────────────────────────
export function buildBulletTrimPrompt(items: { id: string; text: string; context: string; maxWords: number }[]): string {
  return `You are tightening a handful of individual lines from an otherwise-finished, approved CV. These lines currently run longer than the rest of their section, which reads awkwardly on the printed page. Do NOT change facts, numbers, employers, dates, or meaning — only tighten the wording so it says the same thing more concisely.

For each item below, rewrite it to be AT OR UNDER its word limit while preserving every fact and number and keeping the original confident, specific voice (past-tense action verbs where the item is a bullet). Do not add placeholders and do not invent anything not already present in the current text.

ITEMS TO TIGHTEN:
${items.map(it => `- id: "${it.id}"\n  context: ${it.context}\n  max words: ${it.maxWords}\n  current: "${it.text}"`).join('\n')}

Return ONLY this JSON, no markdown, no explanation:
{
${items.map(it => `  "${it.id}": "rewritten text, at or under ${it.maxWords} words"`).join(',\n')}
}`
}

function getSectionOutputFormat(section: string): string {
  if (section === 'summary') return 'Return: { "summary": "rewritten summary" }'
  if (section === 'skills') return 'Return: { "skills": ["skill1", "skill2"] }'
  if (section === 'additionalInfo') return 'Return: { "additionalInfo": "rewritten content" }'
  if (section.startsWith('experience_')) return 'Return: { "bullets": ["bullet 1", "bullet 2", "bullet 3"] }'
  return 'Return: { "content": "rewritten content" }'
}
