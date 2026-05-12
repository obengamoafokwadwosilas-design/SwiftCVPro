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
  references?: string
  additionalInfo?: string
  specialRequests?: string
  jobDescription?: string
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

export interface GeneratedCV {
  fullName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  linkedin?: string
  summary: string
  experience: GeneratedExperience[]
  education: GeneratedEducation[]
  skills: string[]
  languages?: string[]
  additionalInfo?: string
  coverLetterBody?: string
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
