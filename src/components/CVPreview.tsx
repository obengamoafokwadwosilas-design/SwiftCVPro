'use client'

import { GeneratedCV, TemplateId } from '@/types'

// ════════════════════════════════════════════════════════════════
// CV PREVIEW — renders to screen AND PDF (via #cv-print-area)
// 6 premium designs + ATS Classic. Cambria body, looser spacing,
// justified summary. Sidebar-left (Meridian) puts name in main col.
// ════════════════════════════════════════════════════════════════

const TEMPLATE_MAP: Record<string, 'vertex' | 'sovereign' | 'meridian' | 'ascend' | 'harbour' | 'pulse' | 'classic'> = {
  vertex: 'vertex', atelier: 'vertex', editorial: 'vertex',
  sovereign: 'sovereign', newyork: 'sovereign', executive: 'sovereign',
  meridian: 'meridian', modern: 'meridian', europass: 'meridian', graduate: 'meridian',
  ascend: 'ascend',
  harbour: 'harbour', nordic: 'harbour',
  pulse: 'pulse', noir: 'pulse',
  classic: 'classic', academic: 'classic', london: 'classic',
}

const DEFAULT_ACCENT: Record<string, string> = {
  vertex: '#e0533d', sovereign: '#b08d3f', meridian: '#0d9488', ascend: '#1d4ed8', harbour: '#0f766e', pulse: '#6d4aff', classic: '#1a1a1a',
}

const BODY_SERIF = "'Cambria', Georgia, serif"
const BODY_SANS = "'Calibri', 'Segoe UI', sans-serif"

export default function CVPreview({ cv, templateId = 'meridian', accentColor }: { cv: GeneratedCV; templateId?: TemplateId; accentColor?: string | null }) {
  if (!cv) return null
  const design = TEMPLATE_MAP[templateId] || 'meridian'
  const accent = accentColor ? `#${accentColor.replace('#', '')}` : DEFAULT_ACCENT[design]

  if (design === 'vertex') return <Vertex cv={cv} A={accent} />
  if (design === 'sovereign') return <Sovereign cv={cv} A={accent} />
  if (design === 'ascend') return <Ascend cv={cv} A={accent} />
  if (design === 'harbour') return <Harbour cv={cv} A={accent} />
  if (design === 'pulse') return <Pulse cv={cv} A={accent} />
  if (design === 'classic') return <Classic cv={cv} A={accent} />
  return <Meridian cv={cv} A={accent} />
}

const A4: React.CSSProperties = { width: 794, minHeight: 1123, background: '#fff', margin: '0 auto', boxSizing: 'border-box', position: 'relative' }
const contact = (cv: GeneratedCV) => [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean).join('  •  ')
const isCL = (cv: GeneratedCV) => !!cv.coverLetterBody
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ════════════════════════════════════════════════════════════════
// 1. VERTEX — colour rail, full-width name, two columns
// ════════════════════════════════════════════════════════════════
function Vertex({ cv, A }: { cv: GeneratedCV; A: string }) {
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font={BODY_SERIF} />
  const H = ({ t }: { t: string }) => <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#1c1c1c', marginBottom: 12 }}>— {t}</div>
  const first = cv.fullName.split(' ')[0], rest = cv.fullName.split(' ').slice(1).join(' ')
  return (
    <div style={{ ...A4, fontFamily: BODY_SERIF, color: '#1a1a1a', display: 'grid', gridTemplateColumns: '38px 1fr' }}>
      <div style={{ background: A }} />
      <div style={{ padding: '46px 46px' }}>
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
            <div style={{ marginBottom: 26 }}><H t="Profile" /><p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div>
            <div><H t="Experience" />
              {cv.experience?.map(e => (
                <div key={e.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1c' }}>{e.role}</div>
                  <div style={{ fontSize: 11, color: A, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '2px 0 1px' }}>{e.company}</div>
                  <div style={{ fontSize: 10, color: '#999', marginBottom: 6, fontStyle: 'italic' }}>{e.startDate} – {e.endDate}</div>
                  <ul style={{ margin: 0, paddingLeft: 14 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444', marginBottom: 5 }}>{b}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
          <div>
            {!!cv.skills?.length && <div style={{ marginBottom: 26 }}><H t="Skills" /><ul style={{ margin: 0, paddingLeft: 14 }}>{cv.skills.map((s, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.85, color: '#444' }}>{s}</li>)}</ul></div>}
            {!!cv.education?.length && <div style={{ marginBottom: 26 }}><H t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 9 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{e.qualification} {e.field}</div><div style={{ fontSize: 11, color: '#666' }}>{e.institution}</div><div style={{ fontSize: 10, color: '#999', fontStyle: 'italic' }}>{e.startYear}–{e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div>)}</div>}
            {!!cv.languages?.length && <div style={{ marginBottom: 26 }}><H t="Languages" /><ul style={{ margin: 0, paddingLeft: 14 }}>{cv.languages.map((l, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.85, color: '#444' }}>{l}</li>)}</ul></div>}
            <AcademicExtras cv={cv} H={H} />
            {cv.additionalInfo && <div><H t="Certifications" /><div style={{ fontSize: 11, lineHeight: 1.75, color: '#444', whiteSpace: 'pre-line' }}>{cv.additionalInfo}</div></div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 2. SOVEREIGN — crest, gold. Centered header, LEFT-aligned body.
// ════════════════════════════════════════════════════════════════
function Sovereign({ cv, A }: { cv: GeneratedCV; A: string }) {
  const DARK = '#1a2238'
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font={BODY_SERIF} />
  const H = ({ t }: { t: string }) => (
    <div style={{ textAlign: 'center', marginBottom: 14 }}>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: DARK, borderBottom: `1px solid ${A}`, paddingBottom: 4 }}>{t}</span>
    </div>
  )
  return (
    <div style={{ ...A4, background: '#fdfcfa', fontFamily: BODY_SERIF, color: '#22252b', padding: '46px 54px' }}>
      <div style={{ textAlign: 'center', paddingBottom: 22, borderBottom: `2px solid ${A}`, marginBottom: 8 }}>
        <div style={{ width: 60, height: 60, margin: '0 auto 14px', border: `2px solid ${A}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: DARK, letterSpacing: 1 }}>{initials(cv.fullName)}</span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: DARK, lineHeight: 1 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: A, marginTop: 10, fontWeight: 600 }}>{cv.jobTitle}</div>}
      </div>
      <div style={{ textAlign: 'center', fontSize: 10.5, letterSpacing: 1, color: '#888', marginBottom: 28, fontFamily: BODY_SANS }}>{contact(cv)}</div>
      {cv.summary && <div style={{ marginBottom: 24 }}><H t="Profile" /><p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div>}
      {!!cv.experience?.length && <div style={{ marginBottom: 24 }}><H t="Experience" />
        {cv.experience.map(e => (
          <div key={e.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{e.role}</span><span style={{ fontSize: 10.5, color: A, fontStyle: 'italic', fontFamily: BODY_SANS }}>{e.startDate} – {e.endDate}</span></div>
            <div style={{ fontSize: 12, color: A, fontStyle: 'italic', marginBottom: 7 }}>{e.company}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 11.8, lineHeight: 1.75, color: '#444', marginBottom: 5, fontFamily: BODY_SANS }}>{b}</li>)}</ul>
          </div>
        ))}
      </div>}
      {!!cv.education?.length && <div style={{ marginBottom: 24 }}><H t="Education" />
        {cv.education.map(e => (
          <div key={e.id} style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: DARK }}>{e.qualification} in {e.field}</div>
              <div style={{ fontSize: 11.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div>
            </div>
            <div style={{ fontSize: 10.5, color: A, fontStyle: 'italic', whiteSpace: 'nowrap', fontFamily: BODY_SANS }}>{e.startYear} – {e.endYear}</div>
          </div>
        ))}
      </div>}
      {!!cv.skills?.length && <div style={{ marginBottom: 20 }}><H t="Expertise" /><div style={{ textAlign: 'center', fontSize: 11.5, lineHeight: 1.95, color: '#444', fontFamily: BODY_SANS }}>{cv.skills.join('   ·   ')}</div>{!!cv.languages?.length && <div style={{ textAlign: 'center', fontSize: 11, color: '#666', marginTop: 8, fontFamily: BODY_SANS }}>{cv.languages.join('   ·   ')}</div>}</div>}
      <AcademicExtras cv={cv} H={H} />
      {cv.additionalInfo && <div style={{ marginTop: 18 }}><H t="Additional Information" /><p style={{ fontSize: 11.5, lineHeight: 1.75, color: '#444', margin: 0, textAlign: 'center', fontFamily: BODY_SANS, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 3. MERIDIAN — teal sidebar (left), name/title in MAIN column right
// ════════════════════════════════════════════════════════════════
function Meridian({ cv, A }: { cv: GeneratedCV; A: string }) {
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font={BODY_SANS} />
  const SB = ({ t, children }: any) => <div style={{ marginBottom: 26 }}><div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>{t}</div>{children}</div>
  const H = ({ t }: { t: string }) => <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: A, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>{t}<span style={{ flex: 1, height: 2, background: A, opacity: 0.25 }} /></div>
  return (
    <div style={{ ...A4, display: 'grid', gridTemplateColumns: '262px 1fr', fontFamily: BODY_SERIF, color: '#1a1a1a',
      // gradient painted as the page background → repeats full-height on EVERY page in print
      background: `linear-gradient(90deg, ${A} 0, ${A} 262px, #fff 262px, #fff 100%)`,
      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <div style={{ color: '#fff', padding: '40px 26px' }}>
        <SB t="Contact">{[cv.phone, cv.email, cv.location, cv.linkedin].filter(Boolean).map((c, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 7, opacity: 0.95, wordBreak: 'break-word', lineHeight: 1.5 }}>{c}</div>)}</SB>
        {!!cv.skills?.length && <SB t="Skills">{cv.skills.map((s, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 7, opacity: 0.95, display: 'flex', gap: 7 }}><span style={{ opacity: 0.7 }}>›</span><span>{s}</span></div>)}</SB>}
        {!!cv.languages?.length && <SB t="Languages">{cv.languages.map((l, i) => <div key={i} style={{ fontSize: 11.5, marginBottom: 7, opacity: 0.95 }}>{l}</div>)}</SB>}
      </div>
      <div style={{ padding: '40px 32px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 4 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 14, color: A, fontWeight: 600, letterSpacing: 0.5, marginBottom: 22, textTransform: 'uppercase' }}>{cv.jobTitle}</div>}
        {cv.summary && <div style={{ marginBottom: 22 }}><H t="Profile" /><p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#333', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div>}
        {!!cv.experience?.length && <div style={{ marginBottom: 22 }}><H t="Experience" />
          {cv.experience.map(e => (
            <div key={e.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 10.5, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div>
              <div style={{ fontSize: 12, color: A, fontWeight: 600, marginBottom: 6 }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.7, color: '#333', marginBottom: 5 }}>{b}</li>)}</ul>
            </div>
          ))}
        </div>}
        {!!cv.education?.length && <div style={{ marginBottom: 22 }}><H t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 10.5, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div><div style={{ fontSize: 11.5, color: '#666' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div>)}</div>}
        <AcademicExtras cv={cv} H={H} />
        {cv.additionalInfo && <div><H t="Additional Information" /><p style={{ fontSize: 12, lineHeight: 1.75, color: '#333', margin: 0, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div>}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 4. ASCEND — single column, colour-bar section titles
// ════════════════════════════════════════════════════════════════
function Ascend({ cv, A }: { cv: GeneratedCV; A: string }) {
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font={BODY_SANS} />
  const H = ({ t }: { t: string }) => <div style={{ background: A, color: '#fff', fontSize: 12.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', padding: '7px 16px', marginBottom: 12 }}>{t}</div>
  return (
    <div style={{ ...A4, fontFamily: BODY_SERIF, color: '#1a1a1a', padding: '44px 46px' }}>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 0.5, color: '#1a1a1a', textTransform: 'uppercase', marginBottom: 6 }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: 15, color: A, fontWeight: 700, marginBottom: 8 }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: 11.5, color: '#777', marginBottom: 24 }}>{contact(cv).replace(/•/g, '|')}</div>
      {cv.summary && <div style={{ marginBottom: 18 }}><H t="Profile" /><p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#333', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div>}
      {!!cv.experience?.length && <div style={{ marginBottom: 18 }}><H t="Professional Experience" />
        {cv.experience.map(e => (
          <div key={e.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div>
            <div style={{ fontSize: 12, color: A, fontWeight: 700, marginBottom: 6 }}>{e.company}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.7, color: '#333', marginBottom: 4 }}>{b}</li>)}</ul>
          </div>
        ))}
      </div>}
      {!!cv.education?.length && <div style={{ marginBottom: 18 }}><H t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div>)}</div>}
      {!!cv.skills?.length && <div style={{ marginBottom: 18 }}><H t="Core Skills" /><div style={{ fontSize: 12, color: '#333', lineHeight: 2 }}>{cv.skills.join('  •  ')}</div>{!!cv.languages?.length && <div style={{ fontSize: 12, color: '#333', marginTop: 6 }}><strong>Languages:</strong> {cv.languages.join(', ')}</div>}</div>}
      <AcademicExtras cv={cv} H={H} />
      {cv.additionalInfo && <div><H t="Additional Information" /><p style={{ fontSize: 12, lineHeight: 1.75, color: '#333', margin: 0, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 5. HARBOUR — single column, accent tick headings, editorial
// ════════════════════════════════════════════════════════════════
function Harbour({ cv, A }: { cv: GeneratedCV; A: string }) {
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font={BODY_SERIF} />
  const H = ({ t }: { t: string }) => <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1a2a2a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 4, height: 16, background: A }} />{t}</div>
  return (
    <div style={{ ...A4, fontFamily: BODY_SERIF, color: '#1a2a2a', padding: '46px 50px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ width: 5, alignSelf: 'stretch', background: A, minHeight: 56 }} />
        <div>
          <div style={{ fontSize: 38, fontWeight: 700, color: '#1a2a2a', lineHeight: 1 }}>{cv.fullName}</div>
          {cv.jobTitle && <div style={{ fontSize: 16, color: A, fontStyle: 'italic', marginTop: 6 }}>{cv.jobTitle}</div>}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: '#778080', marginBottom: 18 }}>{contact(cv).replace(/•/g, '   ')}</div>
      <div style={{ borderBottom: '1px solid #d8e0e0', marginBottom: 22 }} />
      {cv.summary && <div style={{ marginBottom: 22 }}><H t="Profile" /><p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div>}
      {!!cv.experience?.length && <div style={{ marginBottom: 22 }}><H t="Experience" />
        {cv.experience.map(e => (
          <div key={e.id} style={{ marginBottom: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 11, color: '#778080', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div>
            <div style={{ fontSize: 12, color: A, fontWeight: 700, marginBottom: 6 }}>{e.company}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.75, color: '#444', marginBottom: 5 }}>{b}</li>)}</ul>
          </div>
        ))}
      </div>}
      {!!cv.education?.length && <div style={{ marginBottom: 22 }}><H t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666', fontStyle: 'italic' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 11, color: '#778080', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div>)}</div>}
      {!!cv.skills?.length && <div style={{ marginBottom: 22 }}><H t="Skills" /><div style={{ fontSize: 12, color: '#444', lineHeight: 2 }}>{cv.skills.join('   ·   ')}</div>{!!cv.languages?.length && <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}><strong>Languages —</strong> {cv.languages.join(', ')}</div>}</div>}
      <AcademicExtras cv={cv} H={H} />
      {cv.additionalInfo && <div><H t="Additional Information" /><p style={{ fontSize: 12, lineHeight: 1.75, color: '#444', margin: 0, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 6. PULSE — dark sidebar RIGHT, pill title, name top-left
// ════════════════════════════════════════════════════════════════
function Pulse({ cv, A }: { cv: GeneratedCV; A: string }) {
  const DARK = '#15131f'
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font={BODY_SANS} />
  const H = ({ t }: { t: string }) => <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: A, marginBottom: 12 }}>{t}</div>
  const SH = ({ t }: { t: string }) => <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: A, marginBottom: 13 }}>{t}</div>
  return (
    <div style={{ ...A4, fontFamily: BODY_SERIF, color: '#1a1a1a',
      // dark sidebar painted as page background (right 240px) → repeats full-height every page
      background: `linear-gradient(90deg, #fff 0, #fff 554px, ${DARK} 554px, ${DARK} 100%)`,
      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <div style={{ padding: '46px 46px 0' }}>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, color: DARK }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ display: 'inline-block', background: A, color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '5px 16px', borderRadius: 20, margin: '10px 0 16px' }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: 11.5, color: '#777', marginBottom: 8 }}>{contact(cv)}</div>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${A}, transparent)`, marginBottom: 26 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px' }}>
        <div style={{ padding: '0 30px 40px 46px' }}>
          {cv.summary && <div style={{ marginBottom: 24 }}><H t="Profile" /><p style={{ fontSize: 12.3, lineHeight: 1.8, color: '#444', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div>}
          {!!cv.experience?.length && <div><H t="Experience" />
            {cv.experience.map(e => (
              <div key={e.id} style={{ marginBottom: 17, paddingLeft: 16, borderLeft: `3px solid ${A}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>{e.role}</span><span style={{ fontSize: 10, color: '#999', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span></div>
                <div style={{ fontSize: 11.5, color: A, fontWeight: 700, margin: '2px 0 7px' }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: 15 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444', marginBottom: 4 }}>{b}</li>)}</ul>
              </div>
            ))}
          </div>}
          <AcademicExtras cv={cv} H={H} />
        </div>
        <div style={{ color: '#fff', padding: '34px 26px' }}>
          {!!cv.skills?.length && <div style={{ marginBottom: 26 }}><SH t="Skills" /><ul style={{ margin: 0, paddingLeft: 14 }}>{cv.skills.map((s, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)' }}>{s}</li>)}</ul></div>}
          {!!cv.education?.length && <div style={{ marginBottom: 26 }}><SH t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 9 }}><div style={{ fontSize: 11.8, fontWeight: 700, color: '#fff' }}>{e.qualification} {e.field}</div><div style={{ fontSize: 10.8, color: 'rgba(255,255,255,0.7)' }}>{e.institution}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{e.startYear}–{e.endYear}{e.grade ? ` · ${e.grade}` : ''}</div></div>)}</div>}
          {!!cv.languages?.length && <div style={{ marginBottom: 26 }}><SH t="Languages" /><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{cv.languages.map((l, i) => <span key={i} style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '3px 11px', borderRadius: 14 }}>{l}</span>)}</div></div>}
          {cv.additionalInfo && <div><SH t="Certifications" /><div style={{ fontSize: 10.8, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-line' }}>{cv.additionalInfo}</div></div>}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// CLASSIC — ATS-safe fallback
// ════════════════════════════════════════════════════════════════
function Classic({ cv, A }: { cv: GeneratedCV; A: string }) {
  if (isCL(cv)) return <CoverLetter cv={cv} A={A} font={BODY_SANS} />
  const H = ({ t }: { t: string }) => <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: A, borderBottom: `2px solid ${A}`, paddingBottom: 4, marginBottom: 10 }}>{t}</div>
  return (
    <div style={{ ...A4, fontFamily: BODY_SERIF, color: '#1a1a1a', padding: '44px 48px' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 13.5, color: '#555', marginBottom: 8 }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: 11, color: '#666' }}>{contact(cv)}</div>
      </div>
      {cv.summary && <div style={{ marginBottom: 18 }}><H t="Professional Summary" /><p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#333', margin: 0, textAlign: 'justify' }}>{cv.summary}</p></div>}
      {!!cv.experience?.length && <div style={{ marginBottom: 18 }}><H t="Professional Experience" />
        {cv.experience.map(e => (
          <div key={e.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{e.role}</div><div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</div></div>
            <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 6 }}>{e.company}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{e.bullets.map((b, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.7, color: '#333', marginBottom: 4 }}>{b}</li>)}</ul>
          </div>
        ))}
      </div>}
      {!!cv.education?.length && <div style={{ marginBottom: 18 }}><H t="Education" />{cv.education.map(e => <div key={e.id} style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.qualification} in {e.field}</div><div style={{ fontSize: 11.5, color: '#666' }}>{e.institution}{e.grade ? ` — ${e.grade}` : ''}</div></div><div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startYear} – {e.endYear}</div></div>)}</div>}
      {!!cv.skills?.length && <div style={{ marginBottom: 18 }}><H t="Core Skills" /><div style={{ fontSize: 12, color: '#333', lineHeight: 2 }}>{cv.skills.join('  •  ')}</div></div>}
      {!!cv.languages?.length && <div style={{ marginBottom: 18 }}><H t="Languages" /><div style={{ fontSize: 12, color: '#333' }}>{cv.languages.join('  •  ')}</div></div>}
      <AcademicExtras cv={cv} H={H} />
      {cv.additionalInfo && <div><H t="Additional Information" /><p style={{ fontSize: 12, lineHeight: 1.75, color: '#333', margin: 0, whiteSpace: 'pre-line' }}>{cv.additionalInfo}</p></div>}
    </div>
  )
}

function AcademicExtras({ cv, H }: { cv: GeneratedCV; H: any }) {
  const li = (items: string[]) => <ul style={{ margin: 0, paddingLeft: 18 }}>{items.map((x, i) => <li key={i} style={{ fontSize: 11.5, lineHeight: 1.7, color: '#444', marginBottom: 5 }}>{x}</li>)}</ul>
  return (
    <>
      {!!cv.publications?.length && <div style={{ marginBottom: 18 }}><H t="Publications" />{li(cv.publications)}</div>}
      {!!cv.research?.length && <div style={{ marginBottom: 18 }}><H t="Research" />{li(cv.research)}</div>}
      {!!cv.teaching?.length && <div style={{ marginBottom: 18 }}><H t="Teaching Experience" />{li(cv.teaching)}</div>}
    </>
  )
}

function CoverLetter({ cv, A, font }: { cv: GeneratedCV; A: string; font: string }) {
  return (
    <div style={{ ...A4, fontFamily: font, color: '#1a1a1a', padding: '52px 56px' }}>
      <div style={{ borderBottom: `2px solid ${A}`, paddingBottom: 18, marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: A, marginBottom: 4 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 8 }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: 11, color: '#666', fontFamily: BODY_SANS }}>{contact(cv)}</div>
      </div>
      {(cv.coverLetterBody || '').split('\n\n').map((p, i) => <p key={i} style={{ fontSize: 13, lineHeight: 1.9, color: '#222', marginBottom: 16, textAlign: 'justify' }}>{p}</p>)}
    </div>
  )
}
