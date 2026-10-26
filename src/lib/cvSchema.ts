// JSON schemas the writer's answers are constrained to (structured outputs), so
// a reply always parses and always has every field the designs read. Every
// property is required — absence is an empty string, empty list or null — and
// every object closes with additionalProperties: false, which the API requires.

const str = { type: 'string' }
const strList = { type: 'array', items: str }
const nullableStr = { anyOf: [str, { type: 'null' }] }
const obj = (properties: Record<string, unknown>) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
})

const changesReport = {
  type: 'array',
  items: obj({
    request: str,
    status: { type: 'string', enum: ['applied', 'partly', 'not_applied'] },
    note: str,
  }),
}

export const CV_SCHEMA = obj({
  fullName: str,
  jobTitle: str,
  targetRole: str,
  email: str,
  phone: str,
  location: str,
  linkedin: nullableStr,
  summary: str,
  experience: {
    type: 'array',
    items: obj({ id: str, role: str, company: str, startDate: str, endDate: str, bullets: strList }),
  },
  education: {
    type: 'array',
    items: obj({ id: str, qualification: str, field: str, institution: str, startYear: str, endYear: str, grade: nullableStr }),
  },
  skills: strList,
  attributes: strList,
  languages: strList,
  publications: strList,
  research: strList,
  teaching: strList,
  extraSections: { type: 'array', items: obj({ heading: str, items: strList }) },
  changesReport,
})

export const COVER_LETTER_SCHEMA = obj({
  fullName: str,
  jobTitle: str,
  email: str,
  phone: str,
  location: str,
  linkedin: nullableStr,
  clSubject: str,
  coverLetterBody: str,
})

// The trim pass returns one rewritten line per id it was given.
export function trimSchema(ids: string[]) {
  return obj(Object.fromEntries(ids.map(id => [id, str])))
}
