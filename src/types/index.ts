export type CVType = 'professional' | 'targeted' | 'academic' | 'cover_letter'

export type TemplateId =
  | 'classic'
  | 'modern'
  | 'executive'
  | 'academic'
  | 'editorial'
  | 'london'
  | 'nordic'
  | 'newyork'
  | 'atelier'
  | 'noir'
  | 'europass'
  | 'meridian'
  | 'graduate'
  | 'vertex'
  | 'sovereign'
  | 'ascend'
  | 'harbour'
  | 'pulse'
  | 'onyx'
  | 'sterling'
  | 'slate'
  | 'verde'
  | 'crimson'
  | 'atlas'
  | 'metro'
  | 'prestige'
  | 'compass'
  | 'beacon'
  | 'regent'
  | 'tandem'

export type ExportFormat = 'docx' | 'pdf'

export interface CVFormData {
  cvType: CVType
  fullName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  nationality?: string
  dob?: string
  linkedin?: string
  languages?: string
  rawContent?: string
  education?: string
  experience?: string
  extras?: string
  references?: string
  additionalInfo?: string   // legacy — kept for Word export + older sessions
  extraSections?: ExtraSection[]
  specialRequests?: string
  jobDescription?: string
  whyRole?: string

  // Academic optional fields
  gpa?: string
  thesis?: string
  research?: string
  publications?: string
  teaching?: string
  conferences?: string
  grants?: string
  supervision?: string
  orcid?: string

  // Job targeting fields
  jobTitle_target?: string
  company?: string
  // Target industry/sector — lets someone aim the CV ("banking", "NGO work")
  // when they have no specific advert to paste. Slants emphasis only.
  targetIndustry?: string

  // Cover-letter recipient (all optional) — for the formal Ghanaian address block
  addressee?: string        // e.g. "The Human Resource Manager", "The Registrar"
  companyAddress?: string   // e.g. "P. O. Box GP 667, Accra"
}

export interface GeneratedExperience {
  id: string
  role: string
  company: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface GeneratedEducation {
  id: string
  qualification: string
  field: string
  institution: string
  startYear: string
  endYear: string
  grade?: string | null
}

export interface ExtraSection {
  heading: string
  items: string[]
}

export interface GeneratedCV {
  fullName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  linkedin?: string
  dob?: string
  summary: string
  experience: GeneratedExperience[]
  education: GeneratedEducation[]
  skills: string[]
  attributes?: string[]
  languages?: string[]
  additionalInfo?: string
  coverLetterBody?: string
  // ── Cover-letter structured parts (traditional Ghanaian formal layout) ──
  // Only present on cover letters. The body stays in coverLetterBody; these
  // give the letter its formal frame so it renders ready-to-submit. The date
  // is not stored — it's filled with today's date at render time.
  clSubject?: string        // bold subject line, e.g. "APPLICATION FOR THE POSITION OF …"
  clRecipient?: string[]    // recipient block lines: addressee, institution, address…
  clSalutation?: string     // e.g. "Dear Sir/Madam,"
  clSignOff?: string        // e.g. "Yours faithfully,"
  publications?: string[]
  research?: string[]
  teaching?: string[]
}

export interface CheckCreditsResponse {
  hasCredits: boolean
  credits: number
  phoneNumber: string
}

export interface GenerateResponse {
  success: boolean
  cv?: GeneratedCV
  error?: string
}

export interface RegenerateResponse {
  success: boolean
  content?: string | string[]
  error?: string
}

export interface ExtractResponse {
  success: boolean
  text?: string
  error?: string
}
