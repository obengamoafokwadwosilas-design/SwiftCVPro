'use client'

import { GeneratedCV, TemplateId } from '@/types'

export default function CVPreview({
  cv,
  templateId = 'classic'
}: {
  cv: GeneratedCV
  templateId?: TemplateId
}) {
  if (!cv) return null

  if (templateId === 'modern') return <Modern cv={cv} />
  if (templateId === 'executive') return <Executive cv={cv} />
  if (templateId === 'editorial') return <Editorial cv={cv} />

  return <Classic cv={cv} />
}

function Paper({ children }: any) {
  return (
    <div className="flex justify-center bg-gray-100 py-10">
      <div
        className="bg-white shadow-xl"
        style={{ width: 794, minHeight: 1123, padding: 40 }}
      >
        {children}
      </div>
    </div>
  )
}

function Section({ title, children }: any) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold uppercase border-b pb-1 mb-2">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Classic({ cv }: { cv: GeneratedCV }) {
  return (
    <Paper>
      <h1 className="text-3xl font-bold">{cv.fullName}</h1>
      <p className="text-sm text-gray-600">
        {cv.email} • {cv.phone} • {cv.location}
      </p>

      <Section title="Summary">
        <p className="text-sm">{cv.summary}</p>
      </Section>

      <Section title="Experience">
        {cv.experience.map((e) => (
          <div key={e.id} className="mb-3">
            <b>{e.role}</b> — {e.company}
            <ul className="list-disc ml-5 text-sm">
              {e.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Education">
        {cv.education.map((e) => (
          <div key={e.id} className="text-sm">
            {e.qualification} — {e.institution}
          </div>
        ))}
      </Section>

      <Section title="Skills">
        <p className="text-sm">{cv.skills.join(', ')}</p>
      </Section>
    </Paper>
  )
}

function Modern({ cv }: { cv: GeneratedCV }) {
  return (
    <Paper>
      <div className="grid grid-cols-[200px_1fr] gap-6">
        <div className="bg-teal-700 text-white p-4">
          <h2 className="text-xl font-bold">{cv.fullName}</h2>
          <p>{cv.jobTitle}</p>
          <hr className="my-3" />
          <p className="text-sm">{cv.email}</p>
          <p className="text-sm">{cv.phone}</p>
          <p className="text-sm">{cv.location}</p>
        </div>

        <div>
          <Section title="Summary">
            <p className="text-sm">{cv.summary}</p>
          </Section>

          <Section title="Experience">
            {cv.experience.map((e) => (
              <div key={e.id}>
                <b>{e.role}</b>
                <ul className="list-disc ml-5 text-sm">
                  {e.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>
        </div>
      </div>
    </Paper>
  )
}

function Executive({ cv }: { cv: GeneratedCV }) {
  return (
    <Paper>
      <div className="bg-blue-900 text-white p-6 mb-6">
        <h1 className="text-3xl">{cv.fullName}</h1>
        <p>{cv.jobTitle}</p>
      </div>

      <Section title="Summary">
        <p className="text-sm">{cv.summary}</p>
      </Section>
    </Paper>
  )
}

function Editorial({ cv }: { cv: GeneratedCV }) {
  return (
    <Paper>
      <h1 className="text-4xl font-serif">{cv.fullName}</h1>
      <p className="italic">{cv.jobTitle}</p>

      <Section title="Profile">
        <p className="text-sm">{cv.summary}</p>
      </Section>
    </Paper>
  )
}
