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

  if (templateId === 'executive') return <ExecutiveCV cv={cv} />
  if (templateId === 'modern') return <ModernCV cv={cv} />
  if (templateId === 'editorial') return <EditorialCV cv={cv} />

  return <ClassicCV cv={cv} />
}

function contactLine(cv: GeneratedCV) {
  return [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(' • ')
}

function Section({ title, children }: any) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: 2,
          borderBottom: '1px solid #ddd',
          paddingBottom: 6,
          marginBottom: 10,
          fontWeight: 800
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Experience({ cv }: { cv: GeneratedCV }) {
  return (
    <>
      {cv.experience?.map((exp) => (
        <div key={exp.id} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
            <strong>{exp.role}</strong>
            <span style={{ fontSize: 11, color: '#666' }}>
              {exp.startDate} – {exp.endDate}
            </span>
          </div>
          <div style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 6 }}>
            {exp.company}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7 }}>
            {exp.bullets?.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      ))}
    </>
  )
}

function Education({ cv }: { cv: GeneratedCV }) {
  return (
    <>
      {cv.education?.map((edu) => (
        <div key={edu.id} style={{ marginBottom: 12, fontSize: 12 }}>
          <strong>{edu.qualification} {edu.field ? `in ${edu.field}` : ''}</strong>
          <div>{edu.institution}</div>
          <div style={{ color: '#666' }}>
            {edu.startYear} – {edu.endYear}
            {edu.grade ? ` • ${edu.grade}` : ''}
          </div>
        </div>
      ))}
    </>
  )
}

function Skills({ cv }: { cv: GeneratedCV }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {cv.skills?.map((skill, i) => (
        <span
          key={i}
          style={{
            fontSize: 11,
            border: '1px solid #ddd',
            padding: '5px 8px',
            borderRadius: 999
          }}
        >
          {skill}
        </span>
      ))}
    </div>
  )
}

function ClassicCV({ cv }: { cv: GeneratedCV }) {
  return (
    <CVPaper>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h1 style={{ fontSize: 30, margin: 0, letterSpacing: -0.5 }}>{cv.fullName}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600 }}>{cv.jobTitle}</p>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#666' }}>{contactLine(cv)}</p>
      </div>

      <Section title="Professional Summary">
        <p style={{ fontSize: 12, lineHeight: 1.7 }}>{cv.summary}</p>
      </Section>

      <Section title="Professional Experience"><Experience cv={cv} /></Section>
      <Section title="Education"><Education cv={cv} /></Section>
      <Section title="Skills"><Skills cv={cv} /></Section>
    </CVPaper>
  )
}

function ModernCV({ cv }: { cv: GeneratedCV }) {
  return (
    <CVPaper noPadding>
      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', minHeight: 1123 }}>
        <aside style={{ background: '#0f766e', color: 'white', padding: 32 }}>
          <h1 style={{ fontSize: 28, lineHeight: 1.05, margin: 0 }}>{cv.fullName}</h1>
          <p style={{ fontSize: 13, opacity: 0.9 }}>{cv.jobTitle}</p>

          <SectionDark title="Contact">
            {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).map((x, i) => (
              <p key={i} style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>{x}</p>
            ))}
          </SectionDark>

          <SectionDark title="Skills">
            {cv.skills?.map((skill, i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 7 }}>{skill}</div>
            ))}
          </SectionDark>

          {cv.languages?.length ? (
            <SectionDark title="Languages">
              {cv.languages.map((l, i) => (
                <div key={i} style={{ fontSize: 11, marginBottom: 7 }}>{l}</div>
              ))}
            </SectionDark>
          ) : null}
        </aside>

        <main style={{ padding: 38 }}>
          <Section title="Profile">
            <p style={{ fontSize: 12, lineHeight: 1.7 }}>{cv.summary}</p>
          </Section>
          <Section title="Experience"><Experience cv={cv} /></Section>
          <Section title="Education"><Education cv={cv} /></Section>
        </main>
      </div>
    </CVPaper>
  )
}

function ExecutiveCV({ cv }: { cv: GeneratedCV }) {
  return (
    <CVPaper noPadding>
      <header style={{ background: '#0a1a3a', color: 'white', padding: '42px 46px' }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: '#e5c98f', marginBottom: 12 }}>
          EXECUTIVE PROFILE
        </div>
        <h1 style={{ fontSize: 34, margin: 0, fontFamily: 'Georgia, serif' }}>{cv.fullName}</h1>
        <div style={{ width: 70, height: 2, background: '#c9a05a', margin: '14px 0' }} />
        <p style={{ margin: 0, color: '#e5c98f', fontSize: 14 }}>{cv.jobTitle}</p>
        <p style={{ marginTop: 12, fontSize: 11, color: '#d0d6e0' }}>{contactLine(cv)}</p>
      </header>

      <main style={{ padding: 42 }}>
        <Section title="Executive Summary">
          <p style={{ fontSize: 12, lineHeight: 1.8 }}>{cv.summary}</p>
        </Section>
        <Section title="Professional Experience"><Experience cv={cv} /></Section>
        <Section title="Education"><Education cv={cv} /></Section>
        <Section title="Core Competencies"><Skills cv={cv} /></Section>
      </main>
    </CVPaper>
  )
}

function EditorialCV({ cv }: { cv: GeneratedCV }) {
  return (
    <CVPaper>
      <div style={{ fontSize: 10, letterSpacing: 4, color: '#9a5f2e' }}>
        CURRICULUM VITAE
      </div>
      <h1 style={{ fontSize: 36, fontFamily: 'Georgia, serif', fontWeight: 400, margin: '8px 0 0' }}>
        {cv.fullName}
      </h1>
      <p style={{ fontSize: 14, fontStyle: 'italic', color: '#6b5742' }}>{cv.jobTitle}</p>
      <p style={{ fontSize: 11, color: '#888' }}>{contactLine(cv)}</p>

      <div style={{ height: 1, background: '#d9cfbf', margin: '22px 0' }} />

      <Section title="Summary">
        <p style={{ fontSize: 12, lineHeight: 1.8 }}>{cv.summary}</p>
      </Section>
      <Section title="Experience"><Experience cv={cv} /></Section>
      <Section title="Education"><Education cv={cv} /></Section>
      <Section title="Skills"><Skills cv={cv} /></Section>
    </CVPaper>
  )
}

function SectionDark({ title, children }: any) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, borderBottom: '1px solid rgba(255,255,255,.35)', paddingBottom: 6 }}>
        {title}
      </h2>
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  )
}

function CVPaper({ children, noPadding = false }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24, background: '#f1f5f9' }}>
      <div
        style={{
          width: 794,
          minHeight: 1123,
          background: '#fff',
          padding: noPadding ? 0 : 42,
          boxShadow: '0 20px 60px rgba(15,23,42,.16)',
          color: '#111',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {children}
      </div>
    </div>
  )
}
