export interface Guide {
  slug: string
  title: string
  description: string
  h1: string
  intro: string
  sections: { h2: string; paragraphs?: string[]; bullets?: string[] }[]
  faq: { q: string; a: string }[]
  cta: { label: string; href: string }
  related: string[]
}

export const GUIDES_UPDATED = '2026-11-01'

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-write-a-cv-in-ghana',
    title: 'How to Write a CV in Ghana: Format and Tips',
    description: 'A clear guide to writing a CV that Ghanaian employers read: what to include, how long it should be, the order of sections, and the mistakes that cost interviews.',
    h1: 'How to write a CV in Ghana',
    intro: 'A good CV is short, clear and easy to scan. Most employers decide in a few seconds whether to read on, so the order and the wording matter as much as the experience itself. This guide shows what to include, in what order, and what to leave out.',
    sections: [
      {
        h2: 'What a Ghanaian CV should contain',
        bullets: [
          'Your name, phone number, email address and town or city. Use an email address that looks professional.',
          'A short profile or summary of three to four lines: who you are, what you do, and what you offer the employer.',
          'Work experience, newest first, with the job title, employer, dates and what you actually did.',
          'Education and professional qualifications, with the institution and the years.',
          'Skills that match the job, and certificates such as professional licences.',
          'Referees, only if the advert asks for them, or the line “Available on request”.',
        ],
      },
      {
        h2: 'How long should it be?',
        paragraphs: [
          'Two pages is a good length for most people. A recent graduate can often fit everything on one page. Senior managers and academics may need three. If the CV is longer than the experience justifies, the strongest points get buried.',
        ],
      },
      {
        h2: 'Write what you did, not just where you were',
        paragraphs: [
          'Under each job, write short lines that start with a verb: “Prepared monthly stock reports”, “Handled customer complaints at the front desk”. Say what you were responsible for. If you have a real number, such as the size of a team or a budget you handled, include it. Never invent numbers or titles: employers check, and interviewers ask about every line.',
        ],
      },
      {
        h2: 'Personal details: what is needed and what is not',
        paragraphs: [
          'Contact details are essential. Date of birth, marital status, religion and a photograph are not needed unless the advert asks for them. Leaving them out keeps the page focused on your skills.',
        ],
      },
      {
        h2: 'Mistakes that cost interviews',
        bullets: [
          'One CV sent to every job. Change the summary and the order of your points to match each advert.',
          'Spelling and grammar errors. Read it aloud, then ask someone else to read it.',
          'Long paragraphs. Use short lines that are easy to scan on a phone.',
          'Gaps that are not explained. A short, honest line is better than silence.',
          'Fancy designs that hide the text. Keep it clean and readable.',
        ],
      },
    ],
    faq: [
      { q: 'Should I put a photo on my CV in Ghana?', a: 'Only if the employer asks for one. Otherwise leave it out and let your experience speak.' },
      { q: 'How many referees should I list?', a: 'Two or three people who know your work, with their names, positions and contact details, and only after you have asked their permission.' },
      { q: 'Is it better to send a PDF or a Word file?', a: 'Follow the advert. If it does not say, a PDF keeps the layout exactly as you made it, while Word is easier for an employer to edit.' },
    ],
    cta: { label: 'Build my CV', href: '/build?type=professional' },
    related: ['tailor-your-cv-to-a-job-advert', 'ats-friendly-cv', 'cover-letter-format-ghana'],
  },
  {
    slug: 'cover-letter-format-ghana',
    title: 'Cover Letter Format in Ghana: Layout and Sign-off',
    description: 'The formal cover letter layout used in Ghana: addresses, “Dear Sir/Madam”, the bold subject line, the body and “Yours faithfully”, with tips for each part.',
    h1: 'Cover letter format in Ghana',
    intro: 'In Ghana a cover letter, often called a letter of application, follows a formal layout. Getting the layout right shows respect for the reader and lets the content do its work. Here is the structure, part by part.',
    sections: [
      {
        h2: 'The layout, top to bottom',
        bullets: [
          'Your address and contact details, on the right at the top.',
          'The date.',
          'The name, position and address of the person or organisation you are writing to, on the left.',
          'The greeting: “Dear Sir/Madam,” if you do not know the name, or “Dear Mr Mensah,” if you do.',
          'A bold subject line that names the job, for example: APPLICATION FOR THE POSITION OF ACCOUNTS OFFICER.',
          'The body of the letter, in justified paragraphs.',
          'The closing: “Yours faithfully,” after “Dear Sir/Madam”, or “Yours sincerely,” after a named greeting, then your name.',
        ],
      },
      {
        h2: 'What to write in the body',
        paragraphs: [
          'Keep it to one page and three short paragraphs. In the first, say which job you are applying for and where you saw it. In the second, give the two or three strongest reasons you fit the role, using real examples from your work or studies. In the third, say that your CV is attached and that you would welcome an interview.',
        ],
      },
      {
        h2: 'Tips that make the letter stronger',
        bullets: [
          'Use the name of the employer and the exact job title from the advert.',
          'Match your examples to what the advert asks for.',
          'Keep a respectful, confident tone. Avoid begging and avoid over-praise.',
          'Check the spelling of names and the company.',
          'Sign off with your full name.',
        ],
      },
    ],
    faq: [
      { q: 'Should I write “Yours faithfully” or “Yours sincerely”?', a: 'Use “Yours faithfully” when you began with “Dear Sir/Madam”. Use “Yours sincerely” when you began with a name.' },
      { q: 'How long should a cover letter be?', a: 'One page. Three short paragraphs are usually enough.' },
      { q: 'Do I need a cover letter if the advert only asks for a CV?', a: 'It is optional, but a short, well-written letter can set you apart from people who send only a CV.' },
    ],
    cta: { label: 'Write my cover letter', href: '/build?type=cover_letter' },
    related: ['how-to-write-a-cv-in-ghana', 'tailor-your-cv-to-a-job-advert'],
  },
  {
    slug: 'nss-national-service-cv',
    title: 'CV for National Service and Fresh Graduates in Ghana',
    description: 'How to write a CV when you are a fresh graduate or on national service in Ghana: how to show service, projects and skills when you have little paid experience.',
    h1: 'A CV for national service and fresh graduates',
    intro: 'If you have just graduated or completed National Service, you may feel you have nothing to put on a CV. You have more than you think. This guide shows how to turn your studies, projects, service and volunteering into a CV an employer takes seriously.',
    sections: [
      {
        h2: 'Put National Service on your CV as work experience',
        paragraphs: [
          'National Service is real work. List it like a job: your role, the institution where you served, the dates, and two to four lines on your duties. For example: “Teaching Assistant, Kumasi Girls Senior High School, Oct 2024 to Sep 2025. Taught Core Mathematics to Form 1 classes and marked class assessments.”',
        ],
      },
      {
        h2: 'What goes first when you have little experience',
        bullets: [
          'A short summary that names your degree, your field and the kind of role you want.',
          'Education, near the top, with your programme, institution and years.',
          'National Service and any internship, attachment or part-time work.',
          'Projects, dissertations or research that match the job.',
          'Leadership roles, clubs and volunteering that show responsibility.',
          'Skills such as Microsoft Excel, writing, languages or specialist software.',
        ],
      },
      {
        h2: 'Show what you did, honestly',
        paragraphs: [
          'Describe your duties in plain words and match them to the job you want. Do not claim a title or a result you did not have. A true, clear line about helping with a task is worth more than an inflated one that falls apart in an interview.',
        ],
      },
      {
        h2: 'Keep it to one or two pages',
        paragraphs: [
          'One page is fine for a fresh graduate. Two pages is the limit. Use the space for the most relevant things and leave out school activities that do not help the application.',
        ],
      },
    ],
    faq: [
      { q: 'Can I list National Service as experience?', a: 'Yes. List the role, the institution, the dates and your duties, the same way you would list a job.' },
      { q: 'What if I have no work experience at all?', a: 'Lead with education, projects, volunteering and skills, and say clearly what kind of role you are looking for.' },
      { q: 'Should I include my SHS results?', a: 'Only if the advert asks, or if you have no university results to show. Most employers care more about your degree.' },
    ],
    cta: { label: 'Build my CV', href: '/build?type=professional' },
    related: ['how-to-write-a-cv-in-ghana', 'cover-letter-format-ghana', 'tailor-your-cv-to-a-job-advert'],
  },
  {
    slug: 'ats-friendly-cv',
    title: 'ATS-Friendly CV: How to Format It Right',
    description: 'What an applicant-tracking system is, how it reads a CV, and the formatting and keyword habits that help your CV get through.',
    h1: 'How to make your CV ATS-friendly',
    intro: 'Many larger employers and recruitment platforms use an applicant-tracking system, or ATS, to receive and sort CVs. It reads the text of your CV and files it into fields. If the layout confuses it, parts of your CV can go missing. These habits keep your CV readable by both software and people.',
    sections: [
      {
        h2: 'What an ATS does',
        paragraphs: [
          'An ATS takes your CV file, pulls out the text, and sorts it into headings such as experience, education and skills. A recruiter can then search and filter the people who applied. It reads text. It does not see pictures or fancy design.',
        ],
      },
      {
        h2: 'Formatting habits that help',
        bullets: [
          'Use real, selectable text. Never send a photo or scan of a CV as your only copy.',
          'Use the standard headings: Experience, Education, Skills.',
          'Keep a simple layout. Heavy tables, text boxes and graphics can scramble the order.',
          'Use a common, readable font and normal bullet points.',
          'Put your contact details in the body of the page, not only in a header or footer.',
          'Save as a PDF or Word file, as the advert asks.',
        ],
      },
      {
        h2: 'Use the words from the advert',
        paragraphs: [
          'Read the job advert and note the skills, tools and duties it names. Where they are true for you, use the same words in your summary, your experience and your skills. This helps a search find you and also shows the person reading that you understood the job. Only include things you have really done.',
        ],
      },
      {
        h2: 'A CV is still read by people',
        paragraphs: [
          'Passing a system is only the first step. A person will read the CV next, so it must also be clear, honest and specific. Write for both.',
        ],
      },
    ],
    faq: [
      { q: 'Is a PDF safe for an ATS?', a: 'A PDF with real text is normally fine. A PDF made from a scanned picture is not, because there is no text to read.' },
      { q: 'Should I copy the whole advert into my CV?', a: 'No. Use the advert’s key words where they truthfully describe you, and keep the rest in your own words.' },
      { q: 'Does every employer use an ATS?', a: 'No. Many smaller employers read CVs directly. A clean, simple CV works well either way.' },
    ],
    cta: { label: 'Build my CV', href: '/build?type=professional' },
    related: ['tailor-your-cv-to-a-job-advert', 'how-to-write-a-cv-in-ghana'],
  },
  {
    slug: 'tailor-your-cv-to-a-job-advert',
    title: 'How to Tailor Your CV to a Job Advert',
    description: 'A step-by-step method for adjusting your CV to each job advert so the employer sees at once that you fit the role.',
    h1: 'How to tailor your CV to a job advert',
    intro: 'Sending the same CV to every job is the most common reason good candidates are overlooked. A tailored CV does not mean writing a new one each time. It means changing a few key places so the employer sees at once that you fit this role.',
    sections: [
      {
        h2: 'Step 1: read the advert and mark what matters',
        paragraphs: [
          'Read the advert twice. Underline the duties, the required skills, the tools and the qualifications. The things mentioned first, or mentioned more than once, are usually the most important.',
        ],
      },
      {
        h2: 'Step 2: match your summary to the role',
        paragraphs: [
          'Rewrite the first three or four lines so they describe you as the person the advert is looking for, using the job title and the main skills. Keep every word true.',
        ],
      },
      {
        h2: 'Step 3: bring the best evidence to the top',
        bullets: [
          'Move the experience that matches the job to the top of each role.',
          'Add detail where the advert asks for something you have done, and shorten what is not relevant.',
          'Reorder your skills so the ones named in the advert come first.',
        ],
      },
      {
        h2: 'Step 4: check it honestly',
        paragraphs: [
          'Read each line and ask: could I explain this in an interview? If not, change it. A tailored CV should make your real strengths easier to see. It should not claim things you have not done.',
        ],
      },
      {
        h2: 'Step 5: match the cover letter',
        paragraphs: [
          'Use the same job title, and one or two of the same examples, in your cover letter. The CV and the letter should tell the same story.',
        ],
      },
    ],
    faq: [
      { q: 'How long does tailoring a CV take?', a: 'Done by hand, about twenty to thirty minutes per application. Remarkable CV does this for you when you paste the advert.' },
      { q: 'Do I need a different CV for each job?', a: 'You need a version for each type of job. The summary and the order of your points should change to fit each advert.' },
      { q: 'Can I add skills I do not have to match the advert?', a: 'No. Only list what you can do and have done, because interviewers will ask about it.' },
    ],
    cta: { label: 'Tailor my CV to a job', href: '/build?type=targeted' },
    related: ['ats-friendly-cv', 'how-to-write-a-cv-in-ghana', 'cover-letter-format-ghana'],
  },
  {
    slug: 'academic-cv-guide',
    title: 'Academic CV Guide: Format and Sections',
    description: 'How to structure an academic CV for a lectureship, research post or postgraduate programme: sections, order, publications and referees.',
    h1: 'How to write an academic CV',
    intro: 'An academic CV is different from a standard CV. It can be longer, it puts education and research first, and it lists publications and teaching in detail. Use it for lectureships, research posts, scholarships and postgraduate applications.',
    sections: [
      {
        h2: 'The usual order of sections',
        bullets: [
          'Name and contact details, with your institution and, if you have one, your ORCID iD.',
          'Education, with degree, field, institution, year and thesis or dissertation title.',
          'Research interests, in a few lines.',
          'Academic and professional experience, newest first.',
          'Teaching experience, with courses taught and your role.',
          'Publications, listed in a consistent citation style.',
          'Conference presentations, grants, awards and fellowships.',
          'Professional memberships and relevant skills.',
          'Referees, usually two or three academic referees with their contact details.',
        ],
      },
      {
        h2: 'Length',
        paragraphs: [
          'There is no strict limit. Early-career applicants usually need two or three pages. Longer is normal for senior academics, but every line should still earn its place.',
        ],
      },
      {
        h2: 'Make publications easy to check',
        paragraphs: [
          'Use one citation style and list the newest first. Mark work that is under review or in progress clearly, so that nothing is mistaken for a published paper. Give the full details that let a reader find the work.',
        ],
      },
      {
        h2: 'Tailor it to the post or programme',
        paragraphs: [
          'Put the research and teaching most relevant to the position first. For a postgraduate application, show how your previous study prepares you for the programme.',
        ],
      },
    ],
    faq: [
      { q: 'Should an academic CV include referees?', a: 'Yes. Most academic applications ask for two or three referees, usually people who have supervised or worked with you.' },
      { q: 'Does it matter which citation style I use?', a: 'Use one style throughout. If the institution names a style, follow it.' },
      { q: 'Can I use an academic CV for a non-academic job?', a: 'Not usually. For jobs outside universities, a shorter professional CV that focuses on skills and results works better.' },
    ],
    cta: { label: 'Build my academic CV', href: '/build?type=academic' },
    related: ['how-to-write-a-cv-in-ghana', 'tailor-your-cv-to-a-job-advert'],
  },
]

export function guideBySlug(slug: string) {
  return GUIDES.find(g => g.slug === slug)
}
