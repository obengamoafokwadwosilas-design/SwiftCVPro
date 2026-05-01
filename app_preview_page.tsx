'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratedCV, TemplateId, ExportFormat } from '@/types'

const TEMPLATES: { id: TemplateId; name: string; tag: string; color: string }[] = [
  { id: 'classic',   name: 'Classic',   tag: 'Timeless · Recruiter-safe',  color: '#1a1a1a' },
  { id: 'modern',    name: 'Modern',    tag: 'Clean · Contemporary',       color: '#1a56c4' },
  { id: 'executive', name: 'Executive', tag: 'Senior · Boardroom',         color: '#0a1a3a' },
  { id: 'academic',  name: 'Academic',  tag: 'Scholarly · Structured',     color: '#4a4a4a' },
]

export default function PreviewPage() {
  const router = useRouter()
  const [cv, setCV] = useState<GeneratedCV | null>(null)
  const [phone, setPhone] = useState('')
  const [template, setTemplate] = useState<TemplateId>('classic')
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview')
  const [downloading, setDownloading] = useState<ExportFormat | null>(null)
  const [isCoverLetter, setIsCoverLetter] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('swiftcv_cv')
    const ph = sessionStorage.getItem('swiftcv_phone')
    if (!stored) { router.push('/build'); return }
    try {
      const parsed = JSON.parse(stored)
      setCV(parsed)
      setPhone(ph || '')
      const cvType = sessionStorage.getItem('swiftcv_type')
      if (cvType === 'cover_letter' || parsed.coverLetterBody) setIsCoverLetter(true)
      if (cvType === 'academic') setTemplate('academic')
    } catch { router.push('/build') }

    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [router])

  function updateCV(patch: Partial<GeneratedCV>) {
    if (!cv) return
    const updated = { ...cv, ...patch }
    setCV(updated)
    sessionStorage.setItem('swiftcv_cv', JSON.stringify(updated))
  }

  async function handleDownload(format: ExportFormat) {
    if (!cv) return
    setDownloading(format)
    try {
      const res = await fetch(`/api/export-${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, templateId: template })
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cv.fullName.replace(/\s+/g, '_')}_CV.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Download failed. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  function handleNewCV() {
    if (confirm('Start a new CV? Your current CV will be cleared.')) {
      sessionStorage.removeItem('swiftcv_cv')
      sessionStorage.removeItem('swiftcv_type')
      sessionStorage.removeItem('swiftcv_phone')
      router.push('/build')
    }
  }

  if (!cv) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(13,148,136,0.2)', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: '#0a0f1a', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, color: 'white' }}>Swift<span style={{ color: '#5eead4' }}>CV</span>Pro</div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '50px', padding: '3px', gap: '2px' }}>
          {(['preview', 'edit'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 18px', borderRadius: '50px', fontSize: '12px', fontWeight: activeTab === tab ? 600 : 400, background: activeTab === tab ? 'white' : 'none', color: activeTab === tab ? '#0a0f1a' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', textTransform: 'capitalize', fontFamily: "'DM Sans', sans-serif" }}>
              {tab}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleNewCV} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>+ New CV</button>
          <button onClick={() => handleDownload('docx')} disabled={!!downloading} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '50px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{downloading === 'docx' ? '...' : '↓ Word'}</button>
          <button onClick={() => handleDownload('pdf')} disabled={!!downloading} style={{ padding: '8px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '50px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(13,148,136,0.3)' }}>{downloading === 'pdf' ? '...' : '↓ PDF'}</button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: isCoverLetter ? '1fr' : '230px 1fr', minHeight: 'calc(100vh - 57px)' }} className="preview-layout">
        {!isCoverLetter && (
          <div className="preview-sidebar" style={{ background: 'white', borderRight: '1px solid #e2e8f0', padding: '20px', overflowY: 'auto' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '14px' }}>Choose Template</div>
            {TEMPLATES.map(tpl => (
              <div key={tpl.id} onClick={() => setTemplate(tpl.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', border: template === tpl.id ? '1.5px solid #0d9488' : '1.5px solid transparent', background: template === tpl.id ? '#f0fdf9' : 'none', cursor: 'pointer', marginBottom: '4px', transition: 'all 0.2s' }}>
                <div style={{ width: '32px', height: '40px', borderRadius: '6px', background: tpl.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a0f1a' }}>{tpl.name}</div>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>{tpl.tag}</div>
                </div>
                {template === tpl.id && <span style={{ color: '#0d9488', fontSize: '14px', fontWeight: 700 }}>✓</span>}
              </div>
            ))}
            <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '16px', marginTop: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#0a0f1a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tips</div>
              {['Click each template to compare', 'Switch tabs to edit content', 'Word + PDF both included', 'Closing this tab loses your CV'].map(tip => (
                <div key={tip} style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '7px', lineHeight: 1.5, fontWeight: 300 }}>· {tip}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '24px', overflowY: 'auto' }}>
          {activeTab === 'preview' ? (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', maxWidth: '760px', margin: '0 auto' }}>
              <CVPreview cv={cv} templateId={template} />
            </div>
          ) : (
            <CVEditor cv={cv} updateCV={updateCV} />
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .preview-layout { grid-template-columns: 1fr !important; }
          .preview-sidebar { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// PREVIEW RENDERS — Match the actual export typography
// ═══════════════════════════════════════════════════════
function CVPreview({ cv, templateId }: { cv: GeneratedCV; templateId: TemplateId }) {
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join('  •  ')
  const isLetter = !!cv.coverLetterBody

  // Common styles - mimic the print output
  const baseFont = templateId === 'modern' ? "'Calibri', sans-serif" : "Cambria, Georgia, serif"

  if (templateId === 'modern') {
    return (
      <div style={{ padding: '36px 40px', fontFamily: baseFont, fontSize: '11pt', lineHeight: 1.55, color: '#1a1a1a' }}>
        <div style={{ fontSize: '22pt', fontWeight: 700, color: '#0a0a0a', marginBottom: '4pt' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '12pt', color: '#1a56c4', marginBottom: '6pt' }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: '10pt', color: '#5a5a5a', marginBottom: '16pt' }}>{contact}</div>
        {isLetter ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ lineHeight: 1.6, marginBottom: '10pt' }}>{p}</p>) : (
          <>
            {cv.summary && <><SH color="#1a56c4" border>Profile</SH><p style={{ lineHeight: 1.6 }}>{cv.summary}</p></>}
            {cv.experience?.length > 0 && <><SH color="#1a56c4" border>Experience</SH>{cv.experience.map(e => (
              <div key={e.id} style={{ marginBottom: '10pt' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '12pt', color: '#0a0a0a' }}>{e.role}</div>
                  <div style={{ fontSize: '10pt', color: '#6a6a6a' }}>{e.startDate} – {e.endDate}</div>
                </div>
                <div style={{ fontStyle: 'italic', color: '#1a56c4', marginBottom: '4pt' }}>{e.company}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{e.bullets.map((b, i) => (
                  <li key={i} style={{ paddingLeft: '14pt', position: 'relative', marginBottom: '4pt', lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: '4pt', color: '#1a56c4', fontWeight: 700 }}>•</span>{b}
                  </li>
                ))}</ul>
              </div>
            ))}</>}
            {cv.education?.length > 0 && <><SH color="#1a56c4" border>Education</SH>{cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: '10pt' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '12pt', color: '#0a0a0a' }}>{ed.qualification} in {ed.field}</div>
                  <div style={{ fontSize: '10pt', color: '#6a6a6a' }}>{ed.startYear} – {ed.endYear}</div>
                </div>
                <div style={{ fontStyle: 'italic', color: '#1a56c4' }}>{ed.institution}{ed.grade && ` — ${ed.grade}`}</div>
              </div>
            ))}</>}
            {cv.skills?.length > 0 && <><SH color="#1a56c4" border>Skills</SH><div style={{ lineHeight: 1.7 }}>{cv.skills.join('  •  ')}</div></>}
            {cv.languages && cv.languages.length > 0 && <><SH color="#1a56c4" border>Languages</SH><div style={{ lineHeight: 1.7 }}>{cv.languages.join('  •  ')}</div></>}
            {cv.additionalInfo && <><SH color="#1a56c4" border>Additional Information</SH><div style={{ lineHeight: 1.7 }}>{cv.additionalInfo}</div></>}
          </>
        )}
      </div>
    )
  }

  if (templateId === 'executive') {
    return (
      <div style={{ padding: '36px 40px', fontFamily: 'Cambria, Georgia, serif', fontSize: '11pt', lineHeight: 1.55, color: '#1a1a1a' }}>
        <div style={{ fontSize: '22pt', fontWeight: 700, color: '#0a1a3a', textAlign: 'center', marginBottom: '4pt' }}>{cv.fullName}</div>
        <div style={{ width: '60pt', height: '2pt', background: '#a87b00', margin: '6pt auto 8pt' }} />
        {cv.jobTitle && <div style={{ fontSize: '12pt', fontStyle: 'italic', color: '#a87b00', textAlign: 'center', marginBottom: '6pt' }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: '10pt', color: '#4a4a4a', textAlign: 'center', marginBottom: '16pt' }}>{contact}</div>
        {isLetter ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ textAlign: 'justify', lineHeight: 1.6, marginBottom: '10pt' }}>{p}</p>) : (
          <>
            {cv.summary && <><SH color="#0a1a3a" gold>Executive Summary</SH><p style={{ textAlign: 'justify', lineHeight: 1.6 }}>{cv.summary}</p></>}
            {cv.experience?.length > 0 && <><SH color="#0a1a3a" gold>Professional Experience</SH>{cv.experience.map(e => (
              <div key={e.id} style={{ marginBottom: '10pt' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '12pt', color: '#0a1a3a' }}>{e.role}</div>
                  <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#6a6a6a' }}>{e.startDate} – {e.endDate}</div>
                </div>
                <div style={{ fontStyle: 'italic', color: '#a87b00', marginBottom: '4pt' }}>{e.company}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{e.bullets.map((b, i) => (
                  <li key={i} style={{ paddingLeft: '14pt', position: 'relative', marginBottom: '4pt', lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: '4pt', color: '#a87b00', fontWeight: 700 }}>•</span>{b}
                  </li>
                ))}</ul>
              </div>
            ))}</>}
            {cv.education?.length > 0 && <><SH color="#0a1a3a" gold>Education</SH>{cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: '10pt' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '12pt', color: '#0a1a3a' }}>{ed.qualification} in {ed.field}</div>
                  <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#6a6a6a' }}>{ed.startYear} – {ed.endYear}</div>
                </div>
                <div style={{ fontStyle: 'italic', color: '#a87b00' }}>{ed.institution}{ed.grade && ` — ${ed.grade}`}</div>
              </div>
            ))}</>}
            {cv.skills?.length > 0 && <><SH color="#0a1a3a" gold>Core Competencies</SH><div style={{ lineHeight: 1.7 }}>{cv.skills.join('  •  ')}</div></>}
            {cv.languages && cv.languages.length > 0 && <><SH color="#0a1a3a" gold>Languages</SH><div style={{ lineHeight: 1.7 }}>{cv.languages.join('  •  ')}</div></>}
            {cv.additionalInfo && <><SH color="#0a1a3a" gold>Additional Information</SH><div style={{ lineHeight: 1.7 }}>{cv.additionalInfo}</div></>}
          </>
        )}
      </div>
    )
  }

  if (templateId === 'academic') {
    return (
      <div style={{ padding: '36px 40px', fontFamily: 'Cambria, Georgia, serif', fontSize: '11pt', lineHeight: 1.55, color: '#1a1a1a' }}>
        <div style={{ fontSize: '22pt', fontWeight: 700, textAlign: 'center', color: '#0a0a0a', marginBottom: '4pt' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '12pt', fontStyle: 'italic', textAlign: 'center', color: '#4a4a4a', marginBottom: '6pt' }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: '10pt', textAlign: 'center', color: '#5a5a5a', marginBottom: '16pt' }}>{contact}</div>
        {cv.summary && <><SH academic>Research Profile</SH><p style={{ textAlign: 'justify', lineHeight: 1.6 }}>{cv.summary}</p></>}
        {cv.education?.length > 0 && <><SH academic>Education</SH>{cv.education.map(ed => (
          <div key={ed.id} style={{ marginBottom: '10pt' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2pt' }}>
              <div style={{ fontWeight: 700, fontSize: '12pt' }}>{ed.qualification} in {ed.field}</div>
              <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#6a6a6a' }}>{ed.startYear} – {ed.endYear}</div>
            </div>
            <div style={{ fontStyle: 'italic', color: '#4a4a4a' }}>{ed.institution}{ed.grade && ` — ${ed.grade}`}</div>
          </div>
        ))}</>}
        {cv.experience?.length > 0 && <><SH academic>Academic & Professional Experience</SH>{cv.experience.map(e => (
          <div key={e.id} style={{ marginBottom: '10pt' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2pt' }}>
              <div style={{ fontWeight: 700, fontSize: '12pt' }}>{e.role}</div>
              <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#6a6a6a' }}>{e.startDate} – {e.endDate}</div>
            </div>
            <div style={{ fontStyle: 'italic', color: '#4a4a4a', marginBottom: '4pt' }}>{e.company}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{e.bullets.map((b, i) => (
              <li key={i} style={{ paddingLeft: '14pt', position: 'relative', marginBottom: '4pt', lineHeight: 1.5 }}>
                <span style={{ position: 'absolute', left: '4pt' }}>•</span>{b}
              </li>
            ))}</ul>
          </div>
        ))}</>}
        {cv.publications && cv.publications.length > 0 && <><SH academic>Publications</SH><ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{cv.publications.map((p, i) => (
          <li key={i} style={{ paddingLeft: '14pt', position: 'relative', marginBottom: '4pt', lineHeight: 1.5 }}><span style={{ position: 'absolute', left: '4pt' }}>•</span>{p}</li>
        ))}</ul></>}
        {cv.skills?.length > 0 && <><SH academic>Research Methods & Skills</SH><div style={{ lineHeight: 1.7 }}>{cv.skills.join('  •  ')}</div></>}
        {cv.languages && cv.languages.length > 0 && <><SH academic>Languages</SH><div style={{ lineHeight: 1.7 }}>{cv.languages.join('  •  ')}</div></>}
        {cv.additionalInfo && <><SH academic>Memberships, Honours & Awards</SH><div style={{ lineHeight: 1.7 }}>{cv.additionalInfo}</div></>}
      </div>
    )
  }

  // CLASSIC (default)
  return (
    <div style={{ padding: '36px 40px', fontFamily: 'Cambria, Georgia, serif', fontSize: '11pt', lineHeight: 1.55, color: '#1a1a1a' }}>
      <div style={{ fontSize: '22pt', fontWeight: 700, textAlign: 'center', color: '#0a0a0a', marginBottom: '4pt' }}>{cv.fullName}</div>
      {cv.jobTitle && <div style={{ fontSize: '12pt', fontStyle: 'italic', textAlign: 'center', color: '#4a4a4a', marginBottom: '6pt' }}>{cv.jobTitle}</div>}
      <div style={{ fontSize: '10pt', textAlign: 'center', color: '#5a5a5a', marginBottom: '16pt' }}>{contact}</div>
      {isLetter ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ textAlign: 'justify', lineHeight: 1.6, marginBottom: '10pt' }}>{p}</p>) : (
        <>
          {cv.summary && <><SH>Professional Summary</SH><p style={{ textAlign: 'justify', lineHeight: 1.6 }}>{cv.summary}</p></>}
          {cv.experience?.length > 0 && <><SH>Professional Experience</SH>{cv.experience.map(e => (
            <div key={e.id} style={{ marginBottom: '10pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2pt' }}>
                <div style={{ fontWeight: 700, fontSize: '12pt' }}>{e.role}</div>
                <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#6a6a6a' }}>{e.startDate} – {e.endDate}</div>
              </div>
              <div style={{ fontStyle: 'italic', color: '#4a4a4a', marginBottom: '4pt' }}>{e.company}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{e.bullets.map((b, i) => (
                <li key={i} style={{ paddingLeft: '14pt', position: 'relative', marginBottom: '4pt', lineHeight: 1.5 }}>
                  <span style={{ position: 'absolute', left: '4pt' }}>•</span>{b}
                </li>
              ))}</ul>
            </div>
          ))}</>}
          {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: '10pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2pt' }}>
                <div style={{ fontWeight: 700, fontSize: '12pt' }}>{ed.qualification} in {ed.field}</div>
                <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#6a6a6a' }}>{ed.startYear} – {ed.endYear}</div>
              </div>
              <div style={{ fontStyle: 'italic', color: '#4a4a4a' }}>{ed.institution}{ed.grade && ` — ${ed.grade}`}</div>
            </div>
          ))}</>}
          {cv.skills?.length > 0 && <><SH>Core Skills</SH><div style={{ lineHeight: 1.7 }}>{cv.skills.join('  •  ')}</div></>}
          {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ lineHeight: 1.7 }}>{cv.languages.join('  •  ')}</div></>}
          {cv.additionalInfo && <><SH>Additional Information</SH><div style={{ lineHeight: 1.7 }}>{cv.additionalInfo}</div></>}
        </>
      )}
    </div>
  )
}

function SH({ children, color = '#1a1a1a', border = false, gold = false, academic = false }: { children: string; color?: string; border?: boolean; gold?: boolean; academic?: boolean }) {
  let borderStyle = '1pt solid #1a1a1a'
  if (border) borderStyle = `2pt solid ${color}`
  if (gold) borderStyle = '1.5pt solid #a87b00'
  return (
    <div style={{
      fontFamily: academic ? 'Cambria, Georgia, serif' : (color === '#1a56c4' || gold ? "Calibri, sans-serif" : "Calibri, sans-serif"),
      fontSize: '11pt', fontWeight: 700,
      textTransform: academic ? undefined : 'uppercase' as const,
      fontVariant: academic ? 'small-caps' : undefined,
      letterSpacing: gold ? '3pt' : (border ? '2pt' : '1.5pt'),
      color, borderBottom: borderStyle,
      paddingBottom: '2pt', marginTop: '14pt', marginBottom: '7pt'
    }}>{children}</div>
  )
}

// ═══════════════════════════════════════════════════════
// EDITOR — Simple inline editor
// ═══════════════════════════════════════════════════════
function CVEditor({ cv, updateCV }: { cv: GeneratedCV; updateCV: (patch: Partial<GeneratedCV>) => void }) {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Section title="Personal Details">
        <Grid>
          <Input label="Full Name" value={cv.fullName} onChange={v => updateCV({ fullName: v })} />
          <Input label="Job Title" value={cv.jobTitle} onChange={v => updateCV({ jobTitle: v })} />
          <Input label="Email" value={cv.email} onChange={v => updateCV({ email: v })} />
          <Input label="Phone" value={cv.phone} onChange={v => updateCV({ phone: v })} />
          <Input label="Location" value={cv.location} onChange={v => updateCV({ location: v })} />
          <Input label="LinkedIn" value={cv.linkedin || ''} onChange={v => updateCV({ linkedin: v })} />
        </Grid>
      </Section>

      {cv.summary !== undefined && (
        <Section title={cv.coverLetterBody ? 'Cover Letter' : 'Professional Summary'}>
          <Textarea
            value={cv.coverLetterBody || cv.summary}
            onChange={v => cv.coverLetterBody ? updateCV({ coverLetterBody: v }) : updateCV({ summary: v })}
            rows={cv.coverLetterBody ? 12 : 5}
          />
        </Section>
      )}

      {cv.experience?.length > 0 && (
        <Section title="Experience">
          {cv.experience.map((exp, idx) => (
            <div key={exp.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', marginBottom: '10px' }}>
              <Grid>
                <Input label="Role" value={exp.role} onChange={v => {
                  const newExp = [...cv.experience]; newExp[idx] = { ...exp, role: v }; updateCV({ experience: newExp })
                }} />
                <Input label="Company" value={exp.company} onChange={v => {
                  const newExp = [...cv.experience]; newExp[idx] = { ...exp, company: v }; updateCV({ experience: newExp })
                }} />
                <Input label="Start Date" value={exp.startDate} onChange={v => {
                  const newExp = [...cv.experience]; newExp[idx] = { ...exp, startDate: v }; updateCV({ experience: newExp })
                }} />
                <Input label="End Date" value={exp.endDate} onChange={v => {
                  const newExp = [...cv.experience]; newExp[idx] = { ...exp, endDate: v }; updateCV({ experience: newExp })
                }} />
              </Grid>
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginBottom: '4px', display: 'block' }}>Bullets (one per line)</label>
                <Textarea
                  value={exp.bullets.join('\n')}
                  onChange={v => {
                    const newExp = [...cv.experience]
                    newExp[idx] = { ...exp, bullets: v.split('\n').filter(Boolean) }
                    updateCV({ experience: newExp })
                  }}
                  rows={5}
                />
              </div>
            </div>
          ))}
        </Section>
      )}

      {cv.education?.length > 0 && (
        <Section title="Education">
          {cv.education.map((ed, idx) => (
            <div key={ed.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', marginBottom: '10px' }}>
              <Grid>
                <Input label="Qualification" value={ed.qualification} onChange={v => {
                  const ne = [...cv.education]; ne[idx] = { ...ed, qualification: v }; updateCV({ education: ne })
                }} />
                <Input label="Field" value={ed.field} onChange={v => {
                  const ne = [...cv.education]; ne[idx] = { ...ed, field: v }; updateCV({ education: ne })
                }} />
                <Input label="Institution" value={ed.institution} onChange={v => {
                  const ne = [...cv.education]; ne[idx] = { ...ed, institution: v }; updateCV({ education: ne })
                }} />
                <Input label="Grade" value={ed.grade || ''} onChange={v => {
                  const ne = [...cv.education]; ne[idx] = { ...ed, grade: v }; updateCV({ education: ne })
                }} />
                <Input label="Start Year" value={ed.startYear} onChange={v => {
                  const ne = [...cv.education]; ne[idx] = { ...ed, startYear: v }; updateCV({ education: ne })
                }} />
                <Input label="End Year" value={ed.endYear} onChange={v => {
                  const ne = [...cv.education]; ne[idx] = { ...ed, endYear: v }; updateCV({ education: ne })
                }} />
              </Grid>
            </div>
          ))}
        </Section>
      )}

      {cv.skills?.length > 0 && (
        <Section title="Skills">
          <Textarea
            value={cv.skills.join(', ')}
            onChange={v => updateCV({ skills: v.split(',').map(s => s.trim()).filter(Boolean) })}
            rows={3}
          />
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#0d9488', marginBottom: '12px' }}>{title}</div>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>{children}</div>
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }} />
    </div>
  )
}

function Textarea({ value, onChange, rows = 4 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', lineHeight: 1.5 }} />
  )
}
