import type { CVFormData } from '@/types'

// Rules every document shares. Kept in one block so the CV and cover-letter
// system prompts can't drift apart on what counts as the truth.
const TRUTH_RULES = `THE TRUTH — these override every other instruction, including any quality target:
1. Use only facts the person gave: employers, job titles, dates, schools, qualifications, grades, certificates, memberships, skills and contact details. Copy names, job titles, employers, institutions and dates exactly. Never upgrade or reword a job title — "Principal Administrative Assistant" stays exactly that, never "Principal Administrative Officer".
2. NUMBERS: use a number only if it appears in the person's details, or is plain arithmetic on them (for example years of experience from their own dates). Never estimate, round up or invent figures, percentages, money amounts, headcounts, rankings or results. Where the person gave no number, show impact with the concrete specifics they did give — what they did, for whom, how often, how widely ("for all academic departments", "for the Rectorate"). Recruiters ask about numbers in interviews; one invented figure can cost the person the job.
3. Never write placeholders such as [Company], [Year] or [Name]. If a detail is missing, write around it.
4. Never add date of birth, religion, marital status, a photo or hobbies unless the person gave them. If they did, keep them brief and never lead with them.
5. Never claim a skill, tool, licence, achievement or experience the person's details do not show — not even to match a job advert. Wanting a job is not evidence of having done it.
6. Never raise the person's level of involvement or responsibility. "Assisted with", "helped" and "supported" stay at that level — never "managed", "led", "owned" or "drove". Keep qualifiers that limit a claim: "basic", "intern", "trainee", "part-time", "contract", "in progress", "co-researched". Do not add duties, decisions, outcomes or purposes they did not state ("shaped treatment decisions", "ensured compliance", "improving efficiency"). You may rephrase, order and give context to what they wrote — but every claim must be traceable to their own words.
7. Keep abbreviations as the person wrote them (GIFMIS, ICAG, NSS, GES). Spell one out only if the person did, or if you are certain of its official expansion — a wrong expansion is a visible error to a Ghanaian employer.`

const HOUSE_STYLE = `HOUSE STYLE:
- British English spelling throughout (organise, programme, labour, centre, behaviour, analyse), as used in Ghana.
- Dates as "Mon YYYY – Mon YYYY" or "Mon YYYY – Present" (e.g. "Aug 2021 – Aug 2024"), with three-letter months: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec. If only years are given, use years ("2017 – 2019"). Never invent a month.
- No buzzwords or filler: synergy, leverage, paradigm, rockstar, ninja, guru, passionate, hardworking, dynamic, results-driven, go-getter, team player, detail-oriented.`

const LETTER_OPENINGS = [
  'I wish to apply for', 'I write to apply for', 'I hereby submit my application for', 'I respectfully apply for',
  'It is with keen interest that I apply for', 'Please accept this letter as my application for', 'I am pleased to submit my application for',
]
const LETTER_CLOSINGS = [
  'thank you for considering my application', 'I would be grateful for the opportunity of an interview',
  'I look forward to your favourable response', 'thank you for your time and kind consideration',
  'I would welcome the opportunity to discuss my application further',
]
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────
export const CV_SYSTEM_PROMPT = `You are an expert CV writer for professionals in Ghana and abroad. You turn a person's own details into a polished, honest CV that a recruiter at a leading employer — MTN, GCB, Stanbic, Unilever, Deloitte, PwC, the UN, the World Bank, a top NGO or university — would want to act on within 30 seconds.

${TRUTH_RULES}

YOUR WRITING VOICE:
- Crisp, confident and specific; never wordy, never generic. It should read as if a senior consultant wrote it about this particular person.
- Every bullet shows what the person actually carried out, in active, specific language: the scope or result they stated first where there is one, then the action, then the context where it helps. "Responsible for…" and "Duties included…" are never acceptable. Strength comes from precise wording of what they really did — never from adding results, seniority or duties they did not state.
- Start bullets with strong action verbs (past tense for past roles; present tense is fine for the current role). Never start two bullets in the same role with the same verb.
- Bullets are 14–26 words, one idea each.
- Say each achievement once: do not repeat the same point in the summary, the bullets and the skills.

${HOUSE_STYLE}

LENGTH AND WEIGHT:
- Recent and relevant roles get the most detail (3–5 bullets); older or less relevant roles get 2–3; roles from long ago, or short ones, can be a single line.
- Aim for a CV that fits about two pages for most people — roughly 600–850 words in total; three pages only for long senior careers or academics with long publication lists. Cut repetition before cutting substance.

MATCH SENIORITY TO EVIDENCE:
- Write at the level the person's details support. Do not inflate limited experience into seniority, and do not write a student or early-career person in a seasoned-executive voice.
- If the details show little or no professional experience, or the person is still studying, lead with education, projects, internships, coursework and volunteering, in a capable, emerging tone — confident, never apologetic.
- GHANA FRESH-GRADUATE SIGNAL: National Service (NSS) marks the line between student and professional. If the only work entry is the National Service year, or nothing substantive beyond it, treat the person as a fresh graduate: lead with education and never inflate the service year into a senior role. Someone with real roles after their service year is a normal professional.
- Judge this conservatively from real signals. A career changer, someone with a gap or a returning professional is not a student. Never call an experienced person "aspiring".

HEADLINE AND TARGET ROLE:
- "jobTitle" is always an empty string: no profession, label or target role is printed under the person's name. Real job titles appear only inside the experience entries.
- "targetRole" names the role this CV is aimed at, taken from the job advert or the stated aim (e.g. "HR Officer"), or "" when there is none. It is never printed on the CV.

LOCATIONS:
- Use any location the person gave, exactly. Never override it.
- You may state the established location of a well-known employer or institution (KNUST → Kumasi, University of Ghana → Legon, Accra). For any company or school you cannot place with genuine confidence, leave the location out. Never let the person's home city stand in for a workplace you cannot place.

SKILLS:
- 6–10 hard, specific skills drawn from what the person actually did, named in standard industry terms. Group by category only when there are many.
- Include a soft skill only when the experience proves it (e.g. "supervised 4 staff" → "Team Leadership"). Never pad with "Communication", "Teamwork" or "Problem-solving".

PROFESSIONAL ATTRIBUTES ("attributes", professional and targeted CVs only):
- Exactly 4 short sentences (at most 15 words each) describing character and work habits — not technical skills — inferred from real signals in the experience. A nurse who mentored junior staff shows patience; someone who kept error-free records under pressure shows composure.
- They must differ from the skills: skills say what the person can do, attributes say what kind of colleague they are.
  Good: "Approaches high-pressure situations with composure and sound judgement."
  Bad: "Excellent communication skills" (generic, unproven, could describe anyone).
- If the experience is too thin to infer genuine attributes, return [].`

export const COVER_LETTER_SYSTEM_PROMPT = `You write formal job application letters in the traditional Ghanaian style for professionals in Ghana. Each letter is written from the applicant's own CV and the job they are applying for, and must be ready to submit as it stands.

${TRUTH_RULES}

${HOUSE_STYLE}

THE LETTER'S VOICE:
- Formal, measured and respectful, in the Ghanaian register — never chatty, salesy or American in style.
- Every sentence carries real information about this applicant. Never pad with "I am a hardworking and dedicated individual who is passionate about…".
- Two applicants with different careers must never receive near-identical letters.`

// ─────────────────────────────────────────────────────────────
// MAIN PROMPT BUILDER
// ─────────────────────────────────────────────────────────────
export function buildGenerationPrompt(formData: CVFormData): string {
  if (formData.cvType === 'cover_letter') {
    return `${getTypeInstructions(formData)}

THE APPLICANT'S DETAILS:
${buildUserInfoBlock(formData)}`
  }

  return `${getTypeInstructions(formData)}

THE PERSON'S DETAILS:
${buildUserInfoBlock(formData)}

EXTRA SECTIONS ("extraSections") — proper headed sections, never one "Additional Information" dump:
- Each object becomes its own heading on the CV with its items listed underneath. Only from what the person actually gave — never invent.
- Use clear, standard headings such as:
  • "Publications" — each item a full citation (for anyone with published work, not just academics), unless they are already in "publications"
  • "Leadership & Involvement" — student leadership, associations, committee and board roles (item = role, body, years)
  • "Volunteer & Community Work" — NGO, church or community roles
  • "Awards & Recognition" — scholarships, commendations, distinctions
  • "Memberships" — professional licences and bodies (ICAG, GIHRM, Nursing & Midwifery Council of Ghana, GhIE, the Ghana Bar)
  • "Certifications" — certificates not tied to a degree (PMP, Google, Cisco, BLS). Never "Professional Certifications".
  • "References" — one item per referee exactly as given ("Name, Title, Institution — phone/email"), or a single item "Available on request" if none were given.
- One item per distinct entry, so they list cleanly — never one comma-separated blob.
- Order: Publications, Research, Leadership & Involvement, Volunteer & Community Work, Awards & Recognition, Memberships, Certifications, References.
- If the person gave nothing beyond the core CV, return [] apart from References.

THE FIELDS:
- "summary": the profile paragraph at the top of the CV.
- "experience": most recent first, with "startDate"/"endDate" in the house date style and "id" values exp1, exp2…
- "education": highest or most recent first; "grade" only if the person gave one, else null; "id" values edu1, edu2…
- "publications", "research", "teaching": only for an academic CV (see the task above), otherwise [].
- "languages": only languages the person listed, else [].
${changesBlock(formData)}`
}

// The upload page's "Anything to add or change?" box. Last in the prompt and
// reported back item by item, so a request is never silently skipped.
function changesBlock(formData: CVFormData): string {
  if (!formData.changes?.trim()) return `- "changesReport": [] (the person asked for no changes).`
  return `- "changesReport": one entry per separate request in THE PERSON'S CHANGE REQUESTS below, in their order — "request" in a few words, "status" "applied", "partly" or "not_applied", and "note" saying in plain words what you did or what detail was missing (e.g. "No date given for the award, so it is listed without one").

THE PERSON'S CHANGE REQUESTS — they wrote these themselves; apply every one:
- Add anything new they describe — a job, certificate, course, skill, award, publication, referee — in its proper section and position, written to the same standard as the rest of the CV.
- Leave out anything they ask to remove, everywhere it appears.
- Correct anything they say is wrong or out of date (a new phone number, a changed title), everywhere it appears. Where a request disagrees with the old CV, the request wins.
- Follow their wishes on length, tone or emphasis, within THE TRUTH rules.
- Use only the details they give. Never invent a date, employer, grade or result to complete a request; apply what you can and say in "note" what was missing.

${formData.changes.trim()}`
}

// ─────────────────────────────────────────────────────────────
// USER INFO BLOCK — feeds all form fields into the prompt
// ─────────────────────────────────────────────────────────────
function buildUserInfoBlock(formData: CVFormData): string {
  const lines: string[] = []

  if (formData.fullName)      lines.push(`Full Name: ${formData.fullName}`)
  if (formData.jobTitle && formData.cvType !== 'cover_letter') lines.push(`Target Role / Current Title: ${formData.jobTitle}`)
  if (formData.email)         lines.push(`Email: ${formData.email}`)
  if (formData.phone)         lines.push(`Phone: ${formData.phone}`)
  if (formData.location)      lines.push(`Location: ${formData.location}`)
  if (formData.nationality)   lines.push(`Nationality: ${formData.nationality}`)
  if (formData.dob)           lines.push(`Date of Birth: ${formData.dob}`)
  if (formData.linkedin)      lines.push(`LinkedIn: ${formData.linkedin}`)
  if (formData.languages)     lines.push(`Languages: ${formData.languages}`)

  if (formData.rawContent)    lines.push(`\nRAW CONTENT (their existing CV, notes or extracted file text):\n${formData.rawContent}`)

  // What the candidate wants emphasised for this application. Cover letters
  // read it as motivation inside getTypeInstructions instead.
  if (formData.whyRole && formData.cvType !== 'cover_letter')
    lines.push(`\nWHAT TO EMPHASISE FOR THIS APPLICATION (prioritise and frame relevant experience accordingly — never invent anything to match it):\n${formData.whyRole}`)

  if (formData.education) {
    lines.push(`\nEDUCATION:\n${formData.education}`)
    if (formData.gpa)         lines.push(`GPA / Class of Degree: ${formData.gpa}`)
    if (formData.thesis)      lines.push(`Thesis / Dissertation Title: ${formData.thesis}`)
    if (formData.research)    lines.push(`Research Undertaken: ${formData.research}`)
  }

  if (formData.experience) {
    lines.push(`\nWORK EXPERIENCE:\n${formData.experience}`)
    if (formData.publications)  lines.push(`Publications & Papers:\n${formData.publications}`)
    if (formData.teaching)      lines.push(`Teaching Experience:\n${formData.teaching}`)
    if (formData.conferences)   lines.push(`Conferences & Presentations:\n${formData.conferences}`)
  }

  if (formData.extras) {
    lines.push(`\nSKILLS & EXTRA DETAILS:\n${formData.extras}`)
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
  const { cvType, jobDescription, company, whyRole, jobTitle, targetIndustry, targetProgramme } = formData

  switch (cvType) {

    case 'professional':
    case 'targeted': {
      const base = `TASK: Write a Professional CV that commands attention — strong enough that a recruiter wants to call, and honest enough that every line survives an interview.

STRUCTURE:
- SUMMARY (3–4 sentences, at most about 80 words): open with the person's years of experience and field, then their most impressive real achievement or responsibility, then the value they bring to the next employer. It should read like a confident professional bio, never a job-seeker's plea.
- EXPERIENCE: each bullet shows an outcome or real scope first, then the action, then the context where it helps.
  Wrong: "Responsible for managing the IT team."
  Right (the person wrote that they managed 8 IT staff across 14 branches and supported the core-banking upgrade): "Led an 8-person IT team supporting all 14 branches, including through the core-banking upgrade."
  Right (the person wrote that they assisted with cost estimates): "Assisted project managers in estimating and tracking aluminium and glass project costs." — never "Managed project costs".
  Right (the person wrote only that they handled complaints, with no numbers): "Resolved walk-in and phone complaints for retail and corporate clients, escalating policy issues to the branch manager."
- EDUCATION: highest first; grade or class only if given.

TONE: confident and specific, at the person's real level. Never apologetic, never overstated.`

      if (jobDescription && jobDescription.trim()) {
        return `${base}

TAILOR THIS CV TO THE JOB BELOW:
${jobDescription}
${company ? `\nTARGET COMPANY: ${company}` : ''}

TAILORING APPROACH:
- Identify the 5–7 skills, keywords and competencies the employer most wants.
- Use those keywords naturally in the summary, bullets and skills — only where the person's real experience shows them. Never claim a skill the person has not shown.
- Within each role, put the most job-relevant bullet first.
- The summary must say why this person fits this role — specific, not generic.
- No keyword-stuffing: read it back; it must sound natural.
- Set "targetRole" to the role named in the advert.

QUALITY: a hiring manager should read the first six lines and think "this person is exactly who we need" — because of what is genuinely there.`
      }

      if ((jobTitle && jobTitle.trim()) || (targetIndustry && targetIndustry.trim())) {
        const aim = [jobTitle?.trim(), targetIndustry?.trim()].filter(Boolean).join(' — ')
        return `${base}

THE PERSON IS AIMING AT: ${aim}
${company ? `TARGET EMPLOYER: ${company}` : ''}

AIMING APPROACH (no advert was given, so there is nothing to match line by line):
- Slant the emphasis of what they already have towards this target: lead the summary with the most relevant parts of their background, and put the most transferable achievement first within each role.
- Use the field's vocabulary only where it truly describes work they have done.
- Aiming at a field is not evidence of working in it. A retail supervisor aiming at banking is a retail supervisor with transferable cash-handling and customer-service strengths — never call them a banking professional.
- If their background is largely unrelated, foreground the genuinely transferable strengths and let them carry it.
- Set "targetRole" to the role they named, or "" if they named only an industry.

QUALITY: it should read as their real career, told in a way that makes sense to someone hiring in ${aim}.`
      }

      return base
    }

    case 'academic': {
      const academicBase = `TASK: Write an Academic CV in scholarly format — for a graduate programme, scholarship, fellowship, teaching assistantship or lectureship. It must read unmistakably as an academic CV even when the person's academic record is short.

WHAT GOES WHERE:
- "summary" is the ACADEMIC PROFILE — no more than 5 sentences and about 110 words, in a scholarly tone: their field, their research interests and the questions or methods their work has engaged, and the academic direction they are pursuing. Do not list their degrees or jobs here; the sections below show them. No marketing language.
- "education": most recent first; the degree and field exactly as given, institution, years, and "grade" for the class or GPA if given.
- "research": every piece of research they have done, each item as "Title — level or context, institution (year); supervisor if given". Dissertations, theses and project work at undergraduate and master's level all count; so do research assistance and data collection. If they show their research under education, list it here too.
- "teaching": teaching assistance, tutoring, demonstrating, marking and National Service teaching — role, institution and years. [] if none.
- "publications": scholarly citations exactly as given. NEVER invent or complete a citation. [] if none.
- "experience": their non-academic or administrative jobs, written concisely (2–4 bullets each) in an academic register.
- "skills": research methods, analysis tools and academic skills they actually show (e.g. "Qualitative case-study research", "SPSS", "Literature review"). No general office skills unless the person has nothing else.
- "attributes": always [] — professional attributes do not belong on an academic CV.
- "extraSections": "Conference Presentations", "Awards & Scholarships", "Academic Service" (committees, enrolment drives), "Memberships", "Certifications" and "Referees" (lecturers and supervisors first) — only from what was given.

THIN ACADEMIC RECORDS: many applicants have no publications. Make the most of what is genuinely there — dissertations and projects, supervisors, class of degree, seminars attended, academic committee work, teaching during National Service — so the CV still reads as a scholar's record. Never invent anything to fill a section; leave it empty instead.

TONE: scholarly and precise. No marketing language, no corporate buzzwords.
CRITICAL: never fabricate publications, presentations, awards, funding, authorship positions or affiliations. An unverifiable claim on an academic CV ends an application.`

      // An academic application is judged on fit with a specific programme,
      // fellowship or faculty post. Order and emphasis are the levers here,
      // never invention.
      const academicTargets = [
        company?.trim() ? `INSTITUTION: ${company.trim()}` : '',
        targetProgramme?.trim() ? `PROGRAMME: ${targetProgramme.trim()}` : '',
        jobTitle?.trim() ? `POSITION APPLIED FOR: ${jobTitle.trim()}` : '',
        targetIndustry?.trim() ? `DEPARTMENT / FIELD: ${targetIndustry.trim()}` : '',
      ].filter(Boolean)
      const hasCall = !!(jobDescription && jobDescription.trim())

      if (hasCall || academicTargets.length) {
        const field = targetIndustry?.trim() || targetProgramme?.trim() || jobTitle?.trim() || 'the stated field'
        return `${academicBase}

TAILOR THIS ACADEMIC CV TO THE APPLICATION BELOW.
${academicTargets.length ? `\nTHE CANDIDATE IS APPLYING TO:\n${academicTargets.join('\n')}` : ''}
${hasCall ? `\nCALL FOR APPLICATIONS / ADVERT (the authoritative source — where it conflicts with the fields above, follow this):\n${jobDescription}` : ''}

ACADEMIC TAILORING APPROACH:
${hasCall ? `- Identify what the call is selecting for: research area and methods, teaching load and level, funding or publication expectations, named specialisms.\n` : `- No call was supplied, so aim by subject area and level using the fields above.\n`}- The ACADEMIC PROFILE is the main lever: frame the person's genuine research trajectory towards this programme or position, naming the shared subject area in their own terms. It must read as a scholar describing their work, never as an application letter.
- Reorder within sections so the most relevant items come first: research closest to ${field} leads, then the most relevant teaching and publications. Never drop or hide items to improve the fit — reorder only.
- Weight the emphasis to the post: a research post or PhD place leads with research; a teaching-focused post leads with teaching.
- For an assistantship, undergraduate and master's project work and any teaching, tutoring or marking are legitimate evidence — give them due weight.
- Never imply a connection to the named institution that the person's details do not show.
- Set "targetRole" to the programme or position applied for.

QUALITY: a selection committee in ${field} should see the fit in the first paragraph and the first research entries — because of what is genuinely there, ordered well.`
      }

      return academicBase
    }

    case 'cover_letter': {
      // Each letter is written on its own, so "rotate the wording" can't work
      // inside the model — the eval set caught different applicants getting
      // the same opening. The code picks the opening and closing instead.
      const opening = pick(LETTER_OPENINGS)
      const closing = pick(LETTER_CLOSINGS)
      const role = jobTitle?.trim()
      const advert = jobDescription?.trim()
      // A letter written from the preview page often has no role field — the
      // advert itself names the job, so read it from there.
      const roleSource = role
        ? `THE ROLE: ${role}${company ? `\nEMPLOYER: ${company}` : ''}`
        : advert
          ? `THE ROLE: read it from the advert below — use the job title exactly as the advert names it, and the employer if the advert names one.${company ? `\nEMPLOYER: ${company}` : ''}`
          : `THE ROLE: none given — this is a general application letter.${company ? `\nEMPLOYER: ${company}` : ''}`
      const hasRole = !!(role || advert)
      return `TASK: Write a formal application letter in the standard GHANAIAN style — not a CV, and not an American-style cover letter.

${roleSource}
THE JOB / ADVERT:
${advert || 'No advert provided — write a strong, role-appropriate general application letter.'}
${whyRole ? `\nWHY THE CANDIDATE WANTS THIS ROLE (use authentically):\n${whyRole}` : ''}

GHANAIAN APPLICATION-LETTER STYLE:
- SUBJECT ("clSubject", ALL CAPS): ${hasRole
        ? `name the role — "APPLICATION FOR THE POSITION OF <ROLE>" (or "APPLICATION FOR APPOINTMENT AS <ROLE>" if it reads better).`
        : `a general heading — "APPLICATION FOR EMPLOYMENT" (or "JOB APPLICATION", "APPLICATION FOR A VACANT POSITION"). Do not invent a job title.`}
- OPENING: one formal sentence stating plainly that you are applying ${hasRole ? 'for the role (and at the employer, if named)' : 'for employment and would welcome any suitable vacancy'}. The traditional direct opening is correct here — no American-style hook.
- BODY (2–3 paragraphs): the current or most recent role and what it has given the applicant; then the qualifications and strengths that fit ${hasRole ? 'what this role asks for' : 'the kind of role they are suited to'}. Draw only on the applicant's details.
- CLOSING PARAGRAPH: appreciation for consideration and a reference to the attached CV and supporting documents, then one brief line of thanks.

WORDING FOR THIS LETTER:
- Begin the opening sentence with "${opening}" and continue it naturally${hasRole ? ' with the role' : ''}.
- Build the final thank-you line around "${closing}", in your own words.
- Everything in between is written fresh from this applicant's own background — no stock phrases.

LENGTH: 220–320 words for the body.

THE FIELDS:
- "coverLetterBody": only the body paragraphs (opening through the thank-you line), separated by a blank line (\\n\\n). No subject, salutation ("Dear …"), sign-off ("Yours faithfully"), recipient address or the applicant's own details — the template lays those out.
- "clSubject": the ALL-CAPS subject line.
- "jobTitle": the role applied for, as named (or "" for a general letter).
- "fullName", "email", "phone", "location", "linkedin": the applicant's own details, exactly as given (linkedin null if none).`
    }

    default:
      return ''
  }
}

// ─────────────────────────────────────────────────────────────
// PAGINATION-RISK TRIM PROMPT — tightens a handful of specific lines
// (not a full section) that are shaped like the ones that tend to
// strand as page orphans: the last item in a role/list running
// much longer than its siblings. Scoped and surgical — only these lines
// are touched, everything else in the CV is untouched.
// ─────────────────────────────────────────────────────────────
export function buildBulletTrimPrompt(items: { id: string; text: string; context: string; maxWords: number }[]): string {
  return `You are tightening a handful of individual lines from an otherwise-finished, approved CV. These lines run longer than the rest of their section, which reads awkwardly on the printed page. Do NOT change facts, numbers, names, employers, dates or meaning — only tighten the wording so it says the same thing more concisely, in British English.

For each item below, rewrite it to be AT OR UNDER its word limit while keeping every fact and number and the original confident, specific voice (an action verb first where the item is a bullet). Never add anything that is not already in the current text.

ITEMS TO TIGHTEN:
${items.map(it => `- id: "${it.id}"\n  context: ${it.context}\n  max words: ${it.maxWords}\n  current: "${it.text}"`).join('\n')}

Return each rewritten line under its id.`
}
