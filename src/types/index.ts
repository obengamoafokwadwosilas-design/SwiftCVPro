export type CVType = 'professional' | 'targeted' | 'academic' | 'cover_letter'

export type TemplateId =
  | 'classic'
  | 'modern'
  | 'executive'
  | 'editorial'

export interface CVFormData {
  cvType: CVType
  fullName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  rawContent?: string
  jobDescription?: string
}

export interface GeneratedCV {
  fullName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  linkedin?: string
  summary: string

  experience: {
    id: string
    company: string
    role: string
    startDate: string
    endDate: string
    bullets: string[]
  }[]

  education: {
    id: string
    institution: string
    qualification: string
    field: string
    startYear: string
    endYear: string
    grade?: string
  }[]

  skills: string[]
  languages?: string[]
}
