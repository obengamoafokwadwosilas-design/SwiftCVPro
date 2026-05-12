'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratedCV, TemplateId, ExportFormat } from '@/types'

const TEMPLATES: { id: TemplateId; name: string; tag: string; color: string }[] = [
  { id: 'london',   name: 'London',    tag: 'Editorial · Warm Serif',    color: '#6B4F3A' },
  { id: 'nordic',   name: 'Nordic',    tag: 'Clean · Light · Modern',    color: '#2563eb' },
  { id: 'newyork',  name: 'New York',  tag: 'Bold Serif · Crimson',      color: '#b22222' },
  { id: 'atelier',  name: 'Atelier',   tag: 'Playfair · Timeline',       color: '#3b0a45' },
  { id: 'noir',     name: 'Noir',      tag: 'Condensed · Stark · Black', color: '#111111' },
  { id: 'academic', name: 'Academic',  tag: 'Scholarly · Structured',    color: '#374151' },
]

// Google Fonts used across templates — loaded in print iframe
const PRINT_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Sans+3:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400;1,700&family=Cormorant+Garamond:wght@400;500;600;700&family=Oswald:wght@300;400;500;600;700&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap'

export default function PreviewPage() {
  const router = useRouter()
  const [cv, setCV] = useState<GeneratedCV | null>(null)
  const [phone, setPhone] = useState('')
  const [template, setTemplate] = useState<TemplateId>('london')
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

  // ─────────────────────────────────────────────
  // DOWNLOAD — Word still goes to API; PDF is now client-side print
  // ─────────────────────────────────────────────
  async function handleDownloadDocx() {
    if (!cv) return
    setDownloading('docx')
    try {
      const res = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, templateId: template })
      })
      if (!res.ok) throw new Error('failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cv.fullName.replace(/\s+/g, '_')}_CV.docx`
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch { alert('Download failed. Please try again.') }
    finally { setDownloading(null) }
  }

  async function handleDownloadPdf() {
    if (!cv) return
    setDownloading('pdf')
    try {
      const previewEl = document.getElementById('cv-print-area')
      if (!previewEl) throw new Error('preview not found')

      const safeName = cv.fullName.replace(/[<>&"']/g, '').trim() || 'CV'
      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
      document.body.appendChild(iframe)

      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) throw new Error('iframe doc unavailable')

      doc.open()
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeName} CV</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="${PRINT_FONTS_HREF}" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
          * { box-sizing: border-box; }
          body > div { width: 210mm; min-height: 297mm; }
        </style>
      </head><body>${previewEl.outerHTML}</body></html>`)
      doc.close()

      // Wait for fonts to be ready, then a short paint pause
      const w = iframe.contentWindow
      try {
        await (doc as any).fonts?.ready
      } catch {}
      await new Promise(r => setTimeout(r, 400))

      const cleanup = () => { try { document.body.removeChild(iframe) } catch {} }
      w?.addEventListener('afterprint', cleanup)
      setTimeout(cleanup, 60000) // safety net

      w?.focus()
      w?.print()
    } catch (e) {
      console.error(e)
      alert('PDF download failed. Please try again.')
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
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(13,148,136,0.2)', borderTopColor:'#0d9488', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9' }}>
      {/* NAV */}
      <nav style={{ background:'#0a0f1a', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50, flexWrap:'wrap', gap:'10px' }}>
        <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.25rem', fontWeight:600, color:'white' }}>Swift<span style={{ color:'#5eead4' }}>CV</span>Pro</div>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.08)', borderRadius:'50px', padding:'3px', gap:'2px' }}>
          {(['preview','edit'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding:'7px 18px', borderRadius:'50px', fontSize:'12px', fontWeight:activeTab===tab?600:400, background:activeTab===tab?'white':'none', color:activeTab===tab?'#0a0f1a':'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', textTransform:'capitalize', fontFamily:"'DM Sans',sans-serif" }}>{tab}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={handleNewCV} style={{ padding:'8px 14px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50px', fontSize:'12px', fontWeight:500, cursor:'pointer' }}>+ New CV</button>
          <button onClick={handleDownloadDocx} disabled={!!downloading} style={{ padding:'8px 16px', background:'rgba(255,255,255,0.1)', color:'white', border:'none', borderRadius:'50px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>{downloading==='docx'?'...':'↓ Word'}</button>
          <button onClick={handleDownloadPdf} disabled={!!downloading} style={{ padding:'8px 16px', background:'#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'13px', fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(13,148,136,0.3)' }}>{downloading==='pdf'?'...':'↓ PDF'}</button>
        </div>
      </nav>

      <div style={{ display:'grid', gridTemplateColumns: isCoverLetter ? '1fr' : '220px 1fr', minHeight:'calc(100vh - 57px)' }}>
        {/* SIDEBAR */}
        {!isCoverLetter && (
          <div style={{ background:'white', borderRight:'1px solid #e2e8f0', padding:'20px', overflowY:'auto' }}>
            <div style={{ fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:'#94a3b8', marginBottom:'14px' }}>Choose Template</div>
            {TEMPLATES.map(tpl => (
              <div key={tpl.id} onClick={() => setTemplate(tpl.id)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px', borderRadius:'10px', border:template===tpl.id?'2px solid #0d9488':'2px solid transparent', background:template===tpl.id?'#f0fdf9':'none', cursor:'pointer', marginBottom:'6px', transition:'all 0.2s' }}>
                <div style={{ width:'32px', height:'42px', borderRadius:'6px', background:tpl.color, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:'20px', height:'2px', background:'rgba(255,255,255,0.6)', borderRadius:'1px', boxShadow:'0 3px 0 rgba(255,255,255,0.4), 0 6px 0 rgba(255,255,255,0.2)' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:template===tpl.id?'#0d9488':'#0a0f1a' }}>{tpl.name}</div>
                  <div style={{ fontSize:'10px', color:'#94a3b8', marginTop:'2px' }}>{tpl.tag}</div>
                </div>
                {template===tpl.id && <span style={{ color:'#0d9488', fontSize:'14px', fontWeight:700 }}>✓</span>}
              </div>
            ))}
            <div style={{ background:'#f8fafc', borderRadius:'10px', border:'1px solid #f1f5f9', padding:'14px', marginTop:'14px' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:'#0a0f1a', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>Tips</div>
              {['Click each template to compare','Edit tab to change content','PDF is highest quality','Word compatible with all systems'].map(t => (
                <div key={t} style={{ fontSize:'11.5px', color:'#64748b', marginBottom:'6px', lineHeight:1.5, fontWeight:300 }}>· {t}</div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN */}
        <div style={{ padding:'24px', overflowY:'auto', background:'#f1f5f9' }}>
          {activeTab === 'preview' ? (
            <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,0.1)', maxWidth:'760px', margin:'0 auto' }}>
              <div id="cv-print-area">
                <CVPreview cv={cv} templateId={template} />
              </div>
            </div>
          ) : (
            <CVEditor cv={cv} updateCV={updateCV} />
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// CONTACT LINE — shared across templates
// ══════════════════════════════════════════════════════
function ContactLine({ cv, color = '#5a5a5a', sep = 18 }: { cv: GeneratedCV; color?: string; sep?: number }) {
  const items = [
    cv.email && <span key="e" style={{ color, marginRight: sep, fontSize: '10pt', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>{cv.email}
    </span>,
    cv.phone && <span key="p" style={{ color, marginRight: sep, fontSize: '10pt', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 10 19.79 19.79 0 0 1 1.04 1.54 2 2 0 0 1 3 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>{cv.phone}
    </span>,
    cv.location && <span key="l" style={{ color, marginRight: sep, fontSize: '10pt', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{cv.location}
    </span>,
    cv.linkedin && <span key="li" style={{ color, marginRight: sep, fontSize: '10pt', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>{cv.linkedin}
    </span>,
  ].filter(Boolean)
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 0' }}>{items}</div>
}

// ══════════════════════════════════════════════════════
// TEMPLATE DISPATCHER
// ══════════════════════════════════════════════════════
function CVPreview({ cv, templateId }: { cv: GeneratedCV; templateId: TemplateId }) {
  if (templateId === 'nordic')   return <NordicTemplate cv={cv} />
  if (templateId === 'newyork')  return <NewYorkTemplate cv={cv} />
  if (templateId === 'atelier')  return <AtelierTemplate cv={cv} />
  if (templateId === 'noir')     return <NoirTemplate cv={cv} />
  if (templateId === 'academic') return <AcademicTemplate cv={cv} />
  return <LondonTemplate cv={cv} />  // default
}

// ══════════════════════════════════════════════════════
// 1. LONDON — Editorial · Warm Serif (Crimson Text on cream)
// ══════════════════════════════════════════════════════
function LondonTemplate({ cv }: { cv: GeneratedCV }) {
  const isLetter = !!cv.coverLetterBody
  return (
    <div style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '10.5pt', lineHeight: 1.65, color: '#2a2a2a', background: '#faf8f5', padding: '40px 48px' }}>
      <div style={{ borderBottom: '2.5px solid #2a2a2a', paddingBottom: '18px', marginBottom: '24px' }}>
        <div style={{ fontSize: '38px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '6px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '16px', fontStyle: 'italic', color: '#5a5a5a', marginBottom: '12px' }}>{cv.jobTitle}</div>}
        <ContactLine cv={cv} color="#5a5a5a" />
      </div>

      {isLetter
        ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '10.5pt', lineHeight: 1.75, color: '#2a2a2a', marginBottom: '14px', textAlign: 'justify', fontFamily: "'Source Sans 3', sans-serif" }}>{p}</p>)
        : <>
          {cv.summary && <div style={{ marginBottom: '20px' }}><p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '10.5pt', lineHeight: 1.7, color: '#3a3a3a', textAlign: 'justify' }}>{cv.summary}</p></div>}

          {cv.experience?.length > 0 && (
            <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid #d4cfc7' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Experience</div>
              {cv.experience.map(e => (
                <div key={e.id} style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #e8e4dd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>{e.role}</span>
                    <span style={{ fontSize: '9.5pt', color: '#777', whiteSpace: 'nowrap', fontStyle: 'italic', fontFamily: "'Source Sans 3', sans-serif" }}>{e.startDate} – {e.endDate}</span>
                  </div>
                  <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '11pt', fontWeight: 600, color: '#4a4a4a', marginBottom: '6px' }}>{e.company}</div>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '16px' }}>
                    {e.bullets.map((b, i) => <li key={i} style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '10.5pt', lineHeight: 1.55, color: '#3a3a3a', marginBottom: '4px' }}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {cv.education?.length > 0 && (
            <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid #d4cfc7' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Education</div>
              {cv.education.map(ed => (
                <div key={ed.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>{ed.qualification} in {ed.field}</span>
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '9pt', color: '#777', whiteSpace: 'nowrap', fontStyle: 'italic' }}>{ed.startYear} – {ed.endYear}</span>
                  </div>
                  <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '10.5pt', color: '#5a5a5a', fontStyle: 'italic' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
                </div>
              ))}
            </div>
          )}

          {cv.skills?.length > 0 && (
            <div style={{ paddingTop: '16px', borderTop: '1px solid #d4cfc7', marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Skills</div>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '10.5pt', color: '#3a3a3a', lineHeight: 1.8 }}>{cv.skills.join('  ·  ')}</div>
            </div>
          )}

          {cv.languages && cv.languages.length > 0 && (
            <div style={{ paddingTop: '16px', borderTop: '1px solid #d4cfc7', marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Languages</div>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '10.5pt', color: '#3a3a3a', lineHeight: 1.8 }}>{cv.languages!.join('  ·  ')}</div>
            </div>
          )}

          {cv.additionalInfo && (
            <div style={{ paddingTop: '16px', borderTop: '1px solid #d4cfc7' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Additional Information</div>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '10.5pt', color: '#3a3a3a', lineHeight: 1.8 }}>{cv.additionalInfo}</div>
            </div>
          )}
        </>
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 2. NORDIC — Clean · Light · Modern (Inter 300, blue accent)
// ══════════════════════════════════════════════════════
function NordicTemplate({ cv }: { cv: GeneratedCV }) {
  const isLetter = !!cv.coverLetterBody
  const BLUE = '#2563eb'
  const SH = ({ children }: { children: string }) => (
    <div style={{ fontSize: '8.5pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: BLUE, borderBottom: `2px solid ${BLUE}`, paddingBottom: '5px', margin: '20px 0 12px' }}>{children}</div>
  )
  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", fontSize: '10pt', lineHeight: 1.7, color: '#1e293b', background: '#ffffff', padding: '40px 48px' }}>
      <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '34pt', fontWeight: 300, color: '#0f172a', letterSpacing: '-1px', lineHeight: 1, marginBottom: '6px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '12pt', fontWeight: 400, color: '#64748b', marginBottom: '14px' }}>{cv.jobTitle}</div>}
        <ContactLine cv={cv} color="#475569" />
      </div>

      {isLetter
        ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '10pt', lineHeight: 1.8, color: '#1e293b', fontWeight: 300, marginBottom: '14px' }}>{p}</p>)
        : <>
          {cv.summary && <><SH>Profile</SH><p style={{ fontSize: '10pt', lineHeight: 1.75, color: '#334155', fontWeight: 300 }}>{cv.summary}</p></>}

          {cv.experience?.length > 0 && <><SH>Experience</SH>{cv.experience.map(e => (
            <div key={e.id} style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '2px' }}>
                <span style={{ fontSize: '12pt', fontWeight: 500, color: '#0f172a' }}>{e.role}</span>
                <span style={{ fontSize: '9pt', color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 300 }}>{e.startDate} – {e.endDate}</span>
              </div>
              <div style={{ fontSize: '10pt', color: BLUE, marginBottom: '6px' }}>{e.company}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {e.bullets.map((b, i) => (
                  <li key={i} style={{ fontSize: '10pt', lineHeight: 1.6, color: '#334155', paddingLeft: '14px', position: 'relative', marginBottom: '4px', fontWeight: 300 }}>
                    <span style={{ position: 'absolute', left: 0, color: BLUE, fontWeight: 600 }}>—</span>{b}
                  </li>
                ))}
              </ul>
            </div>
          ))}</>}

          {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '11pt', fontWeight: 500, color: '#0f172a' }}>{ed.qualification} in {ed.field}</span>
                <span style={{ fontSize: '9pt', color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 300 }}>{ed.startYear} – {ed.endYear}</span>
              </div>
              <div style={{ fontSize: '10pt', color: BLUE, fontWeight: 300 }}>{ed.institution}{ed.grade ? ` · ${ed.grade}` : ''}</div>
            </div>
          ))}</>}

          {cv.skills?.length > 0 && <><SH>Skills</SH><div style={{ fontSize: '10pt', color: '#334155', lineHeight: 1.85, fontWeight: 300 }}>{cv.skills.join('  ·  ')}</div></>}
          {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ fontSize: '10pt', color: '#334155', lineHeight: 1.85, fontWeight: 300 }}>{cv.languages!.join('  ·  ')}</div></>}
          {cv.additionalInfo && <><SH>Additional</SH><div style={{ fontSize: '10pt', color: '#334155', lineHeight: 1.85, fontWeight: 300 }}>{cv.additionalInfo}</div></>}
        </>
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 3. NEW YORK — Bold Serif · Crimson (WSJ-style authority)
// ══════════════════════════════════════════════════════
function NewYorkTemplate({ cv }: { cv: GeneratedCV }) {
  const isLetter = !!cv.coverLetterBody
  const CRIMSON = '#a01e1e'
  const INK = '#0a0a0a'
  const SH = ({ children }: { children: string }) => (
    <div style={{ background: CRIMSON, color: 'white', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: '11pt', textTransform: 'uppercase', letterSpacing: '3px', padding: '6px 14px', margin: '22px 0 14px' }}>{children}</div>
  )
  return (
    <div style={{ fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif", fontSize: '10.5pt', lineHeight: 1.6, color: INK, background: '#ffffff', padding: '0' }}>
      {/* Header with crimson rule */}
      <div style={{ padding: '40px 48px 20px', borderBottom: `4px double ${CRIMSON}` }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '40px', fontWeight: 900, color: INK, letterSpacing: '-1px', lineHeight: 1, marginBottom: '6px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '15pt', color: CRIMSON, marginBottom: '14px', fontWeight: 500 }}>{cv.jobTitle}</div>}
        <ContactLine cv={cv} color="#444" />
      </div>

      <div style={{ padding: '6px 48px 40px' }}>
        {isLetter
          ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '10.5pt', lineHeight: 1.75, color: INK, marginBottom: '14px', textAlign: 'justify' }}>{p}</p>)
          : <>
            {cv.summary && <><SH>Profile</SH><p style={{ fontSize: '10.5pt', lineHeight: 1.7, color: '#222', textAlign: 'justify' }}>{cv.summary}</p></>}

            {cv.experience?.length > 0 && <><SH>Experience</SH>{cv.experience.map(e => (
              <div key={e.id} style={{ marginBottom: '18px', paddingLeft: '14px', borderLeft: `3px solid ${CRIMSON}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '14pt', fontWeight: 700, color: INK }}>{e.role}</span>
                  <span style={{ fontSize: '9.5pt', color: CRIMSON, whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: '0.5px' }}>{e.startDate} – {e.endDate}</span>
                </div>
                <div style={{ fontSize: '11pt', fontWeight: 600, color: '#444', fontStyle: 'italic', marginBottom: '6px' }}>{e.company}</div>
                <ul style={{ margin: '6px 0 0', paddingLeft: '16px' }}>
                  {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '10.5pt', lineHeight: 1.6, color: '#222', marginBottom: '4px' }}>{b}</li>)}
                </ul>
              </div>
            ))}</>}

            {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: '12px', paddingLeft: '14px', borderLeft: `3px solid ${CRIMSON}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '12.5pt', fontWeight: 700, color: INK }}>{ed.qualification} in {ed.field}</span>
                  <span style={{ fontSize: '9pt', color: CRIMSON, whiteSpace: 'nowrap', fontWeight: 600 }}>{ed.startYear} – {ed.endYear}</span>
                </div>
                <div style={{ fontSize: '10.5pt', color: '#444', fontStyle: 'italic' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
              </div>
            ))}</>}

            {cv.skills?.length > 0 && <><SH>Skills</SH><div style={{ fontSize: '10.5pt', color: '#222', lineHeight: 1.8 }}>{cv.skills.join('  ·  ')}</div></>}
            {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ fontSize: '10.5pt', color: '#222', lineHeight: 1.8 }}>{cv.languages!.join('  ·  ')}</div></>}
            {cv.additionalInfo && <><SH>Additional</SH><div style={{ fontSize: '10.5pt', color: '#222', lineHeight: 1.8 }}>{cv.additionalInfo}</div></>}
          </>
        }
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 4. ATELIER — Playfair · Timeline (plum + dotted timeline)
// ══════════════════════════════════════════════════════
function AtelierTemplate({ cv }: { cv: GeneratedCV }) {
  const isLetter = !!cv.coverLetterBody
  const PLUM = '#3b0a45'
  const PLUM_SOFT = '#6d3a78'
  const SH = ({ children }: { children: string }) => (
    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '16pt', fontWeight: 600, color: PLUM, margin: '24px 0 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span>{children}</span>
      <span style={{ flex: 1, height: '1px', background: `linear-gradient(to right, ${PLUM_SOFT}, transparent)` }} />
    </div>
  )
  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '11pt', lineHeight: 1.65, color: '#2a1a2e', background: '#fdfcf9', padding: '40px 48px' }}>
      {/* Monogram + name */}
      <div style={{ marginBottom: '26px' }}>
        <div style={{ display: 'inline-block', border: `1.5px solid ${PLUM}`, padding: '4px 10px', fontFamily: "'Playfair Display', serif", fontSize: '10pt', color: PLUM, letterSpacing: '4px', fontWeight: 600, marginBottom: '14px' }}>
          {cv.fullName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 3).join('·')}
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '40px', fontWeight: 700, fontStyle: 'italic', color: PLUM, letterSpacing: '-0.5px', lineHeight: 1.05, marginBottom: '4px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '13pt', color: PLUM_SOFT, marginBottom: '12px', fontStyle: 'italic' }}>{cv.jobTitle}</div>}
        <ContactLine cv={cv} color="#5a4a5e" />
      </div>

      {isLetter
        ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '11pt', lineHeight: 1.85, color: '#2a1a2e', marginBottom: '14px', textAlign: 'justify' }}>{p}</p>)
        : <>
          {cv.summary && <><SH>Profile</SH><p style={{ fontSize: '11pt', lineHeight: 1.8, color: '#3a2a3e', textAlign: 'justify', fontStyle: 'italic' }}>{cv.summary}</p></>}

          {cv.experience?.length > 0 && <><SH>Experience</SH>
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div style={{ position: 'absolute', left: '7px', top: '6px', bottom: '6px', width: '1px', background: PLUM_SOFT, borderLeft: `1px dashed ${PLUM_SOFT}` }} />
              {cv.experience.map(e => (
                <div key={e.id} style={{ marginBottom: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-24px', top: '6px', width: '14px', height: '14px', borderRadius: '50%', background: '#fdfcf9', border: `2px solid ${PLUM}`, boxSizing: 'border-box' }} />
                  <div style={{ fontSize: '9.5pt', color: PLUM, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>{e.startDate} – {e.endDate}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '14pt', fontWeight: 700, color: '#1a0a1e', marginBottom: '2px' }}>{e.role}</div>
                  <div style={{ fontSize: '11pt', color: PLUM_SOFT, fontStyle: 'italic', marginBottom: '6px' }}>{e.company}</div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '10.5pt', lineHeight: 1.65, color: '#2a1a2e', marginBottom: '3px' }}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </>}

          {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '13pt', fontWeight: 700, color: '#1a0a1e' }}>{ed.qualification} in {ed.field}</span>
                <span style={{ fontSize: '9.5pt', color: PLUM, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '1px' }}>{ed.startYear} – {ed.endYear}</span>
              </div>
              <div style={{ fontSize: '11pt', color: PLUM_SOFT, fontStyle: 'italic' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
            </div>
          ))}</>}

          {cv.skills?.length > 0 && <><SH>Skills</SH>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px' }}>
              {cv.skills.map((s, i) => <span key={i} style={{ fontSize: '10pt', color: PLUM, border: `1px solid ${PLUM_SOFT}`, padding: '3px 10px', borderRadius: '14px', background: 'rgba(59,10,69,0.04)' }}>{s}</span>)}
            </div>
          </>}
          {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ fontSize: '11pt', color: '#3a2a3e', lineHeight: 1.8, fontStyle: 'italic' }}>{cv.languages!.join('  ·  ')}</div></>}
          {cv.additionalInfo && <><SH>Additional</SH><div style={{ fontSize: '11pt', color: '#3a2a3e', lineHeight: 1.8 }}>{cv.additionalInfo}</div></>}
        </>
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 5. NOIR — Condensed · Stark · Black (black header band, Oswald)
// ══════════════════════════════════════════════════════
function NoirTemplate({ cv }: { cv: GeneratedCV }) {
  const isLetter = !!cv.coverLetterBody
  const SH = ({ children }: { children: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '24px 0 14px' }}>
      <div style={{ background: '#000', color: 'white', fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: '11pt', letterSpacing: '4px', textTransform: 'uppercase', padding: '5px 14px' }}>{children}</div>
      <div style={{ flex: 1, height: '2px', background: '#000' }} />
    </div>
  )
  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", fontSize: '10pt', lineHeight: 1.65, color: '#111', background: '#ffffff', padding: 0 }}>
      {/* Black band header */}
      <div style={{ background: '#000', color: 'white', padding: '32px 48px 26px' }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: '44pt', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1, marginBottom: '6px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontFamily: "'Barlow Condensed', 'Oswald', sans-serif", fontSize: '14pt', color: '#bbb', textTransform: 'uppercase', letterSpacing: '6px', fontWeight: 300 }}>{cv.jobTitle}</div>}
      </div>
      {/* Contact strip */}
      <div style={{ background: '#111', color: '#ddd', padding: '10px 48px', fontSize: '9.5pt', borderBottom: '6px solid #000' }}>
        <ContactLine cv={cv} color="#ddd" />
      </div>

      <div style={{ padding: '14px 48px 40px' }}>
        {isLetter
          ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '10pt', lineHeight: 1.8, color: '#222', marginBottom: '14px' }}>{p}</p>)
          : <>
            {cv.summary && <><SH>Profile</SH><p style={{ fontSize: '10pt', lineHeight: 1.75, color: '#222' }}>{cv.summary}</p></>}

            {cv.experience?.length > 0 && <><SH>Experience</SH>{cv.experience.map(e => (
              <div key={e.id} style={{ marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '2px' }}>
                  <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '13pt', fontWeight: 500, color: '#000', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{e.role}</span>
                  <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '9.5pt', color: '#000', whiteSpace: 'nowrap', fontWeight: 500, letterSpacing: '1px' }}>{e.startDate} – {e.endDate}</span>
                </div>
                <div style={{ fontSize: '10pt', fontWeight: 600, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px' }}>{e.company}</div>
                <ul style={{ margin: '6px 0 0', paddingLeft: '16px', listStyle: 'none' }}>
                  {e.bullets.map((b, i) => (
                    <li key={i} style={{ fontSize: '10pt', lineHeight: 1.6, color: '#222', marginBottom: '3px', paddingLeft: '12px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: 0, color: '#000', fontWeight: 700 }}>▸</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}</>}

            {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '12pt', fontWeight: 500, color: '#000', textTransform: 'uppercase', letterSpacing: '1px' }}>{ed.qualification} in {ed.field}</span>
                  <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '9.5pt', color: '#000', fontWeight: 500, whiteSpace: 'nowrap', letterSpacing: '1px' }}>{ed.startYear} – {ed.endYear}</span>
                </div>
                <div style={{ fontSize: '10pt', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
              </div>
            ))}</>}

            {cv.skills?.length > 0 && <><SH>Skills</SH>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cv.skills.map((s, i) => <span key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: '9pt', color: '#fff', background: '#000', padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 400 }}>{s}</span>)}
              </div>
            </>}
            {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ fontSize: '10pt', color: '#222', lineHeight: 1.8 }}>{cv.languages!.join('  ·  ')}</div></>}
            {cv.additionalInfo && <><SH>Additional</SH><div style={{ fontSize: '10pt', color: '#222', lineHeight: 1.8 }}>{cv.additionalInfo}</div></>}
          </>
        }
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 6. ACADEMIC — Scholarly · Structured (centred, classical)
// ══════════════════════════════════════════════════════
function AcademicTemplate({ cv }: { cv: GeneratedCV }) {
  const SH_AC = ({ children }: { children: string }) => (
    <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '10pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: '#1a1a1a', borderBottom: '1px solid #1a1a1a', paddingBottom: '3px', margin: '18px 0 10px' }}>{children}</div>
  )
  return (
    <div style={{ fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif", fontSize: '10.5pt', lineHeight: 1.65, color: '#1a1a1a', background: '#ffffff', padding: '40px 48px' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1a1a', paddingBottom: '18px', marginBottom: '22px' }}>
        <div style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '30px', fontWeight: 700, color: '#0a0a0a', marginBottom: '5px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '14px', fontStyle: 'italic', color: '#4a4a4a', marginBottom: '10px' }}>{cv.jobTitle}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}><ContactLine cv={cv} color="#555" /></div>
      </div>
      {cv.summary && <><SH_AC>Research Profile</SH_AC><p style={{ fontSize: '10.5pt', lineHeight: 1.7, textAlign: 'justify', marginBottom: '4px' }}>{cv.summary}</p></>}
      {cv.education?.length > 0 && <><SH_AC>Education</SH_AC>{cv.education.map(ed => (
        <div key={ed.id} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '14px', fontWeight: 700 }}>{ed.qualification} in {ed.field}</span>
            <span style={{ fontSize: '9pt', color: '#777', whiteSpace: 'nowrap', fontStyle: 'italic' }}>{ed.startYear} – {ed.endYear}</span>
          </div>
          <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#5a5a5a' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
        </div>
      ))}</>}
      {cv.experience?.length > 0 && <><SH_AC>Academic & Professional Experience</SH_AC>{cv.experience.map(e => (
        <div key={e.id} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '14px', fontWeight: 700 }}>{e.role}</span>
            <span style={{ fontSize: '9pt', color: '#777', whiteSpace: 'nowrap', fontStyle: 'italic' }}>{e.startDate} – {e.endDate}</span>
          </div>
          <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#4a4a4a', marginBottom: '5px' }}>{e.company}</div>
          <ul style={{ paddingLeft: '16px', margin: 0 }}>
            {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '10.5pt', lineHeight: 1.6, marginBottom: '3px' }}>{b}</li>)}
          </ul>
        </div>
      ))}</>}
      {cv.publications && cv.publications.length > 0 && <><SH_AC>Publications</SH_AC><ul style={{ paddingLeft: '16px', margin: 0 }}>{cv.publications.map((p, i) => <li key={i} style={{ fontSize: '10.5pt', lineHeight: 1.6, marginBottom: '4px' }}>{p}</li>)}</ul></>}
      {cv.skills?.length > 0 && <><SH_AC>Research Methods & Skills</SH_AC><div style={{ fontSize: '10.5pt', lineHeight: 1.8 }}>{cv.skills.join('  ·  ')}</div></>}
      {cv.languages && cv.languages.length > 0 && <><SH_AC>Languages</SH_AC><div style={{ fontSize: '10.5pt', lineHeight: 1.8 }}>{cv.languages!.join('  ·  ')}</div></>}
      {cv.additionalInfo && <><SH_AC>Honours, Awards & Memberships</SH_AC><div style={{ fontSize: '10.5pt', lineHeight: 1.8 }}>{cv.additionalInfo}</div></>}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// EDITOR (unchanged)
// ══════════════════════════════════════════════════════
function CVEditor({ cv, updateCV }: { cv: GeneratedCV; updateCV: (p: Partial<GeneratedCV>) => void }) {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Sec title="Personal Details">
        <Grid>
          <Inp label="Full Name" value={cv.fullName} onChange={v => updateCV({ fullName: v })} />
          <Inp label="Job Title" value={cv.jobTitle} onChange={v => updateCV({ jobTitle: v })} />
          <Inp label="Email" value={cv.email} onChange={v => updateCV({ email: v })} />
          <Inp label="Phone" value={cv.phone} onChange={v => updateCV({ phone: v })} />
          <Inp label="Location" value={cv.location} onChange={v => updateCV({ location: v })} />
          <Inp label="LinkedIn" value={cv.linkedin || ''} onChange={v => updateCV({ linkedin: v })} />
        </Grid>
      </Sec>
      {(cv.summary !== undefined || cv.coverLetterBody) && (
        <Sec title={cv.coverLetterBody ? 'Cover Letter' : 'Summary'}>
          <TA value={cv.coverLetterBody || cv.summary} rows={cv.coverLetterBody ? 12 : 5}
            onChange={v => cv.coverLetterBody ? updateCV({ coverLetterBody: v }) : updateCV({ summary: v })} />
        </Sec>
      )}
      {cv.experience?.length > 0 && (
        <Sec title="Experience">
          {cv.experience.map((exp, idx) => (
            <div key={exp.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
              <Grid>
                <Inp label="Role" value={exp.role} onChange={v => { const ne=[...cv.experience]; ne[idx]={...exp,role:v}; updateCV({experience:ne}) }} />
                <Inp label="Company" value={exp.company} onChange={v => { const ne=[...cv.experience]; ne[idx]={...exp,company:v}; updateCV({experience:ne}) }} />
                <Inp label="Start" value={exp.startDate} onChange={v => { const ne=[...cv.experience]; ne[idx]={...exp,startDate:v}; updateCV({experience:ne}) }} />
                <Inp label="End" value={exp.endDate} onChange={v => { const ne=[...cv.experience]; ne[idx]={...exp,endDate:v}; updateCV({experience:ne}) }} />
              </Grid>
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Bullets (one per line)</label>
                <TA value={exp.bullets.join('\n')} rows={5}
                  onChange={v => { const ne=[...cv.experience]; ne[idx]={...exp,bullets:v.split('\n').filter(Boolean)}; updateCV({experience:ne}) }} />
              </div>
            </div>
          ))}
        </Sec>
      )}
      {cv.education?.length > 0 && (
        <Sec title="Education">
          {cv.education.map((ed, idx) => (
            <div key={ed.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
              <Grid>
                <Inp label="Qualification" value={ed.qualification} onChange={v => { const ne=[...cv.education]; ne[idx]={...ed,qualification:v}; updateCV({education:ne}) }} />
                <Inp label="Field" value={ed.field} onChange={v => { const ne=[...cv.education]; ne[idx]={...ed,field:v}; updateCV({education:ne}) }} />
                <Inp label="Institution" value={ed.institution} onChange={v => { const ne=[...cv.education]; ne[idx]={...ed,institution:v}; updateCV({education:ne}) }} />
                <Inp label="Grade" value={ed.grade || ''} onChange={v => { const ne=[...cv.education]; ne[idx]={...ed,grade:v}; updateCV({education:ne}) }} />
                <Inp label="Start Year" value={ed.startYear} onChange={v => { const ne=[...cv.education]; ne[idx]={...ed,startYear:v}; updateCV({education:ne}) }} />
                <Inp label="End Year" value={ed.endYear} onChange={v => { const ne=[...cv.education]; ne[idx]={...ed,endYear:v}; updateCV({education:ne}) }} />
              </Grid>
            </div>
          ))}
        </Sec>
      )}
      {cv.skills?.length > 0 && (
        <Sec title="Skills">
          <TA value={cv.skills.join(', ')} rows={3}
            onChange={v => updateCV({ skills: v.split(',').map(s=>s.trim()).filter(Boolean) })} />
        </Sec>
      )}
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:'14px', padding:'20px' }}><div style={{ fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:'#0d9488', marginBottom:'12px' }}>{title}</div>{children}</div>
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px' }}>{children}</div>
}
function Inp({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  return <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}><label style={{ fontSize:'11px', color:'#64748b', fontWeight:500 }}>{label}</label><input value={value} onChange={e=>onChange(e.target.value)} style={{ padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', fontFamily:"'DM Sans',sans-serif", outline:'none' }} /></div>
}
function TA({ value, onChange, rows=4 }: { value:string; onChange:(v:string)=>void; rows?:number }) {
  return <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', fontFamily:"'DM Sans',sans-serif", resize:'vertical', lineHeight:1.5, outline:'none' }} />
}
