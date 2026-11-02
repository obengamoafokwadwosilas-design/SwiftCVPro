import type { Guide } from './guides'

const NEW = '2026-11-02'

export const MORE_GUIDES: Guide[] = [
  {
    slug: 'application-letter-sample-ghana',
    published: NEW,
    title: 'Application Letter Sample for Ghana Jobs',
    description: 'A sample application letter in the formal layout used in Ghana, with notes on what to put in each paragraph and how to adapt it to your own job.',
    h1: 'Application letter sample for Ghana jobs',
    intro: 'A good application letter is short, polite and specific. Below is a sample in the formal layout used in Ghana. Replace everything in square brackets with your own true details, and keep it to one page.',
    sections: [
      {
        h2: 'The sample',
        examples: [{
          label: 'Sample letter (replace the [brackets])',
          text: `[Your full name]\n[Your town or city]\nEmail: [your email]\nTel: [your phone number]\n\n[Date]\n\nThe Human Resource Manager\n[Company name]\n[Company address or town]\n\nDear Sir/Madam,\n\nAPPLICATION FOR THE POSITION OF [JOB TITLE]\n\nI wish to apply for the position of [job title] advertised on [where you saw it]. I am a [your qualification or current role] with [number] years of experience in [your field], and I believe I can add value to [company name].\n\nIn my current role as [your role] at [your employer], I [two or three things you really do or did, matched to the advert]. I hold [your qualification] from [your institution], which prepared me for [the main skill the job asks for].\n\nI have attached my CV for your consideration. I would welcome the opportunity to discuss my application at an interview, and I thank you for your time.\n\nYours faithfully,\n\n[YOUR FULL NAME]`,
        }],
      },
      {
        h2: 'What goes in each paragraph',
        bullets: [
          'First paragraph: the job you are applying for, where you saw it, and one line on who you are.',
          'Second paragraph: the two or three strongest reasons you fit, using real work or study examples that match the advert.',
          'Last paragraph: say the CV is attached, that you would welcome an interview, and thank the reader.',
        ],
      },
      {
        h2: 'How to adapt it',
        paragraphs: [
          'Copy the exact job title from the advert into the subject line and the first paragraph. If the advert names a person, begin “Dear Mr Mensah,” and close with “Yours sincerely,”. Only mention skills and experience you really have.',
        ],
      },
    ],
    faq: [
      { q: 'How long should an application letter be?', a: 'One page, in three short paragraphs.' },
      { q: 'Should I print and sign it?', a: 'If you are applying in person, yes. For email applications, attach it as a PDF with your CV.' },
      { q: 'Do I write my address on the left or the right?', a: 'In the formal Ghanaian layout your address goes at the top right, and the employer’s details go on the left.' },
    ],
    cta: { label: 'Write my cover letter', href: '/build?type=cover_letter' },
    related: ['cover-letter-format-ghana', 'how-to-write-a-cv-in-ghana', 'tailor-your-cv-to-a-job-advert'],
  },
  {
    slug: 'cv-profile-summary-examples',
    published: NEW,
    title: 'CV Profile Summary Examples and How to Write One',
    description: 'Four short CV profile summary examples, and a simple method for writing your own that is true, specific and easy to read.',
    h1: 'CV profile summary examples',
    intro: 'The profile, or summary, is the first thing a recruiter reads. In three or four lines it should say who you are, what you do and what you offer. These examples show the shape. They are made-up people, so replace the details with your own true ones.',
    sections: [
      {
        h2: 'Four examples',
        examples: [
          { label: 'Accounts assistant', text: 'Accounts assistant with three years of experience in payables, reconciliations and month-end reporting. Careful with detail and comfortable with Excel. Looking for an accounts role where accuracy and reliability matter.' },
          { label: 'Registered nurse', text: 'Registered General Nurse with five years of experience on a medical ward, giving medication, monitoring patients and working closely with doctors. Registered with the Nursing and Midwifery Council of Ghana.' },
          { label: 'Teacher', text: 'Trained teacher with four years of experience teaching Integrated Science at junior high level. Plans lessons clearly, keeps accurate records and supports pupils who need extra help.' },
          { label: 'Fresh graduate', text: 'Recent BSc Marketing graduate who has completed national service in a customer-facing role. Strong written communication and social media skills, and keen to start a career in marketing.' },
        ],
      },
      {
        h2: 'A simple method',
        bullets: [
          'Start with who you are: your job title or your qualification.',
          'Add your experience: how long, and in what area.',
          'Add two things you do well that the job needs.',
          'End with what you are looking for, in one short phrase.',
        ],
      },
      {
        h2: 'What to avoid',
        bullets: [
          'Empty words such as “hardworking team player” with nothing to back them.',
          'Anything you cannot explain in an interview.',
          'More than four or five lines.',
        ],
      },
    ],
    faq: [
      { q: 'Should I write the profile in the first person?', a: 'Most CVs leave out “I”. Write short phrases such as “Accounts assistant with three years of experience”.' },
      { q: 'Do I need a different profile for each job?', a: 'Yes, adjust it. Change the job title and the two skills you highlight to match each advert.' },
      { q: 'What if I have little experience?', a: 'Lead with your qualification, your national service or internship, and the skills you built there.' },
    ],
    cta: { label: 'Build my CV', href: '/build?type=professional' },
    related: ['how-to-write-a-cv-in-ghana', 'nss-national-service-cv', 'common-cv-mistakes'],
  },
  {
    slug: 'cv-for-nurses-and-midwives-ghana',
    published: NEW,
    title: 'CV for Nurses and Midwives in Ghana',
    description: 'How to write a nursing or midwifery CV for Ghana: registration details, clinical experience, certificates and a clear profile.',
    h1: 'A CV for nurses and midwives in Ghana',
    intro: 'Hospitals and clinics want to see quickly that you are registered, where you have worked and what you can do safely. A clear nursing CV puts those facts at the top and keeps the rest short and specific.',
    sections: [
      {
        h2: 'What to put first',
        bullets: [
          'Your name and contact details, with your town or city.',
          'A short profile: your registration, your years of experience and the kind of ward or setting you know.',
          'Your registration and licence details, with the council and your registration number, if you hold one.',
        ],
      },
      {
        h2: 'Show your clinical experience',
        paragraphs: [
          'List each post with the hospital, the ward or unit, and your dates. Under each, write short lines about your real duties, such as giving medication, monitoring vital signs, taking part in ward rounds, mentoring students, and keeping accurate records. Use only numbers you can prove, such as the size of a ward.',
        ],
      },
      {
        h2: 'Certificates and training',
        bullets: [
          'Your nursing or midwifery qualification, with the school and year.',
          'Short courses such as Basic Life Support, with the issuing body and year.',
          'Any specialist training you have completed.',
        ],
      },
      {
        h2: 'Include your national service and placements',
        paragraphs: [
          'If you served at a hospital or completed clinical placements, list them as experience. They show the settings you have worked in.',
        ],
      },
    ],
    faq: [
      { q: 'Should I put my registration number on my CV?', a: 'Yes, if you hold one. Employers check it, so make sure it is correct and current.' },
      { q: 'How long should a nursing CV be?', a: 'Two pages is usual. A newly qualified nurse can often fit on one.' },
      { q: 'Do I list every ward I have worked on?', a: 'List the posts and settings that are relevant to the job. Keep older, short placements brief.' },
    ],
    cta: { label: 'Build my CV', href: '/build?type=professional' },
    related: ['cv-profile-summary-examples', 'how-to-write-a-cv-in-ghana', 'common-cv-mistakes'],
  },
  {
    slug: 'cv-for-teachers-ghana',
    published: NEW,
    title: 'CV for Teachers in Ghana',
    description: 'How to write a teaching CV for Ghana: subjects, levels taught, training, licence details, school experience and referees.',
    h1: 'A CV for teachers in Ghana',
    intro: 'A school wants to know what you teach, at what level, and how well you manage a class. A teaching CV that shows your subjects, your training and your classroom experience in plain words does that.',
    sections: [
      {
        h2: 'What to put first',
        bullets: [
          'Your name and contact details.',
          'A short profile: your subject areas, the level you teach, and your years of experience.',
          'Your teaching qualification and any licence or registration details, if you hold them.',
        ],
      },
      {
        h2: 'Show your classroom experience',
        paragraphs: [
          'For each school, give the name, your dates, the subjects and classes you taught, and what you did beyond teaching. Short lines work well: planning lessons, setting and marking assessments, keeping records, supporting pupils who need extra help, and any club or sports you ran. Include numbers only when they are true, such as class size.',
        ],
      },
      {
        h2: 'Training and development',
        bullets: [
          'Your degree or diploma in education, with the institution and year.',
          'Workshops and in-service training you have completed.',
          'Skills such as using computers in teaching, if you really have them.',
        ],
      },
      {
        h2: 'Referees matter',
        paragraphs: [
          'Schools often ask for referees. A head teacher or a lecturer who knows your work is a good choice. Ask their permission first, and give their position and phone number.',
        ],
      },
    ],
    faq: [
      { q: 'Should I list my national service as teaching experience?', a: 'Yes, if you taught. List the school, the subjects and your dates like any other post.' },
      { q: 'Do I include my WASSCE results?', a: 'Only if the advert asks. Your teaching qualification matters more.' },
      { q: 'How long should a teaching CV be?', a: 'Two pages for most teachers. One is enough if you are newly qualified.' },
    ],
    cta: { label: 'Build my CV', href: '/build?type=professional' },
    related: ['nss-national-service-cv', 'cv-profile-summary-examples', 'cover-letter-format-ghana'],
  },
  {
    slug: 'cv-for-banking-jobs-ghana',
    published: NEW,
    title: 'CV for Banking and Finance Jobs in Ghana',
    description: 'How to write a CV for banks and finance employers in Ghana: what they look for, how to describe customer, cash and compliance work honestly.',
    h1: 'A CV for banking and finance jobs in Ghana',
    intro: 'Banks look for accuracy, trustworthiness and good customer handling. A banking CV should show those qualities through real examples of what you have done, and keep every figure and title true.',
    sections: [
      {
        h2: 'What employers look for',
        bullets: [
          'Accuracy with money and records.',
          'Customer service and communication.',
          'Honesty and attention to rules and compliance.',
          'Comfort with numbers and computer systems.',
        ],
      },
      {
        h2: 'Describe your work in specific terms',
        paragraphs: [
          'Instead of “good customer service”, say what you did: served customers at the counter, handled deposits and withdrawals, resolved complaints, opened accounts, or supported a team that met a target. Use the numbers you really know, and leave out any you cannot support.',
        ],
      },
      {
        h2: 'If you are changing into banking',
        paragraphs: [
          'Sales, retail and customer-facing work all transfer. Describe the cash handling, record keeping, targets and customer problems you have dealt with, and show the qualification or short course that supports the move.',
        ],
      },
      {
        h2: 'Qualifications and skills',
        bullets: [
          'Your degree or diploma, with the institution and year.',
          'Professional courses in banking, accounting or finance.',
          'Software you can use, such as Excel and any banking systems you know.',
        ],
      },
    ],
    faq: [
      { q: 'Should I include a photo for a banking job?', a: 'Only if the advert asks for one.' },
      { q: 'How do I show I can be trusted with money?', a: 'Describe real cash or record work you have handled, and give referees who can confirm it.' },
      { q: 'Do I need a cover letter for a bank?', a: 'Often yes. A short, formal letter that names the job and the branch or department is a good habit.' },
    ],
    cta: { label: 'Tailor my CV to a job', href: '/build?type=targeted' },
    related: ['tailor-your-cv-to-a-job-advert', 'cover-letter-format-ghana', 'common-cv-mistakes'],
  },
  {
    slug: 'common-cv-mistakes',
    published: NEW,
    title: 'Common CV Mistakes and How to Fix Them',
    description: 'The most common CV mistakes that cost people interviews in Ghana, and a simple fix for each.',
    h1: 'Common CV mistakes and how to fix them',
    intro: 'Most CVs are rejected for small, fixable reasons. Here are the mistakes recruiters see most often, and how to correct each one.',
    sections: [
      {
        h2: 'The mistakes',
        bullets: [
          'Sending the same CV to every job. Fix: change the profile and the order of your points for each advert.',
          'A long block of text. Fix: use short lines with a verb at the start.',
          'Spelling and grammar errors. Fix: read it aloud, then have someone else read it.',
          'Listing duties but no results. Fix: add what the work achieved, with numbers only when they are true.',
          'An unprofessional email address. Fix: use your name.',
          'Missing dates or unexplained gaps. Fix: give months and years, and add one honest line about any gap.',
          'Too many pages. Fix: keep to two pages and cut the oldest, least relevant jobs.',
          'Claims you cannot support. Fix: remove anything you could not explain in an interview.',
          'A design that hides the text. Fix: choose a clean layout and real, selectable text.',
        ],
      },
      {
        h2: 'A quick check before you send',
        bullets: [
          'Is the job title in the advert in your profile?',
          'Are your newest and most relevant jobs first?',
          'Can you explain every line?',
          'Is your phone number correct?',
        ],
      },
    ],
    faq: [
      { q: 'Is it a mistake to leave out old jobs?', a: 'No. Leave out short or very old jobs that do not help this application, but keep the main story clear.' },
      { q: 'Should I explain why I left each job?', a: 'Not on the CV. Be ready to answer in the interview.' },
      { q: 'Can I use the same cover letter for every job?', a: 'No. Change the job title, the employer and the examples each time.' },
    ],
    cta: { label: 'Build my CV', href: '/build?type=professional' },
    related: ['how-to-write-a-cv-in-ghana', 'cv-profile-summary-examples', 'ats-friendly-cv'],
  },
  {
    slug: 'cv-vs-resume',
    published: NEW,
    title: 'CV vs Resume: What Is the Difference?',
    description: 'The difference between a CV and a resume, which one employers in Ghana usually expect, and when to use a longer academic CV.',
    h1: 'CV vs resume: what is the difference?',
    intro: 'People use “CV” and “resume” for the same document, but the words mean slightly different things in different places. Knowing the difference helps you send the right one.',
    sections: [
      {
        h2: 'In Ghana',
        paragraphs: [
          'Employers in Ghana usually say “CV” (curriculum vitae) for the document you send with a job application. It is normally a two-page summary of your work, education and skills, and you will rarely be asked for a “resume”.',
        ],
      },
      {
        h2: 'In other countries',
        bullets: [
          'In the United States and Canada, a resume is the short, one-to-two-page document for most jobs.',
          'In the same countries, a CV is a longer document used for academic, research and medical posts.',
          'In the United Kingdom and much of Africa, CV is the usual word for the standard job document.',
        ],
      },
      {
        h2: 'Which should you send?',
        paragraphs: [
          'Follow the advert. If it asks for a CV, send a tidy two-page CV. If it asks for a resume, send the same kind of document, kept to one or two pages. For lectureships, research posts and scholarships, an academic CV with publications and teaching is expected.',
        ],
      },
    ],
    faq: [
      { q: 'Can I use the same document for a CV and a resume?', a: 'Yes, for most jobs. Keep it clear, short and focused on the role.' },
      { q: 'Is a cover letter part of a CV?', a: 'No. It is a separate letter that goes with your CV.' },
      { q: 'When do I need an academic CV?', a: 'For lectureships, research posts, scholarships and postgraduate applications.' },
    ],
    cta: { label: 'Build my CV', href: '/build?type=professional' },
    related: ['academic-cv-guide', 'how-to-write-a-cv-in-ghana', 'common-cv-mistakes'],
  },
]
