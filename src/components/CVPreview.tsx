'use client'

import { GeneratedCV, TemplateId } from '@/types'

// ════════════════════════════════════════════════════════════════
// CV PREVIEW — renders to screen AND PDF (via #cv-print-area)
// 4 premium designs, each perfect in PDF and matched 1:1 in Word.
// Vertex · Sovereign · Meridian · Pulse  +  ATS Classic fallback.
// A4 794px. Bulleted skills. Accent-colour aware. Full sections.
// ════════════════════════════════════════════════════════════════

const TEMPLATE_MAP: Record<string, 'vertex' | 'sovereign' | 'meridian' | 'pulse' | 'classic'> = {
  vertex: 'vertex', atelier: 'vertex', editorial: 'vertex',
  sovereign: 'sovereign', noir: 'sovereign', newyork: 'sovereign', executive: 'sovereign',
  meridian: 'meridian', modern: 'meridian', europass: 'meridian', graduate: 'meridian', nordic: 'meridian',
  pulse: 'pulse',
  classic: 'classic', academic: 'classic', london: 'classic',
}

const DEFAULT_ACCENT: Record<string, string> = {
  vertex: '#e0533d', sovereign: '#b08d3f', meridian: '#0d9488', pulse: '#6d4aff', classic: '#1a1a1a',
}

export default function CVPreview({ cv, templateId = 'meridian', accentColor }: { cv: GeneratedCV; templateId?: TemplateId; accentColor?: string | null }) {
  if (!cv) return null
  const design = TEMPLATE_MAP[templateId] || 'meridian'
  const accent = accentColor ? `#${accentColor.replace('#', '')}` : DEFAULT_ACCENT[design]

  if (design === 'vertex') return <Vertex cv={cv} A={accent} />
  if (design === 'sovereign') return <Sovereign cv={cv} A={accent} />
  if (design === 'pulse') return <Pulse cv={cv} A={accent} />
  if (design === 'classic') return <Classic cv={cv} A={accent} />
  return <Meridian cv={cv} A={accent} />
}

const A4: React.CSSProperties = { width: 794, minHeight: 1123, background: '#fff', margin: '0 auto', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }
const contact = (cv: GeneratedCV) => [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean).join('  •  ')
const isCL = (cv: GeneratedCV) => !!cv.coverLetterBody
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ════════════════════════════════════════════════════════════════
// 1. VERTEX — colour rail, oversized split-weight name, two columns
// ════════════════════════════════════════════════════════════════
function Vertex({ cv, A }: { cv: GeneratedCV; A: string }) {
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font="'Calibri', sans-serif" />
  const H = ({ t }: { t: string }) => <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#1c1c1c', marginBottom: 11 }}>— {t}</div>
  const first = cv.fullName.split(' ')[0], rest = cv.fullName.split(' ').slice(1).join(' ')

  return (
    <div style={{ ...A4, fontFamily: "'Calibri','Segoe UI',sans-serif", color: '#1a1a1a', display: 'grid', gridTemplateColumns: '38px 1fr' }}>
      <div style={{ background: A }} />
      <div style={{ padding: '44px 46px' }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 0.95, color: '#1c1c1c', textTransform: 'uppercase' }}>{first} </span>
          <span style={{ fontSize: 42, fontWeight: 300, letterSpacing: -1, color: '#1c1c1c', textTransform: 'uppercase' }}>{rest}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 40, height: 3, background: A }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: A }}>{cv.jobTitle}</span>
        </div>
        <div style={{ fontSize: 11.5, color: '#777', marginBottom: 30 }}>{contact(cv)}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 34px' }}>
          <div>
            <div style={{ marginBottom: 24 }}><H t="Profile" /><p style={{ fontSize: 11.8, lineHeight: 1.7, color: '#555', margin: 0 }}>{cv.summary}</p></div>
            <div><H t="Experience" />
              {cv.experience?.map(e => (
                <div key={e.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1c' }}>{e.role}</div>
                  <div style={{ fontSize: 11, color: A, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '2px 0 1px' }}>{e.company}</div>
                  <div style={{ fontSize: 10, color: '#999', marginBottom: 6, fontStyle: 'italic' }}>{e.startDate} – {e.endDate}</div>
                  <ul style={{ margin: 0, paddingLeft: 14 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 11.3, lineHeight: 1.55, color: '#555', marginBottom: 4 }}>{b}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
          <div>
            {!!cv.skills?.length && <div style={{ marginBottom: 24 }}><H t="Skills" /><ul style={{ margin: 0, paddingLeft: 14 }}>{cv.skills.map((s, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#555' }}>{s}</li>)}</ul></div>}
            {!!cv.education?.length && <div style={{ marginBottom: 24 }}><H t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 8 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{e.qualification} {e.field}</div><div style={{ fontSize: 11, color: '#666' }}>{e.institution}</div><div style={{ fontSize: 10, color: '#999', fontStyle: 'italic' }}>{e.startYear}–{e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div>)}</div>}
            {!!cv.languages?.length && <div style={{ marginBottom: 24 }}><H t="Languages" /><ul style={{ margin: 0, paddingLeft: 14 }}>{cv.languages.map((l, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#555' }}>{l}</li>)}</ul></div>}
            <AcademicExtras cv={cv} H={H} small />
            {cv.additionalInfo && <div><H t="Certifications" /><div style={{ fontSize: 11, lineHeight: 1.65, color: '#555', whiteSpace: 'pre-line' }}>{cv.additionalInfo}</div></div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 2. SOVEREIGN — prestige serif, circular crest, centered, gold
// ════════════════════════════════════════════════════════════════
function Sovereign({ cv, A }: { cv: GeneratedCV; A: string }) {
  const DARK = '#1a2238'
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font="'Georgia', serif" />
  const H = ({ t }: { t: string }) => (
    <div style={{ textAlign: 'center', marginBottom: 14 }}>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: DARK, borderBottom: `1px solid ${A}`, paddingBottom: 4 }}>{t}</span>
    </div>
  )
  return (
    <div style={{ ...A4, background: '#fdfcfa', fontFamily: "'Georgia', serif", color: '#22252b', padding: '46px 54px' }}>
      <div style={{ textAlign: 'center', paddingBottom: 22, borderBottom: `2px solid ${A}`, marginBottom: 8 }}>
        <div style={{ width: 60, height: 60, margin: '0 auto 14px', border: `2px solid ${A}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: DARK, letterSpacing: 1 }}>{initials(cv.fullName)}</span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: DARK, lineHeight: 1 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: A, marginTop: 10, fontWeight: 600 }}>{cv.jobTitle}</div>}
      </div>
      <div style={{ textAlign: 'center', fontSize: 10.5, letterSpacing: 1, color: '#888', marginBottom: 28, fontFamily: "'Calibri', sans-serif" }}>{contact(cv)}</div>

      {cv.summary && <div style={{ marginBottom: 24 }}><H t="Profile" /><p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#444', margin: 0, textAlign: 'center', fontStyle: 'italic' }}>{cv.summary}</p></div>}

      {!!cv.experience?.length && <div style={{ marginBottom: 24 }}><H t="Experience" />
        {cv.experience.map(e => (
          <div key={e.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{e.role}</span><span style={{ fontSize: 10.5, color: A, fontStyle: 'italic', fontFamily: "'Calibri', sans-serif" }}>{e.startDate} – {e.endDate}</span></div>
            <div style={{ fontSize: 12, color: A, fontStyle: 'italic', marginBottom: 7 }}>{e.company}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 11.8, lineHeight: 1.65, color: '#444', marginBottom: 4, fontFamily: "'Calibri', sans-serif" }}>{b}</li>)}</ul>
          </div>
        ))}
      </div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
        {!!cv.education?.length && <div><H t="Education" />{cv.education.map(e => <div key={e.id} style={{ textAlign: 'center', marginBottom: 8 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666', fontStyle: 'italic' }}>{e.institution}</div><div style={{ fontSize: 10.5, color: '#999', fontFamily: "'Calibri', sans-serif" }}>{e.startYear} – {e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div>)}</div>}
        {!!cv.skills?.length && <div><H t="Expertise" /><div style={{ textAlign: 'center', fontSize: 11.5, lineHeight: 1.9, color: '#444', fontFamily: "'Calibri', sans-serif" }}>{cv.skills.join(' · ')}</div>{!!cv.languages?.length && <div style={{ textAlign: 'center', fontSize: 11, color: '#666', marginTop: 8, fontFamily: "'Calibri', sans-serif" }}>{cv.languages.join(' · ')}</div>}</div>}
      </div>

      <AcademicExtras cv={cv} H={H} centered />
      {cv.additionalInfo && <div style={{ marginTop: 20 }}><H t="Additional Information" /><p style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444', margin: 0, textAlign: 'center', fontFamily: "'Calibri', sans-serif", whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 3. MERIDIAN — teal full-height sidebar, two-column modern
// ════════════════════════════════════════════════════════════════
function Meridian({ cv, A }: { cv: GeneratedCV; A: string }) {
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font="'Calibri', sans-serif" />
  const SB = ({ t, children }: any) => <div style={{ marginBottom: 26 }}><div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>{t}</div>{children}</div>
  const H = ({ t }: { t: string }) => <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: A, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>{t}<span style={{ flex: 1, height: 2, background: A, opacity: 0.25 }} /></div>

  return (
    <div style={{ ...A4, display: 'grid', gridTemplateColumns: '262px 1fr', fontFamily: "'Calibri','Segoe UI',sans-serif", color: '#1a1a1a' }}>
      <div style={{ background: A, color: '#fff', padding: '40px 26px' }}>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15, marginBottom: 4 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500, marginBottom: 24, letterSpacing: 0.3 }}>{cv.jobTitle}</div>}
        <SB t="Contact">{[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).map((c, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 7, opacity: 0.95, wordBreak: 'break-word', lineHeight: 1.4 }}>{c}</div>)}</SB>
        {!!cv.skills?.length && <SB t="Skills">{cv.skills.map((s, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 6, opacity: 0.95, display: 'flex', gap: 7 }}><span style={{ opacity: 0.7 }}>›</span><span>{s}</span></div>)}</SB>}
        {!!cv.languages?.length && <SB t="Languages">{cv.languages.map((l, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 6, opacity: 0.95 }}>{l}</div>)}</SB>}
      </div>
      <div style={{ padding: '40px 32px' }}>
        {cv.summary && <div style={{ marginBottom: 22 }}><H t="Profile" /><p style={{ fontSize: 12.5, lineHeight: 1.7, color: '#333', margin: 0 }}>{cv.summary}</p></div>}
        {!!cv.experience?.length && <div style={{ marginBottom: 22 }}><H t="Experience" />
          {cv.experience.map(e => (
            <div key={e.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 10.5, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div>
              <div style={{ fontSize: 12, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.6, color: '#333', marginBottom: 4 }}>{b}</li>)}</ul>
            </div>
          ))}
        </div>}
        {!!cv.education?.length && <div style={{ marginBottom: 22 }}><H t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 10.5, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div><div style={{ fontSize: 11.5, color: '#666' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div>)}</div>}
        <AcademicExtras cv={cv} H={H} />
        {cv.additionalInfo && <div><H t="Additional Information" /><p style={{ fontSize: 12, lineHeight: 1.7, color: '#333', margin: 0, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div>}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 4. PULSE — dark full-height sidebar, pill title (no corner shape)
// ════════════════════════════════════════════════════════════════
function Pulse({ cv, A }: { cv: GeneratedCV; A: string }) {
  const DARK = '#15131f'
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font="'Calibri', sans-serif" />
  const H = ({ t }: { t: string }) => <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: A, marginBottom: 12 }}>{t}</div>
  const SH = ({ t }: { t: string }) => <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: A, marginBottom: 13 }}>{t}</div>

  return (
    <div style={{ ...A4, fontFamily: "'Calibri','Segoe UI',sans-serif", color: '#1a1a1a' }}>
      <div style={{ padding: '46px 46px 0' }}>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, color: DARK }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ display: 'inline-block', background: A, color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '5px 16px', borderRadius: 20, margin: '10px 0 16px' }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: 11.5, color: '#777', marginBottom: 8 }}>{contact(cv)}</div>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${A}, transparent)`, marginBottom: 26 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px' }}>
        <div style={{ padding: '0 30px 40px 46px' }}>
          {cv.summary && <div style={{ marginBottom: 24 }}><H t="Profile" /><p style={{ fontSize: 12.3, lineHeight: 1.7, color: '#444', margin: 0 }}>{cv.summary}</p></div>}
          {!!cv.experience?.length && <div><H t="Experience" />
            {cv.experience.map(e => (
              <div key={e.id} style={{ marginBottom: 17, paddingLeft: 16, borderLeft: `3px solid ${A}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>{e.role}</span><span style={{ fontSize: 10, color: '#999', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div>
                <div style={{ fontSize: 11.5, color: A, fontWeight: 700, margin: '2px 0 7px' }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: 15 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.6, color: '#444', marginBottom: 4 }}>{b}</li>)}</ul>
              </div>
            ))}
          </div>}
          <AcademicExtras cv={cv} H={H} />
        </div>
        <div style={{ background: DARK, color: '#fff', padding: '34px 26px' }}>
          {!!cv.skills?.length && <div style={{ marginBottom: 26 }}><SH t="Skills" /><ul style={{ margin: 0, paddingLeft: 14 }}>{cv.skills.map((s, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)' }}>{s}</li>)}</ul></div>}
          {!!cv.education?.length && <div style={{ marginBottom: 26 }}><SH t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 8 }}><div style={{ fontSize: 11.8, fontWeight: 700, color: '#fff' }}>{e.qualification} {e.field}</div><div style={{ fontSize: 10.8, color: 'rgba(255,255,255,0.7)' }}>{e.institution}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{e.startYear}–{e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div>)}</div>}
          {!!cv.languages?.length && <div style={{ marginBottom: 26 }}><SH t="Languages" /><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{cv.languages.map((l, i) => <span key={i} style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '3px 11px', borderRadius: 14 }}>{l}</span>)}</div></div>}
          {cv.additionalInfo && <div><SH t="Certifications" /><div style={{ fontSize: 10.8, lineHeight: 1.65, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-line' }}>{cv.additionalInfo}</div></div>}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// CLASSIC — ATS-safe fallback (also used for London/Academic)
// ════════════════════════════════════════════════════════════════
function Classic({ cv, A }: { cv: GeneratedCV; A: string }) {
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font="'Calibri', sans-serif" />
  const H = ({ t }: { t: string }) => <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: A, borderBottom: `2px solid ${A}`, paddingBottom: 4, marginBottom: 10 }}>{t}</div>
  return (
    <div style={{ ...A4, fontFamily: "'Calibri','Segoe UI',sans-serif", color: '#1a1a1a', padding: '44px 48px' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 13.5, color: '#555', marginBottom: 8 }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: 11, color: '#666' }}>{contact(cv)}</div>
      </div>
      {cv.summary && <div style={{ marginBottom: 18 }}><H t="Professional Summary" /><p style={{ fontSize: 12.5, lineHeight: 1.7, color: '#333', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div>}
      {!!cv.experience?.length && <div style={{ marginBottom: 18 }}><H t="Professional Experience" />
        {cv.experience.map(e => (
          <div key={e.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div>
            <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 6 }}>{e.company}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.6, color: '#333', marginBottom: 4 }}>{b}</li>)}</ul>
          </div>
        ))}
      </div>}
      {!!cv.education?.length && <div style={{ marginBottom: 18 }}><H t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div>)}</div>}
      {!!cv.skills?.length && <div style={{ marginBottom: 18 }}><H t="Core Skills" /><div style={{ fontSize: 12, color: '#333', lineHeight: 1.9 }}>{cv.skills.join('  •  ')}</div></div>}
      {!!cv.languages?.length && <div style={{ marginBottom: 18 }}><H t="Languages" /><div style={{ fontSize: 12, color: '#333' }}>{cv.languages.join('  •  ')}</div></div>}
      <AcademicExtras cv={cv} H={H} />
      {cv.additionalInfo && <div><H t="Additional Information" /><p style={{ fontSize: 12, lineHeight: 1.7, color: '#333', margin: 0, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div>}
    </div>
  )
}

// ── shared academic sections ──
function AcademicExtras({ cv, H, small, centered }: { cv: GeneratedCV; H: any; small?: boolean; centered?: boolean }) {
  const fs = small ? 11 : 11.8
  const li = (items: string[]) => <ul style={{ margin: 0, paddingLeft: centered ? 0 : 18, listStyle: centered ? 'none' as const : undefined }}>{items.map((x, i) => <li key={i} style={{ fontSize: fs, lineHeight: 1.6, color: '#444', marginBottom: 5, fontFamily: "'Calibri', sans-serif", textAlign: centered ? 'center' as const : undefined }}>{x}</li>)}</ul>
  return (
    <>
      {!!cv.publications?.length && <div style={{ marginBottom: 18 }}><H t="Publications" />{li(cv.publications)}</div>}
      {!!cv.research?.length && <div style={{ marginBottom: 18 }}><H t="Research" />{li(cv.research)}</div>}
      {!!cv.teaching?.length && <div style={{ marginBottom: 18 }}><H t="Teaching Experience" />{li(cv.teaching)}</div>}
    </>
  )
}

// ── shared cover letter ──
function CoverLetter({ cv, A, font }: { cv: GeneratedCV; A: string; font: string }) {
  return (
    <div style={{ ...A4, fontFamily: font, color: '#1a1a1a', padding: '52px 56px' }}>
      <div style={{ borderBottom: `2px solid ${A}`, paddingBottom: 18, marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: A, marginBottom: 4 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 8 }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: 11, color: '#666', fontFamily: "'Calibri', sans-serif" }}>{contact(cv)}</div>
      </div>
      {(cv.coverLetterBody || '').split('\n\n').map((p, i) => <p key={i} style={{ fontSize: 13, lineHeight: 1.85, color: '#222', marginBottom: 16, textAlign: 'justify' }}>{p}</p>)}
    </div>
  )
}
