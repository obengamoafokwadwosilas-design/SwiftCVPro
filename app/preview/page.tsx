'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { GeneratedCV, TemplateId, ExportFormat } from '@/types'

const TEMPLATES: { id: TemplateId; name: string; tag: string; color: string; premium?: boolean }[] = [
  { id: 'editorial',   name: 'Editorial',   tag: 'Magazine · Premium',     color: '#9a5f2e', premium: true },
  { id: 'executive',   name: 'Executive',   tag: 'Boardroom · Premium',    color: '#0a1a3a', premium: true },
  { id: 'bold-header', name: 'Bold Header', tag: 'Clean & Impactful',      color: '#1a56c4' },
  { id: 'classic',     name: 'Classic',     tag: 'Timeless & Safe',        color: '#475569' },
  { id: 'minimal',     name: 'Minimal',     tag: 'Sharp & Understated',    color: '#111827' },
  { id: 'accent',      name: 'Accent',      tag: 'Warm & Distinctive',     color: '#b45309' },
  { id: 'academic',    name: 'Academic',    tag: 'Scholarly & Structured', color: '#6b21a8' },
  { id: 'clean',       name: 'Clean',       tag: 'Professional & Simple',  color: '#374151' },
]

export default function PreviewPage() {
  const router = useRouter()
  const [cv, setCV] = useState<GeneratedCV | null>(null)
  const [phone, setPhone] = useState('')
  const [template, setTemplate] = useState<TemplateId>('bold-header')
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview')
  const [downloading, setDownloading] = useState<ExportFormat | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [regenInstruction, setRegenInstruction] = useState('')
  const [showRegenFor, setShowRegenFor] = useState<string | null>(null)
  const [isCoverLetter, setIsCoverLetter] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('swiftcv_cv')
    const ph = sessionStorage.getItem('swiftcv_phone')
    if (!stored) { router.push('/build'); return }
    try {
      const parsed = JSON.parse(stored)
      setCV(parsed)
      setPhone(ph || '')
      // Check if it's a cover letter
      const cvType = sessionStorage.getItem('swiftcv_type')
      if (cvType === 'cover_letter' || parsed.coverLetterBody) {
        setIsCoverLetter(true)
      }
      // Auto-select Academic template for academic CVs
      if (cvType === 'academic') setTemplate('academic')
    } catch { router.push('/build') }
  }, [router])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Your CV will be lost if you leave. Download it first!'
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  function updateCV(updates: Partial<GeneratedCV>) {
    setCV(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      sessionStorage.setItem('swiftcv_cv', JSON.stringify(updated))
      return updated
    })
  }

  async function handleRegenerate(section: string, content: string | string[]) {
    setRegenerating(section)
    setShowRegenFor(null)
    try {
      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          currentContent: content,
          userInstruction: regenInstruction,
          cvContext: { fullName: cv!.fullName, jobTitle: cv!.jobTitle, cvType: 'professional' }
        })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      if (section === 'summary') updateCV({ summary: data.content })
      else if (section === 'skills') updateCV({ skills: data.content })
      else if (section === 'additionalInfo') updateCV({ additionalInfo: data.content })
      else if (section.startsWith('experience_')) {
        const id = section.replace('experience_', '')
        updateCV({ experience: cv!.experience.map(e => e.id === id ? { ...e, bullets: data.content } : e) })
      }
    } catch (err) {
      console.error('Regenerate failed:', err)
    } finally {
      setRegenerating(null)
      setRegenInstruction('')
    }
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
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const ext = format === 'docx' ? 'docx' : 'pdf'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cv.fullName.replace(/\s+/g, '_')}_CV.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(null)
    }
  }

  if (!cv) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(13,148,136,0.2)', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  function handleCreateAnother() {
    if (confirm('Start a new CV? Your current CV will be cleared.')) {
      sessionStorage.removeItem('swiftcv_cv')
      sessionStorage.removeItem('swiftcv_type')
      sessionStorage.removeItem('swiftcv_phone')
      router.push('/build')
    }
  }

  const navRight = (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <button 
        onClick={handleCreateAnother} 
        style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
      >
        + New CV
      </button>
      <button onClick={() => handleDownload('docx')} disabled={!!downloading} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '50px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {downloading === 'docx' ? '...' : '↓'} Word
      </button>
      <button onClick={() => handleDownload('pdf')} disabled={!!downloading} style={{ padding: '8px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '50px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(13,148,136,0.3)' }}>
        {downloading === 'pdf' ? '...' : '↓'} PDF
      </button>
    </div>
  )

  // Mobile template selector (horizontal scroll)
  const mobileTemplateSelector = (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '12px 16px', background: 'white', borderBottom: '1px solid #e2e8f0', WebkitOverflowScrolling: 'touch' }}>
      {TEMPLATES.map(tpl => (
        <button
          key={tpl.id}
          onClick={() => setTemplate(tpl.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
            borderRadius: '50px', border: template === tpl.id ? '2px solid #0d9488' : '1px solid #e2e8f0',
            background: template === tpl.id ? '#f0fdf9' : 'white', cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0, fontFamily: "'DM Sans', sans-serif"
          }}
        >
          <div style={{ width: '16px', height: '20px', borderRadius: '4px', background: tpl.color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: template === tpl.id ? 600 : 400, color: template === tpl.id ? '#0d9488' : '#64748b' }}>{tpl.name}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Custom nav with tabs */}
      <nav style={{ background: '#0a0f1a', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 600, color: 'white' }}>Swift<span style={{ color: '#5eead4' }}>CV</span>Pro</div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.28)', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'none' }}>Expertly Crafted</div>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '50px', padding: '3px', gap: '2px' }}>
          {(['preview', 'edit'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: activeTab === tab ? 600 : 400, background: activeTab === tab ? 'white' : 'none', color: activeTab === tab ? '#0a0f1a' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', textTransform: 'capitalize', fontFamily: "'DM Sans', sans-serif" }}>
              {tab}
            </button>
          ))}
        </div>

        {navRight}
      </nav>

      {/* Mobile template selector - shows on small screens, hidden for cover letters */}
      {!isCoverLetter && (
        <div className="mobile-template-bar" style={{ display: 'none' }}>
          {mobileTemplateSelector}
        </div>
      )}

      <div className="preview-layout" style={{ display: 'grid', gridTemplateColumns: isCoverLetter ? '1fr' : '230px 1fr', minHeight: 'calc(100vh - 57px)' }}>
        {/* Sidebar - hidden on mobile and for cover letters */}
        {!isCoverLetter && (
        <div className="preview-sidebar" style={{ background: 'white', borderRight: '1px solid #e2e8f0', padding: '20px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '14px' }}>Choose Template</div>
          {TEMPLATES.map(tpl => (
            <div key={tpl.id} onClick={() => setTemplate(tpl.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: template === tpl.id ? '1.5px solid #0d9488' : '1.5px solid transparent', background: template === tpl.id ? '#f0fdf9' : 'none', cursor: 'pointer', marginBottom: '4px', transition: 'all 0.2s', position: 'relative' }}>
              <div style={{ width: '28px', height: '36px', borderRadius: '6px', background: tpl.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0a0f1a' }}>{tpl.name}</div>
                  {tpl.premium && <span style={{ fontSize: '8px', fontWeight: 600, background: 'linear-gradient(135deg, #c9a05a, #e5c98f)', color: '#1f1f1f', padding: '1px 6px', borderRadius: '10px', letterSpacing: '0.5px' }}>✨ PREMIUM</span>}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{tpl.tag}</div>
              </div>
              {template === tpl.id && <span style={{ color: '#0d9488', fontSize: '12px', fontWeight: 700 }}>✓</span>}
            </div>
          ))}

          <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '16px', marginTop: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#0a0f1a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tips</div>
            {['Switch templates to preview styles', 'Click Edit tab to change any section', 'Hit Regenerate to let AI rewrite a section', 'Download as many times as you need', 'Closing this tab will lose your CV'].map(tip => (
              <div key={tip} style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '7px', lineHeight: 1.5, fontWeight: 300 }}>· {tip}</div>
            ))}
          </div>
        </div>
        )}

        {/* Main */}
        <div style={{ background: '#f8fafc', padding: '24px', overflowY: 'auto' }}>
          {/* PREVIEW TAB */}
          {activeTab === 'preview' && (
            <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
              <CVRender cv={cv} templateId={template} />
            </div>
          )}

          {/* EDIT TAB */}
          {activeTab === 'edit' && (
            <div>
              <EditCard title="Professional Summary">
                <textarea
                  value={cv.summary}
                  onChange={e => updateCV({ summary: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', resize: 'none', outline: 'none', lineHeight: 1.65, color: '#0a0f1a' }}
                />
                <RegenBtn section="summary" content={cv.summary} onRegen={handleRegenerate} regenerating={regenerating} showFor={showRegenFor} setShowFor={setShowRegenFor} instruction={regenInstruction} setInstruction={setRegenInstruction} />
              </EditCard>

              {cv.experience?.map((exp, i) => (
                <EditCard key={exp.id} title={`Experience ${i + 1}`}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    {[
                      { label: 'Job Title', key: 'role' as const },
                      { label: 'Company', key: 'company' as const },
                      { label: 'Start Date', key: 'startDate' as const },
                      { label: 'End Date', key: 'endDate' as const },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{label}</label>
                        <input
                          value={exp[key]}
                          onChange={e => updateCV({ experience: cv.experience.map(ex => ex.id === exp.id ? { ...ex, [key]: e.target.value } : ex) })}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', outline: 'none', color: '#0a0f1a' }}
                        />
                      </div>
                    ))}
                  </div>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Bullet Points</label>
                  {exp.bullets.map((bullet, bi) => (
                    <div key={bi} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <textarea
                        value={bullet}
                        onChange={e => updateCV({ experience: cv.experience.map(ex => ex.id === exp.id ? { ...ex, bullets: ex.bullets.map((b, idx) => idx === bi ? e.target.value : b) } : ex) })}
                        rows={2}
                        style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', resize: 'none', outline: 'none', lineHeight: 1.6, color: '#0a0f1a' }}
                      />
                      <button onClick={() => updateCV({ experience: cv.experience.map(ex => ex.id === exp.id ? { ...ex, bullets: ex.bullets.filter((_, idx) => idx !== bi) } : ex) })} style={{ color: '#fca5a5', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', alignSelf: 'flex-start', paddingTop: '8px' }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => updateCV({ experience: cv.experience.map(ex => ex.id === exp.id ? { ...ex, bullets: [...ex.bullets, ''] } : ex) })} style={{ fontSize: '12px', color: '#0d9488', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>+ Add bullet</button>
                  <RegenBtn section={`experience_${exp.id}`} content={exp.bullets} onRegen={handleRegenerate} regenerating={regenerating} showFor={showRegenFor} setShowFor={setShowRegenFor} instruction={regenInstruction} setInstruction={setRegenInstruction} />
                </EditCard>
              ))}

              {cv.education?.map((edu, i) => (
                <EditCard key={edu.id} title={`Education ${i + 1}`}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Qualification', key: 'qualification' as const },
                      { label: 'Field', key: 'field' as const },
                      { label: 'Institution', key: 'institution' as const },
                      { label: 'Grade', key: 'grade' as const },
                      { label: 'Start Year', key: 'startYear' as const },
                      { label: 'End Year', key: 'endYear' as const },
                    ].map(({ label, key }) => (
                      <div key={key} style={key === 'institution' ? { gridColumn: '1 / -1' } : {}}>
                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{label}</label>
                        <input
                          value={edu[key] || ''}
                          onChange={e => updateCV({ education: cv.education.map(ed => ed.id === edu.id ? { ...ed, [key]: e.target.value } : ed) })}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', outline: 'none', color: '#0a0f1a' }}
                        />
                      </div>
                    ))}
                  </div>
                </EditCard>
              ))}

              <EditCard title="Skills">
                <input
                  value={Array.isArray(cv.skills) ? cv.skills.join(', ') : cv.skills}
                  onChange={e => updateCV({ skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', outline: 'none', color: '#0a0f1a' }}
                />
                <RegenBtn section="skills" content={Array.isArray(cv.skills) ? cv.skills.join(', ') : cv.skills} onRegen={handleRegenerate} regenerating={regenerating} showFor={showRegenFor} setShowFor={setShowRegenFor} instruction={regenInstruction} setInstruction={setRegenInstruction} />
              </EditCard>

              {cv.languages && (
                <EditCard title="Languages">
                  <input
                    value={cv.languages!.join(', ')}
                    onChange={e => updateCV({ languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', outline: 'none', color: '#0a0f1a' }}
                  />
                </EditCard>
              )}

              {cv.additionalInfo && (
                <EditCard title="Additional Information">
                  <textarea
                    value={cv.additionalInfo}
                    onChange={e => updateCV({ additionalInfo: e.target.value })}
                    rows={3}
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', resize: 'none', outline: 'none', lineHeight: 1.65, color: '#0a0f1a' }}
                  />
                  <RegenBtn section="additionalInfo" content={cv.additionalInfo} onRegen={handleRegenerate} regenerating={regenerating} showFor={showRegenFor} setShowFor={setShowRegenFor} instruction={regenInstruction} setInstruction={setRegenInstruction} />
                </EditCard>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Edit Card ────────────────────────────────────────
function EditCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '2px', color: '#94a3b8', marginBottom: '14px' }}>{title}</div>
      {children}
    </div>
  )
}

// ── Regen Button ─────────────────────────────────────
function RegenBtn({ section, content, onRegen, regenerating, showFor, setShowFor, instruction, setInstruction }: {
  section: string; content: string | string[]
  onRegen: (s: string, c: string | string[]) => void
  regenerating: string | null; showFor: string | null
  setShowFor: (s: string | null) => void
  instruction: string; setInstruction: (s: string) => void
}) {
  const isThis = regenerating === section
  const show = showFor === section

  if (show) {
    return (
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <input
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onRegen(section, content) } if (e.key === 'Escape') setShowFor(null) }}
          placeholder="Instruction (optional) — or just press Enter"
          autoFocus
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid rgba(13,148,136,0.3)', borderRadius: '8px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
        />
        <button onClick={() => onRegen(section, content)} style={{ padding: '8px 14px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Go</button>
        <button onClick={() => setShowFor(null)} style={{ padding: '8px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✕</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setShowFor(section); setInstruction('') }}
      disabled={!!regenerating}
      style={{ fontSize: '12px', color: isThis ? '#94a3b8' : '#0d9488', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', opacity: regenerating && !isThis ? 0.4 : 1 }}
    >
      {isThis ? '↻ Regenerating...' : '↻ Regenerate this section'}
    </button>
  )
}

// ── CV Render ────────────────────────────────────────
function CVRender({ cv, templateId }: { cv: GeneratedCV; templateId: TemplateId }) {
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(' · ')

  const sharedBody = (accentColor = '#1a56c4') => (
    <>
      {cv.summary && (
        <div style={{ marginBottom: '18px' }}>
          <SH color={accentColor}>Professional Summary</SH>
          <p style={{ fontSize: '10.5px', color: '#4b5563', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginTop: '6px' }}>{cv.summary}</p>
        </div>
      )}
      {cv.coverLetterBody && (
        <div style={{ marginBottom: '18px' }}>
          {cv.coverLetterBody.split('\n\n').map((para, i) => <p key={i} style={{ fontSize: '10.5px', color: '#4b5563', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}>{para}</p>)}
        </div>
      )}
      {cv.experience?.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <SH color={accentColor}>Work Experience</SH>
          {cv.experience.map(exp => (
            <div key={exp.id} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827', fontFamily: "'DM Sans', sans-serif" }}>{exp.role}</span>
                <span style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif" }}>{exp.startDate} – {exp.endDate}</span>
              </div>
              <div style={{ fontSize: '11px', color: accentColor, fontWeight: 600, marginBottom: '5px', fontFamily: "'DM Sans', sans-serif" }}>{exp.company}</div>
              {exp.bullets.map((b, i) => (
                <div key={i} style={{ fontSize: '10.5px', color: '#4b5563', paddingLeft: '13px', position: 'relative', marginBottom: '3px', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                  <span style={{ position: 'absolute', left: 0, color: accentColor, fontSize: '7px', top: '3px' }}>▪</span>{b}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {cv.education?.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <SH color={accentColor}>Education</SH>
          {cv.education.map(edu => (
            <div key={edu.id} style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', fontFamily: "'DM Sans', sans-serif" }}>{edu.qualification} in {edu.field}</div>
              <div style={{ fontSize: '10.5px', color: '#4b5563', fontFamily: "'DM Sans', sans-serif" }}>{edu.institution} · {edu.startYear}–{edu.endYear}{edu.grade ? ` · ${edu.grade}` : ''}</div>
            </div>
          ))}
        </div>
      )}
      {cv.skills?.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <SH color={accentColor}>Skills</SH>
          <p style={{ fontSize: '10.5px', color: '#4b5563', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{Array.isArray(cv.skills) ? cv.skills.join(' · ') : cv.skills}</p>
        </div>
      )}
      {cv.languages && cv.languages.length > 0 && (
        <div>
          <SH color={accentColor}>Languages</SH>
          <p style={{ fontSize: '10.5px', color: '#4b5563', fontFamily: "'DM Sans', sans-serif" }}>{cv.languages!.join(' · ')}</p>
        </div>
      )}
    </>
  )

  if (templateId === 'bold-header') return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#1a56c4', padding: '26px 32px 20px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>{cv.fullName}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>{cv.jobTitle}</div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>{contact}</div>
      </div>
      <div style={{ padding: '22px 32px' }}>{sharedBody('#1a56c4')}</div>
    </div>
  )

  if (templateId === 'classic') return (
    <div style={{ padding: '36px 40px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 700, color: '#111827' }}>{cv.fullName.toUpperCase()}</div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{cv.jobTitle}</div>
        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{contact}</div>
      </div>
      <div style={{ height: '1px', background: '#e5e7eb', marginBottom: '16px' }} />
      {sharedBody('#475569')}
    </div>
  )

  if (templateId === 'minimal') return (
    <div style={{ padding: '36px 40px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #111827', paddingBottom: '10px', marginBottom: '14px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#111' }}>{cv.fullName}</div>
        <div style={{ textAlign: 'right' }}>
          {[cv.email, cv.phone, cv.location].map((v, i) => <div key={i} style={{ fontSize: '9px', color: '#9ca3af' }}>{v}</div>)}
        </div>
      </div>
      {sharedBody('#111827')}
    </div>
  )

  if (templateId === 'accent') return (
    <div style={{ display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: '6px', background: '#b45309', flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '28px 28px' }}>
        <div style={{ borderBottom: '1px solid #e7e5e4', paddingBottom: '14px', marginBottom: '14px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#1c1917' }}>{cv.fullName}</div>
          <div style={{ fontSize: '11px', color: '#78716c', marginTop: '3px' }}>{cv.jobTitle}</div>
          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>{contact}</div>
        </div>
        {sharedBody('#b45309')}
      </div>
    </div>
  )

  if (templateId === 'clean') return (
    <div style={{ padding: '32px 36px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: '22px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#111', marginBottom: '4px' }}>{cv.fullName}</div>
      <div style={{ fontSize: '10px', color: '#444', marginBottom: '18px' }}>{contact}</div>
      {cv.summary && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#111', borderBottom: '1.5px solid #111', paddingBottom: '3px', marginBottom: '8px' }}>Professional Summary</div>
          <p style={{ fontSize: '10.5px', color: '#333', lineHeight: 1.7 }}>{cv.summary}</p>
        </div>
      )}
      {cv.experience?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#111', borderBottom: '1.5px solid #111', paddingBottom: '3px', marginBottom: '8px' }}>Professional Experience</div>
          {cv.experience.map(exp => (
            <div key={exp.id} style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{exp.role}</div>
              <div style={{ fontSize: '10px', color: '#444', marginBottom: '4px' }}>{exp.company} <span style={{ color: '#777' }}>| {exp.startDate} – {exp.endDate}</span></div>
              {exp.bullets.map((b, i) => (
                <div key={i} style={{ fontSize: '10.5px', color: '#333', paddingLeft: '12px', position: 'relative', marginBottom: '2px', lineHeight: 1.55 }}>
                  <span style={{ position: 'absolute', left: '2px' }}>•</span>{b}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {cv.education?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#111', borderBottom: '1.5px solid #111', paddingBottom: '3px', marginBottom: '8px' }}>Education</div>
          {cv.education.map(edu => (
            <div key={edu.id} style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{edu.qualification} in {edu.field}</div>
              <div style={{ fontSize: '10px', color: '#444' }}>{edu.institution} <span style={{ color: '#777' }}>| {edu.startYear}–{edu.endYear}{edu.grade ? ` | ${edu.grade}` : ''}</span></div>
            </div>
          ))}
        </div>
      )}
      {cv.skills?.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#111', borderBottom: '1.5px solid #111', paddingBottom: '3px', marginBottom: '8px' }}>Skills & Competencies</div>
          <p style={{ fontSize: '10.5px', color: '#333', lineHeight: 1.7 }}>{Array.isArray(cv.skills) ? cv.skills.join(' · ') : cv.skills}</p>
        </div>
      )}
      {cv.languages && cv.languages.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#111', borderBottom: '1.5px solid #111', paddingBottom: '3px', marginBottom: '8px' }}>Languages</div>
          <p style={{ fontSize: '10.5px', color: '#333' }}>{cv.languages!.join(' · ')}</p>
        </div>
      )}
    </div>
  )

  // EDITORIAL — Magazine-style, warm cream palette
  if (templateId === 'editorial') {
    const EdLabel = ({ children }: { children: string }) => (
      <div style={{ fontSize: '9px', color: '#9a5f2e', letterSpacing: '2.5px', fontWeight: 500, paddingTop: '4px', fontFamily: "'DM Sans', sans-serif" }}>{children}</div>
    )
    const EdRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '18px', marginBottom: '20px' }}>
        <EdLabel>{label}</EdLabel>
        <div>{children}</div>
      </div>
    )
    return (
      <div style={{ padding: '40px 44px', background: '#fefdfb', fontFamily: "'DM Sans', sans-serif", color: '#3a3a3a' }}>
        <div style={{ fontSize: '9px', color: '#9a5f2e', letterSpacing: '4px', fontWeight: 500, marginBottom: '8px' }}>CURRICULUM VITAE</div>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '32px', fontWeight: 500, color: '#1a1a1a', lineHeight: 1, letterSpacing: '-0.3px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '13px', color: '#6b5742', fontStyle: 'italic', marginTop: '6px' }}>{cv.jobTitle}</div>}
        <div style={{ fontSize: '10px', color: '#9a9588', marginTop: '14px', letterSpacing: '0.3px' }}>{contact}</div>
        <div style={{ height: '0.5px', background: '#d9cfbf', margin: '20px 0' }} />

        {cv.summary && (
          <EdRow label="SUMMARY">
            <div style={{ fontSize: '11px', color: '#3a3a3a', lineHeight: 1.7 }}>{cv.summary}</div>
          </EdRow>
        )}

        {cv.coverLetterBody && (
          <EdRow label="LETTER">
            <div>{cv.coverLetterBody.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '11px', color: '#3a3a3a', lineHeight: 1.7, marginBottom: '10px' }}>{p}</p>)}</div>
          </EdRow>
        )}

        {cv.experience?.length > 0 && (
          <EdRow label="EXPERIENCE">
            {cv.experience.map(exp => (
              <div key={exp.id} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>{exp.role}</div>
                  <div style={{ fontSize: '10px', color: '#9a9588', fontStyle: 'italic' }}>{exp.startDate} — {exp.endDate}</div>
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '11.5px', color: '#6b5742', fontStyle: 'italic', marginBottom: '6px' }}>{exp.company}</div>
                {exp.bullets.map((b, i) => (
                  <div key={i} style={{ fontSize: '10.5px', color: '#3a3a3a', paddingLeft: '14px', position: 'relative', marginBottom: '3px', lineHeight: 1.65 }}>
                    <span style={{ position: 'absolute', left: 0, color: '#9a5f2e' }}>—</span>{b}
                  </div>
                ))}
              </div>
            ))}
          </EdRow>
        )}

        {cv.education?.length > 0 && (
          <EdRow label="EDUCATION">
            {cv.education.map(edu => (
              <div key={edu.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>{edu.qualification} in {edu.field}</div>
                  <div style={{ fontSize: '10px', color: '#9a9588', fontStyle: 'italic' }}>{edu.startYear} — {edu.endYear}</div>
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '11.5px', color: '#6b5742', fontStyle: 'italic' }}>{edu.institution}{edu.grade ? <span style={{ color: '#3a3a3a', fontStyle: 'normal' }}> · {edu.grade}</span> : null}</div>
              </div>
            ))}
          </EdRow>
        )}

        {cv.skills?.length > 0 && (
          <EdRow label="SKILLS">
            <div style={{ fontSize: '10.5px', color: '#3a3a3a', lineHeight: 1.9 }}>{(Array.isArray(cv.skills) ? cv.skills : [cv.skills]).join('  ·  ')}</div>
          </EdRow>
        )}

        {cv.languages && cv.languages.length > 0 && (
          <EdRow label="LANGUAGES">
            <div style={{ fontSize: '10.5px', color: '#3a3a3a', lineHeight: 1.9 }}>{cv.languages!.join('  ·  ')}</div>
          </EdRow>
        )}
      </div>
    )
  }

  // EXECUTIVE — Deep navy + gold, boardroom
  if (templateId === 'executive') {
    const ExSH = ({ children }: { children: string }) => (
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#0a1a3a', borderBottom: '1.5px solid #c9a05a', paddingBottom: '5px', marginTop: '20px', marginBottom: '12px' }}>{children}</div>
    )
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#1f1f1f' }}>
        <div style={{ background: '#0a1a3a', padding: '36px 40px 32px', color: 'white' }}>
          <div style={{ fontSize: '9px', color: '#e5c98f', letterSpacing: '5px', fontWeight: 500, marginBottom: '12px' }}>{cv.coverLetterBody ? 'LETTER OF APPLICATION' : 'EXECUTIVE PROFILE'}</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '30px', fontWeight: 500, letterSpacing: '-0.2px', lineHeight: 1, marginBottom: '10px' }}>{cv.fullName}</div>
          <div style={{ width: '56px', height: '2px', background: '#c9a05a', marginBottom: '14px' }} />
          {cv.jobTitle && <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '13px', color: '#e5c98f', fontStyle: 'italic', marginBottom: '14px' }}>{cv.jobTitle}</div>}
          <div style={{ fontSize: '10px', color: '#d0d6e0', letterSpacing: '0.3px' }}>{contact}</div>
        </div>
        <div style={{ padding: '28px 40px 36px' }}>
          {cv.summary && (
            <>
              <ExSH>Executive Summary</ExSH>
              <p style={{ fontSize: '11px', color: '#1f1f1f', lineHeight: 1.7 }}>{cv.summary}</p>
            </>
          )}
          {cv.coverLetterBody && (
            <>
              <ExSH>Letter</ExSH>
              {cv.coverLetterBody.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '11px', color: '#1f1f1f', lineHeight: 1.7, marginBottom: '10px' }}>{p}</p>)}
            </>
          )}
          {cv.experience?.length > 0 && (
            <>
              <ExSH>Professional Experience</ExSH>
              {cv.experience.map(exp => (
                <div key={exp.id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '13.5px', fontWeight: 600, color: '#0a1a3a' }}>{exp.role}</div>
                    <div style={{ fontSize: '10px', color: '#6b6b6b', fontStyle: 'italic' }}>{exp.startDate} — {exp.endDate}</div>
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '11.5px', color: '#c9a05a', fontStyle: 'italic', marginBottom: '6px' }}>{exp.company}</div>
                  {exp.bullets.map((b, i) => (
                    <div key={i} style={{ fontSize: '10.5px', color: '#1f1f1f', paddingLeft: '16px', position: 'relative', marginBottom: '3px', lineHeight: 1.6 }}>
                      <span style={{ position: 'absolute', left: '4px', color: '#c9a05a', fontWeight: 700 }}>•</span>{b}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
          {cv.education?.length > 0 && (
            <>
              <ExSH>Education</ExSH>
              {cv.education.map(edu => (
                <div key={edu.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '13px', fontWeight: 600, color: '#0a1a3a' }}>{edu.qualification} in {edu.field}</div>
                    <div style={{ fontSize: '10px', color: '#6b6b6b', fontStyle: 'italic' }}>{edu.startYear} — {edu.endYear}</div>
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '11.5px', color: '#c9a05a', fontStyle: 'italic' }}>{edu.institution}{edu.grade ? <span style={{ color: '#1f1f1f', fontStyle: 'normal' }}> · {edu.grade}</span> : null}</div>
                </div>
              ))}
            </>
          )}
          {cv.skills?.length > 0 && (
            <>
              <ExSH>Core Competencies</ExSH>
              <div style={{ fontSize: '10.5px', color: '#1f1f1f', lineHeight: 1.9 }}>{(Array.isArray(cv.skills) ? cv.skills : [cv.skills]).join('  ·  ')}</div>
            </>
          )}
          {cv.languages && cv.languages.length > 0 && (
            <>
              <ExSH>Languages</ExSH>
              <div style={{ fontSize: '10.5px', color: '#1f1f1f', lineHeight: 1.9 }}>{cv.languages!.join('  ·  ')}</div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Academic
  return (
    <div style={{ padding: '32px 40px', fontFamily: 'Georgia, serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#111' }}>{cv.fullName}</div>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>{cv.jobTitle}</div>
        <div style={{ fontSize: '10px', color: '#777', marginTop: '4px' }}>{contact}</div>
      </div>
      <div style={{ height: '1px', background: '#333', marginBottom: '14px' }} />
      {sharedBody('#333')}
    </div>
  )
}

function SH({ children, color }: { children: string; color: string }) {
  return (
    <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color, borderBottom: `2px solid ${color}`, paddingBottom: '3px', marginBottom: '10px', display: 'inline-block', fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </div>
  )
}
