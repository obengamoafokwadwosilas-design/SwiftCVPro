'use client'

import { GeneratedCV } from '@/types'

export default function CVPreview({ cv }: { cv: GeneratedCV }) {
  if (!cv) return null

  return (
    <div className="flex justify-center bg-gray-100 py-10">
      <div
        className="bg-white shadow-xl"
        style={{
          width: '794px', // A4 width
          minHeight: '1123px', // A4 height
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
          color: '#111'
        }}
      >
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{cv.fullName}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {cv.email} • {cv.phone} • {cv.location}
          </p>
        </div>

        {/* SUMMARY */}
        <Section title="Professional Summary">
          <p className="text-sm leading-relaxed">{cv.summary}</p>
        </Section>

        {/* EXPERIENCE */}
        <Section title="Experience">
          {cv.experience?.map((exp) => (
            <div key={exp.id} className="mb-4">
              <div className="flex justify-between">
                <h3 className="font-semibold">{exp.role}</h3>
                <span className="text-xs text-gray-500">
                  {exp.startDate} - {exp.endDate}
                </span>
              </div>
              <p className="text-sm italic">{exp.company}</p>
              <ul className="list-disc ml-5 mt-1 text-sm">
                {exp.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        {/* EDUCATION */}
        <Section title="Education">
          {cv.education?.map((edu) => (
            <div key={edu.id} className="mb-3">
              <h3 className="font-semibold">{edu.institution}</h3>
              <p className="text-sm">
                {edu.qualification} — {edu.field}
              </p>
              <span className="text-xs text-gray-500">
                {edu.startYear} - {edu.endYear}
              </span>
            </div>
          ))}
        </Section>

        {/* SKILLS */}
        <Section title="Skills">
          <div className="flex flex-wrap gap-2 text-sm">
            {cv.skills?.map((skill, i) => (
              <span
                key={i}
                className="border px-2 py-1 rounded-md bg-gray-50"
              >
                {skill}
              </span>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: any) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold border-b pb-1 mb-2">
        {title}
      </h2>
      {children}
    </div>
  )
}
