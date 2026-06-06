'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratedCV, TemplateId, ExportFormat } from '@/types'

// ══════════════════════════════════════════════════════
// TEMPLATE LIBRARY — Premium first, then ATS, then Academic
// ══════════════════════════════════════════════════════
type Formats = 'both' | 'pdf'
type Category = 'ats' | 'premium' | 'academic'

const TEMPLATES: { id: TemplateId; name: string; tag: string; color: string; formats: Formats; category: Category; customizable: boolean }[] = [
  // 💎 Premium — PDF only, rich design
  { id: 'meridian', name: 'Meridian',     tag: 'Navy Sidebar · Gold',        color: '#0a1f44', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'newyork',  name: 'New York',     tag: 'Bold Serif · Crimson',       color: '#a01e1e', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'atelier',  name: 'Atelier',      tag: 'Playfair · Timeline',        color: '#3b0a45', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'graduate', name: 'Graduate',     tag: 'Optimistic · Fresh',         color: '#dc6e3a', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'europass', name: 'Europass Pro', tag: 'Two-Column · International', color: '#1e3a8a', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'noir',     name: 'Noir',         tag: 'Refined · Dark',             color: '#111111', formats: 'pdf',  category: 'premium', customizable: false },

  // 🔵 ATS — PDF + Word, simple by design, recruiter-safe
  { id: 'london',   name: 'London',       tag: 'Editorial · Warm Serif',     color: '#6B4F3A', formats: 'both', category: 'ats',     customizable: false },
  { id: 'nordic',   name: 'Nordic',       tag: 'Clean · Modern · Sans',      color: '#2563eb', formats: 'both', category: 'ats',     customizable: true  },
  { id: 'classic',  name: 'Classic',      tag: 'Traditional · ATS Safe',     color: '#1f2937', formats: 'both', category: 'ats',     customizable: false },

  // 🎓 Academic — only shows for academic CV type
  { id: 'academic', name: 'Academic',     tag: 'Scholarly · Structured',     color: '#374151', formats: 'both', category: 'academic', customizable: false },
]

// Color swatches for picker
const COLOR_SWATCHES: { name: string; value: string }[] = [
  { name: 'Navy',    value: '#0a1f44' },
  { name: 'Crimson', value: '#a01e1e' },
  { name: 'Plum',    value: '#3b0a45' },
  { name: 'Coral',   value: '#dc6e3a' },
  { name: 'Forest',  value: '#1f5132' },
  { name: 'Teal',    value: '#0d7d8c' },
  { name: 'Royal',   value: '#1e3a8a' },
  { name: 'Bronze',  value: '#8b5e34' },
]

const PRINT_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Sans+3:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap'

export default function PreviewPage() {
  const router = useRouter()
  const [cv, setCV] = useState<GeneratedCV | null>(null)
  const [phone, setPhone] = useState('')
  const [template, setTemplate] = useState<TemplateId>('meridian')
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview')
  const [downloading, setDownloading] = useState<ExportFormat | null>(null)
  const [isCoverLetter, setIsCoverLetter] = useState(false)
  const [isAcademicCV, setIsAcademicCV] = useState(false)
  const [pdfOnlyModal, setPdfOnlyModal] = useState(false)
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)

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
      if (cvType === 'academic') { setIsAcademicCV(true); setTemplate('academic') }
    } catch { router.push('/build') }
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [router])

  // Reset accent color when switching templates
  useEffect(() => {
    setAccentColor(null)
    setShowColorPicker(false)
  }, [template])

  function updateCV(patch: Partial<GeneratedCV>) {
    if (!cv) return
    const updated = { ...cv, ...patch }
    setCV(updated)
    sessionStorage.setItem('swiftcv_cv', JSON.stringify(updated))
  }

  async function handleDownloadDocx() {
    if (!cv) return
    const tpl = TEMPLATES.find(t => t.id === template)
    if (tpl?.formats === 'pdf') {
      setPdfOnlyModal(true)
      return
    }
    setDownloading('docx')
    try {
      const res = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, templateId: template, accentColor })
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

  function handleDownloadPdf() {
    setDownloading('pdf')
    // Give the browser a tick to apply print styles, then open the dialog
    setTimeout(() => {
      window.print()
      setDownloading(null)
    }, 150)
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

  const currentTpl = TEMPLATES.find(t => t.id === template)

  const visibleTemplates = isAcademicCV
    ? TEMPLATES.filter(t => t.category === 'ats' || t.category === 'academic')
    : TEMPLATES.filter(t => t.category === 'ats' || t.category === 'premium')

  const premiumTemplates = visibleTemplates.filter(t => t.category === 'premium')
  const atsTemplates = visibleTemplates.filter(t => t.category === 'ats')
  const academicTemplates = visibleTemplates.filter(t => t.category === 'academic')

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9' }}>
      {/* Load premium fonts for screen + print */}
      <link rel="stylesheet" href={PRINT_FONTS_HREF} />

      {/* CRITICAL print CSS — hides everything except the CV, sizes to A4 */}
      <style>{`
        @media screen {
          #cv-print-area { width: 210mm; }
        }
        @media print {
          @page { size: A4; margin: 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide everything by default */
          body * { visibility: hidden !important; }
          /* Show only the CV print area and its children */
          #cv-print-area, #cv-print-area * { visibility: visible !important; }
          /* Pin the CV to the top-left, full A4 width, no decoration */
          #cv-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            max-width: 210mm !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          /* Kill the wrapping card's styling on print */
          #cv-print-area * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <nav className="no-print" style={{ background:'#0a0f1a', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50, flexWrap:'wrap', gap:'10px' }}>
        <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.25rem', fontWeight:600, color:'white' }}>Swift<span style={{ color:'#5eead4' }}>CV</span>Pro</div>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.08)', borderRadius:'50px', padding:'3px', gap:'2px' }}>
          {(['preview','edit'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding:'7px 18px', borderRadius:'50px', fontSize:'12px', fontWeight:activeTab===tab?600:400, background:activeTab===tab?'white':'none', color:activeTab===tab?'#0a0f1a':'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', textTransform:'capitalize', fontFamily:"'DM Sans',sans-serif" }}>{tab}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          {currentTpl?.customizable && (
            <button onClick={() => setShowColorPicker(!showColorPicker)} style={{ padding:'6px 12px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.8)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50px', fontSize:'12px', fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ width:'12px', height:'12px', borderRadius:'50%', background: accentColor || currentTpl.color, border:'1.5px solid rgba(255,255,255,0.3)' }} />
              Color
            </button>
          )}
          <button onClick={handleNewCV} style={{ padding:'8px 14px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50px', fontSize:'12px', fontWeight:500, cursor:'pointer' }}>+ New CV</button>
          <button onClick={handleDownloadDocx} disabled={!!downloading} style={{ padding:'8px 16px', background: currentTpl?.formats === 'pdf' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)', color: currentTpl?.formats === 'pdf' ? 'rgba(255,255,255,0.5)' : 'white', border:'none', borderRadius:'50px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>{downloading==='docx'?'...':'↓ Word'}</button>
          <button onClick={handleDownloadPdf} disabled={!!downloading} style={{ padding:'8px 16px', background:'#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'13px', fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(13,148,136,0.3)' }}>{downloading==='pdf'?'...':'↓ PDF'}</button>
        </div>
      </nav>

      {showColorPicker && currentTpl?.customizable && (
        <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'14px 24px', display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'#64748b' }}>Accent Color:</span>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            <button onClick={() => setAccentColor(null)} style={{ width:'28px', height:'28px', borderRadius:'50%', background: currentTpl.color, border: accentColor === null ? '3px solid #0d9488' : '2px solid #e2e8f0', cursor:'pointer', position:'relative' }} title="Default">
              {accentColor === null && <span style={{ position:'absolute', top:'-18px', left:'50%', transform:'translateX(-50%)', fontSize:'9px', color:'#0d9488', fontWeight:700 }}>✓</span>}
            </button>
            {COLOR_SWATCHES.map(s => (
              <button key={s.value} onClick={() => setAccentColor(s.value)} style={{ width:'28px', height:'28px', borderRadius:'50%', background: s.value, border: accentColor === s.value ? '3px solid #0d9488' : '2px solid #e2e8f0', cursor:'pointer' }} title={s.name} />
            ))}
          </div>
          <button onClick={() => setShowColorPicker(false)} style={{ marginLeft:'auto', padding:'6px 12px', background:'#f1f5f9', color:'#64748b', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:500, cursor:'pointer' }}>Done</button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns: isCoverLetter ? '1fr' : '260px 1fr', minHeight:'calc(100vh - 57px)' }}>
        {!isCoverLetter && (
          <div className="no-print" style={{ background:'white', borderRight:'1px solid #e2e8f0', padding:'20px', overflowY:'auto' }}>

            {/* PREMIUM SECTION FIRST */}
            {premiumTemplates.length > 0 && (<>
              <CategoryHeader>Premium</CategoryHeader>
              <div style={{ fontSize:'10px', color:'#94a3b8', marginBottom:'10px', lineHeight:1.5, fontStyle:'italic' }}>Rich design · PDF download</div>
              {premiumTemplates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} active={template===tpl.id} onClick={() => setTemplate(tpl.id)} />)}
            </>)}

            {/* ATS SECTION */}
            <CategoryHeader>ATS Templates</CategoryHeader>
            <div style={{ fontSize:'10px', color:'#94a3b8', marginBottom:'10px', lineHeight:1.5, fontStyle:'italic' }}>Recruiter-safe · PDF & Word</div>
            {atsTemplates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} active={template===tpl.id} onClick={() => setTemplate(tpl.id)} />)}

            {/* ACADEMIC SECTION */}
            {academicTemplates.length > 0 && (<>
              <CategoryHeader>Academic</CategoryHeader>
              <div style={{ fontSize:'10px', color:'#94a3b8', marginBottom:'10px', lineHeight:1.5, fontStyle:'italic' }}>Scholarly · PDF & Word</div>
              {academicTemplates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} active={template===tpl.id} onClick={() => setTemplate(tpl.id)} />)}
            </>)}

            <div style={{ background:'#f8fafc', borderRadius:'10px', border:'1px solid #f1f5f9', padding:'14px', marginTop:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:'#0a0f1a', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>Tips</div>
              {[
                'Premium: bold design, PDF only',
                'ATS: recruiter-safe, both formats',
                'Customize colors on premium templates',
                'Edit tab: add/remove sections',
              ].map(t => (
                <div key={t} style={{ fontSize:'11.5px', color:'#64748b', marginBottom:'6px', lineHeight:1.5, fontWeight:300 }}>· {t}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding:'24px', overflowY:'auto', background:'#f1f5f9' }}>
          {activeTab === 'preview' ? (
            <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,0.1)', maxWidth:'760px', margin:'0 auto' }}>
              <div id="cv-print-area">
                <CVPreview cv={cv} templateId={template} accentColor={accentColor} />
              </div>
            </div>
          ) : (
            <CVEditor cv={cv} updateCV={updateCV} />
          )}
        </div>
      </div>

      {pdfOnlyModal && (
        <div onClick={() => setPdfOnlyModal(false)} style={{ position:'fixed', inset:0, background:'rgba(10,15,26,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', backdropFilter:'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'18px', maxWidth:'460px', width:'100%', padding:'30px', boxShadow:'0 25px 80px rgba(0,0,0,0.4)', fontFamily:"'DM Sans', sans-serif" }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>📄</div>
              <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'22px', fontWeight:600, color:'#0a0f1a' }}>PDF Only Template</div>
            </div>
            <div style={{ fontSize:'14px', color:'#475569', lineHeight:1.65, marginBottom:'22px' }}>
              <strong style={{ color:'#0a0f1a' }}>{currentTpl?.name}</strong> uses rich visual design that Word can&apos;t reproduce. Download as PDF for the full look, or switch to an ATS template:
            </div>
            <div style={{ fontSize:'10.5px', color:'#64748b', textTransform:'uppercase', letterSpacing:'1.5px', fontWeight:700, marginBottom:'8px' }}>ATS Templates (PDF + Word)</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'24px' }}>
              {TEMPLATES.filter(t => t.formats === 'both' && (isAcademicCV ? true : t.category !== 'academic')).map(t => (
                <button key={t.id} onClick={() => { setTemplate(t.id); setPdfOnlyModal(false) }} style={{ padding:'7px 14px', borderRadius:'50px', border:'1.5px solid #e2e8f0', background:'white', cursor:'pointer', fontSize:'12px', fontWeight:600, color:'#0a0f1a', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ width:'8px', height:'8px', borderRadius:'2px', background:t.color }} />{t.name}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setPdfOnlyModal(false)} style={{ flex:1, padding:'12px', background:'#f1f5f9', color:'#0a0f1a', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:600, fontSize:'13px' }}>Cancel</button>
              <button onClick={() => { setPdfOnlyModal(false); handleDownloadPdf() }} style={{ flex:1, padding:'12px', background:'#0d9488', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:600, fontSize:'13px' }}>↓ Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SVG THUMBNAILS — one per template
// ══════════════════════════════════════════════════════
function TemplateThumb({ id }: { id: TemplateId }) {
  const W = 50, H = 64
  const wrap: React.CSSProperties = { width: W, height: H, borderRadius: 4, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.12)', background: 'white' }

  if (id === 'meridian') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fff"/>
        <rect x="0" y="0" width="18" height={H} fill="#0a1f44"/>
        <rect x="0" y="0" width="18" height="2" fill="#c9a449"/>
        <rect x="3" y="6" width="12" height="2.5" fill="#c9a449"/>
        <rect x="3" y="11" width="9" height="1.2" fill="rgba(255,255,255,0.6)"/>
        <rect x="3" y="19" width="6" height="0.8" fill="#c9a449"/>
        <rect x="3" y="22" width="10" height="0.6" fill="rgba(255,255,255,0.5)"/>
        <rect x="3" y="24" width="11" height="0.6" fill="rgba(255,255,255,0.5)"/>
        <rect x="22" y="6" width="3" height="0.8" fill="#c9a449"/>
        <rect x="26" y="6" width="14" height="1.5" fill="#0a1f44"/>
        <rect x="22" y="11" width="22" height="0.5" fill="#cbd5e1"/>
        <rect x="22" y="13" width="20" height="0.5" fill="#cbd5e1"/>
        <rect x="22" y="15" width="18" height="0.5" fill="#cbd5e1"/>
        <rect x="22" y="22" width="3" height="0.8" fill="#c9a449"/>
        <rect x="26" y="22" width="12" height="1.3" fill="#0a1f44"/>
        <rect x="22" y="26" width="20" height="0.5" fill="#cbd5e1"/>
        <rect x="22" y="28" width="18" height="0.5" fill="#cbd5e1"/>
      </svg>
    </div>
  )

  if (id === 'newyork') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fff"/>
        <text x="25" y="10" textAnchor="middle" fontFamily="serif" fontWeight="900" fontSize="6" fill="#0a0a0a">NAME</text>
        <text x="25" y="14" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="3" fill="#a01e1e">title</text>
        <line x1="3" y1="17" x2="47" y2="17" stroke="#a01e1e" strokeWidth="0.8"/>
        <line x1="3" y1="18.3" x2="47" y2="18.3" stroke="#a01e1e" strokeWidth="0.4"/>
        <rect x="3" y="22" width="16" height="2.5" fill="#a01e1e"/>
        <line x1="3" y1="28" x2="3" y2="36" stroke="#a01e1e" strokeWidth="1"/>
        <rect x="6" y="28" width="14" height="1.2" fill="#0a0a0a"/>
        <rect x="6" y="31" width="22" height="0.5" fill="#cbd5e1"/>
        <rect x="6" y="33" width="20" height="0.5" fill="#cbd5e1"/>
        <rect x="3" y="40" width="14" height="2" fill="#a01e1e"/>
        <line x1="3" y1="46" x2="3" y2="54" stroke="#a01e1e" strokeWidth="1"/>
        <rect x="6" y="46" width="14" height="1.2" fill="#0a0a0a"/>
        <rect x="6" y="49" width="20" height="0.5" fill="#cbd5e1"/>
      </svg>
    </div>
  )

  if (id === 'atelier') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fdfcf9"/>
        <text x="3" y="10" fontFamily="serif" fontStyle="italic" fontWeight="700" fontSize="5.5" fill="#3b0a45">Name</text>
        <text x="3" y="14" fontFamily="serif" fontStyle="italic" fontSize="2.5" fill="#6d3a78">title</text>
        <text x="3" y="22" fontFamily="serif" fontStyle="italic" fontSize="3.5" fill="#3b0a45">Profile</text>
        <line x1="14" y1="20.5" x2="46" y2="20.5" stroke="#6d3a78" strokeWidth="0.3" opacity="0.5"/>
        <rect x="3" y="25" width="40" height="0.5" fill="#cbd5e1"/>
        <rect x="3" y="27" width="38" height="0.5" fill="#cbd5e1"/>
        <text x="3" y="35" fontFamily="serif" fontStyle="italic" fontSize="3.5" fill="#3b0a45">Experience</text>
        <line x1="9" y1="38" x2="9" y2="58" stroke="#6d3a78" strokeWidth="0.3" strokeDasharray="1,1"/>
        <circle cx="9" cy="40" r="1.2" fill="#fdfcf9" stroke="#3b0a45" strokeWidth="0.5"/>
        <rect x="13" y="39" width="14" height="0.9" fill="#3b0a45"/>
        <rect x="13" y="41" width="18" height="0.5" fill="#cbd5e1"/>
        <circle cx="9" cy="48" r="1.2" fill="#fdfcf9" stroke="#3b0a45" strokeWidth="0.5"/>
        <rect x="13" y="47" width="14" height="0.9" fill="#3b0a45"/>
        <rect x="13" y="49" width="18" height="0.5" fill="#cbd5e1"/>
      </svg>
    </div>
  )

  if (id === 'graduate') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fff"/>
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc6e3a"/>
            <stop offset="100%" stopColor="#b85b2e"/>
          </linearGradient>
        </defs>
        <rect width={W} height="20" fill="url(#grad1)"/>
        <rect x="3" y="6" width="18" height="2.5" fill="#fff"/>
        <rect x="3" y="11" width="12" height="1" fill="rgba(255,255,255,0.85)"/>
        <rect x="3" y="14" width="20" height="0.6" fill="rgba(255,255,255,0.7)"/>
        <circle cx="3.5" cy="25" r="0.8" fill="#dc6e3a"/>
        <rect x="6" y="24.5" width="10" height="1" fill="#dc6e3a"/>
        <rect x="3" y="29" width={W-6} height="8" rx="2" fill="#fef3eb" stroke="#dc6e3a" strokeWidth="0.3"/>
        <rect x="3" y="29" width="1.5" height="8" fill="#dc6e3a"/>
        <rect x="6" y="31" width="10" height="0.8" fill="#1f2937"/>
        <rect x="6" y="33" width="18" height="0.5" fill="#dc6e3a"/>
        <rect x="6" y="35" width="14" height="0.4" fill="#374151"/>
        <circle cx="3.5" cy="42" r="0.8" fill="#dc6e3a"/>
        <rect x="6" y="41.5" width="8" height="1" fill="#dc6e3a"/>
        <rect x="3" y="46" width="18" height="3" rx="1.5" fill="#fef3eb"/>
        <rect x="24" y="46" width="18" height="3" rx="1.5" fill="#fef3eb"/>
      </svg>
    </div>
  )

  if (id === 'europass') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fff"/>
        <rect x="0" y="0" width="17" height={H} fill="#1e3a8a"/>
        <rect x="2" y="4" width="13" height="1.8" fill="#fff"/>
        <rect x="2" y="7" width="9" height="0.8" fill="rgba(255,255,255,0.6)"/>
        <rect x="2" y="14" width="9" height="0.6" fill="rgba(255,255,255,0.4)"/>
        <rect x="2" y="16" width="11" height="0.5" fill="rgba(255,255,255,0.4)"/>
        <rect x="2" y="23" width="6" height="0.6" fill="#fff"/>
        <line x1="2" y1="25" x2="14" y2="25" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3"/>
        <rect x="2" y="27" width="11" height="0.4" fill="rgba(255,255,255,0.5)"/>
        <rect x="2" y="29" width="10" height="0.4" fill="rgba(255,255,255,0.5)"/>
        <rect x="2" y="31" width="9" height="0.4" fill="rgba(255,255,255,0.5)"/>
        <rect x="20" y="5" width="6" height="1" fill="#1e3a8a"/>
        <line x1="20" y1="7.5" x2="46" y2="7.5" stroke="#1e3a8a" strokeWidth="0.5"/>
        <rect x="20" y="10" width="22" height="0.5" fill="#cbd5e1"/>
        <rect x="20" y="12" width="20" height="0.5" fill="#cbd5e1"/>
        <rect x="20" y="14" width="22" height="0.5" fill="#cbd5e1"/>
        <rect x="20" y="20" width="8" height="0.8" fill="#1e3a8a"/>
        <line x1="20" y1="22" x2="46" y2="22" stroke="#1e3a8a" strokeWidth="0.5"/>
        <rect x="20" y="24.5" width="14" height="0.9" fill="#0f172a"/>
        <rect x="20" y="27" width="20" height="0.5" fill="#cbd5e1"/>
        <rect x="20" y="29" width="18" height="0.5" fill="#cbd5e1"/>
      </svg>
    </div>
  )

  if (id === 'noir') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fff"/>
        <rect x="0" y="0" width={W} height="20" fill="#0a0a0a"/>
        <rect x="3" y="6" width="22" height="3" fill="#fff"/>
        <rect x="3" y="11" width="14" height="1" fill="rgba(255,255,255,0.5)"/>
        <rect x="3" y="14" width="20" height="0.5" fill="rgba(255,255,255,0.6)"/>
        <rect x="3" y="24" width="8" height="1.2" fill="#0a0a0a"/>
        <line x1="3" y1="27" x2="46" y2="27" stroke="#e5e5e5" strokeWidth="0.5"/>
        <rect x="3" y="30" width="16" height="1" fill="#0a0a0a"/>
        <rect x="3" y="33" width="22" height="0.4" fill="#999"/>
        <rect x="3" y="35" width="20" height="0.4" fill="#999"/>
        <rect x="3" y="37" width="18" height="0.4" fill="#999"/>
        <rect x="3" y="43" width="8" height="1.2" fill="#0a0a0a"/>
        <line x1="3" y1="46" x2="46" y2="46" stroke="#e5e5e5" strokeWidth="0.5"/>
        <rect x="3" y="49" width="16" height="1" fill="#0a0a0a"/>
        <rect x="3" y="52" width="22" height="0.4" fill="#999"/>
        <rect x="3" y="54" width="20" height="0.4" fill="#999"/>
      </svg>
    </div>
  )

  if (id === 'london') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#faf8f5"/>
        <text x="25" y="9" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="5.5" fill="#1a1a1a">Name</text>
        <text x="25" y="13" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="2.6" fill="#666">title</text>
        <line x1="3" y1="17" x2="47" y2="17" stroke="#1a1a1a" strokeWidth="0.6"/>
        <text x="3" y="24" fontFamily="serif" fontWeight="700" fontSize="3.2" fill="#1a1a1a">SUMMARY</text>
        <line x1="3" y1="25.5" x2="20" y2="25.5" stroke="#1a1a1a" strokeWidth="0.4"/>
        <rect x="3" y="28" width="42" height="0.5" fill="#cbd5e1"/>
        <rect x="3" y="30" width="40" height="0.5" fill="#cbd5e1"/>
        <text x="3" y="38" fontFamily="serif" fontWeight="700" fontSize="3.2" fill="#1a1a1a">EXPERIENCE</text>
        <line x1="3" y1="39.5" x2="25" y2="39.5" stroke="#1a1a1a" strokeWidth="0.4"/>
        <rect x="3" y="42" width="14" height="1" fill="#1a1a1a"/>
        <rect x="3" y="44.5" width="20" height="0.4" fill="#999"/>
        <rect x="3" y="46.5" width="22" height="0.4" fill="#cbd5e1"/>
        <rect x="3" y="48.5" width="20" height="0.4" fill="#cbd5e1"/>
      </svg>
    </div>
  )

  if (id === 'nordic') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fff"/>
        <rect x="3" y="6" width="22" height="3" fill="#0a0a0a"/>
        <rect x="3" y="11" width="14" height="1" fill="#2563eb"/>
        <rect x="3" y="14" width="20" height="0.5" fill="#666"/>
        <rect x="3" y="20" width="10" height="1" fill="#2563eb"/>
        <line x1="3" y1="22.5" x2="47" y2="22.5" stroke="#2563eb" strokeWidth="0.6"/>
        <rect x="3" y="25" width="22" height="0.5" fill="#cbd5e1"/>
        <rect x="3" y="27" width="20" height="0.5" fill="#cbd5e1"/>
        <rect x="3" y="33" width="12" height="1" fill="#2563eb"/>
        <line x1="3" y1="35.5" x2="47" y2="35.5" stroke="#2563eb" strokeWidth="0.6"/>
        <rect x="3" y="38" width="14" height="1" fill="#0a0a0a"/>
        <rect x="3" y="40.5" width="10" height="0.5" fill="#2563eb"/>
        <rect x="4" y="43" width="20" height="0.4" fill="#999"/>
        <rect x="4" y="45" width="18" height="0.4" fill="#999"/>
        <rect x="3" y="50" width="14" height="1" fill="#0a0a0a"/>
        <rect x="4" y="52.5" width="18" height="0.4" fill="#999"/>
      </svg>
    </div>
  )

  if (id === 'classic') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fff"/>
        <text x="25" y="9" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="5" fill="#000">NAME</text>
        <text x="25" y="13" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="2.5" fill="#333">title</text>
        <line x1="3" y1="16" x2="47" y2="16" stroke="#000" strokeWidth="0.6"/>
        <text x="3" y="22" fontFamily="sans-serif" fontWeight="700" fontSize="2.8" fill="#000">SUMMARY</text>
        <line x1="3" y1="23.5" x2="47" y2="23.5" stroke="#000" strokeWidth="0.4"/>
        <rect x="3" y="26" width="42" height="0.4" fill="#666"/>
        <rect x="3" y="28" width="40" height="0.4" fill="#666"/>
        <text x="3" y="36" fontFamily="sans-serif" fontWeight="700" fontSize="2.8" fill="#000">EXPERIENCE</text>
        <line x1="3" y1="37.5" x2="47" y2="37.5" stroke="#000" strokeWidth="0.4"/>
        <rect x="3" y="40" width="14" height="0.9" fill="#000"/>
        <rect x="3" y="42.5" width="20" height="0.4" fill="#666"/>
        <rect x="3" y="44.5" width="22" height="0.4" fill="#999"/>
      </svg>
    </div>
  )

  if (id === 'academic') return (
    <div style={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fff"/>
        <text x="25" y="9" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="4.5" fill="#0a0a0a">Name</text>
        <text x="25" y="13" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="2.5" fill="#4a4a4a">title</text>
        <line x1="3" y1="17" x2="47" y2="17" stroke="#1a1a1a" strokeWidth="0.5"/>
        <text x="3" y="22" fontFamily="sans-serif" fontWeight="700" fontSize="2.6" fill="#1a1a1a">RESEARCH</text>
        <line x1="3" y1="23.5" x2="47" y2="23.5" stroke="#1a1a1a" strokeWidth="0.3"/>
        <rect x="3" y="26" width="42" height="0.4" fill="#666"/>
        <rect x="3" y="28" width="40" height="0.4" fill="#666"/>
        <text x="3" y="35" fontFamily="sans-serif" fontWeight="700" fontSize="2.6" fill="#1a1a1a">EDUCATION</text>
        <line x1="3" y1="36.5" x2="47" y2="36.5" stroke="#1a1a1a" strokeWidth="0.3"/>
        <rect x="3" y="39" width="16" height="0.9" fill="#0a0a0a"/>
        <rect x="3" y="41.5" width="20" height="0.4" fill="#666"/>
        <text x="3" y="48" fontFamily="sans-serif" fontWeight="700" fontSize="2.6" fill="#1a1a1a">PUBLICATIONS</text>
        <line x1="3" y1="49.5" x2="47" y2="49.5" stroke="#1a1a1a" strokeWidth="0.3"/>
      </svg>
    </div>
  )

  return <div style={wrap}><svg width={W} height={H}><rect width={W} height={H} fill="#eee"/></svg></div>
}

// ══════════════════════════════════════════════════════
// SIDEBAR UI
// ══════════════════════════════════════════════════════
function CategoryHeader({ children }: { children: string }) {
  return <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'1.8px', textTransform:'uppercase', color:'#0d9488', marginBottom:'4px', marginTop:'12px', paddingBottom:'6px', borderBottom:'1px solid #ccfbf1' }}>{children}</div>
}

function TemplateCard({ tpl, active, onClick }: { tpl: typeof TEMPLATES[0]; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'12px', borderRadius:'10px', border: active ? '2px solid #0d9488' : '2px solid transparent', background: active ? '#f0fdf9' : 'none', cursor:'pointer', marginBottom:'6px', transition:'all 0.2s' }}>
      <TemplateThumb id={tpl.id} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13px', fontWeight:600, color: active ? '#0d9488' : '#0a0f1a' }}>{tpl.name}</div>
        <div style={{ fontSize:'10px', color:'#94a3b8', marginTop:'2px', marginBottom:'5px' }}>{tpl.tag}</div>
        <div style={{
          display:'inline-block', fontSize:'8.5px', fontWeight:700, letterSpacing:'0.6px',
          padding:'2px 6px', borderRadius:'4px',
          background: tpl.formats === 'both' ? '#d1fae5' : '#fef3c7',
          color:      tpl.formats === 'both' ? '#065f46' : '#92400e'
        }}>
          {tpl.formats === 'both' ? 'PDF + WORD' : 'PDF ONLY'}
        </div>
      </div>
      {active && <span style={{ color:'#0d9488', fontSize:'14px', fontWeight:700, marginTop:'2px' }}>✓</span>}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SHARED HELPERS
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
    cv.dob && <span key="d" style={{ color, marginRight: sep, fontSize: '10pt', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>{cv.dob}
    </span>,
  ].filter(Boolean)
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 0' }}>{items}</div>
}

const A4_WRAPPER: React.CSSProperties = {
  width: '100%',
  display: 'grid',
  alignItems: 'start',
  fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
}

// ══════════════════════════════════════════════════════
// TEMPLATE DISPATCHER
// ══════════════════════════════════════════════════════
function CVPreview({ cv, templateId, accentColor }: { cv: GeneratedCV; templateId: TemplateId; accentColor: string | null }) {
  if (templateId === 'nordic')   return <NordicTemplate cv={cv} accent={accentColor || '#1a56c4'} />
  if (templateId === 'classic')  return <ClassicTemplate cv={cv} />
  if (templateId === 'academic') return <AcademicTemplate cv={cv} />
  if (templateId === 'europass') return <EuropassTemplate cv={cv} accent={accentColor || '#1e3a8a'} />
  if (templateId === 'newyork')  return <NewYorkTemplate cv={cv} accent={accentColor || '#a01e1e'} />
  if (templateId === 'atelier')  return <AtelierTemplate cv={cv} accent={accentColor || '#3b0a45'} />
  if (templateId === 'noir')     return <NoirTemplate cv={cv} />
  if (templateId === 'meridian') return <MeridianTemplate cv={cv} accent={accentColor || '#0a1f44'} />
  if (templateId === 'graduate') return <GraduateTemplate cv={cv} accent={accentColor || '#dc6e3a'} />
  return <LondonTemplate cv={cv} />
}

// helper: derive a slightly darker shade from accent
function darken(hex: string, amount = 0.18) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const dr = Math.max(0, Math.floor(r * (1 - amount)))
  const dg = Math.max(0, Math.floor(g * (1 - amount)))
  const db = Math.max(0, Math.floor(b * (1 - amount)))
  return `rgb(${dr}, ${dg}, ${db})`
}
function lighten(hex: string, alpha = 0.08) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ══════════════════════════════════════════════════════
// 1. LONDON
// ══════════════════════════════════════════════════════
function LondonTemplate({ cv }: { cv: GeneratedCV }) {
  const isLetter = !!cv.coverLetterBody
  const SH = ({ children }: { children: string }) => (
    <div style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '14pt', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1.5px solid #1a1a1a', paddingBottom: '4px', margin: '18px 0 10px' }}>{children}</div>
  )
  return (
    <div style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '11pt', lineHeight: 1.6, color: '#1a1a1a', background: '#faf8f5', padding: '40px 48px' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1a1a', paddingBottom: '14px', marginBottom: '18px' }}>
        <div style={{ fontSize: '26pt', fontWeight: 700, color: '#0a0a0a', lineHeight: 1.15, marginBottom: '4px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '13pt', fontStyle: 'italic', color: '#4a4a4a', marginBottom: '8px' }}>{cv.jobTitle}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}><ContactLine cv={cv} color="#444" /></div>
      </div>
      {isLetter
        ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '11pt', lineHeight: 1.7, marginBottom: '12px', textAlign: 'justify' }}>{p}</p>)
        : <>
          {cv.summary && <><SH>Professional Summary</SH><p style={{ fontSize: '11pt', lineHeight: 1.65, textAlign: 'justify' }}>{cv.summary}</p></>}
          {cv.experience?.length > 0 && <><SH>Professional Experience</SH>{cv.experience.map(e => (
            <div key={e.id} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '12pt', fontWeight: 700 }}>{e.role}</span>
                <span style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span>
              </div>
              <div style={{ fontSize: '11pt', fontStyle: 'italic', color: '#444', marginBottom: '4px' }}>{e.company}</div>
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '11pt', lineHeight: 1.55, marginBottom: '2px' }}>{b}</li>)}
              </ul>
            </div>
          ))}</>}
          {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '12pt', fontWeight: 700 }}>{ed.qualification} in {ed.field}</span>
                <span style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{ed.startYear} – {ed.endYear}</span>
              </div>
              <div style={{ fontSize: '11pt', fontStyle: 'italic', color: '#444' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
            </div>
          ))}</>}
          {cv.skills?.length > 0 && <><SH>Core Skills</SH><div style={{ fontSize: '11pt', lineHeight: 1.75 }}>{cv.skills.join('  •  ')}</div></>}
          {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ fontSize: '11pt', lineHeight: 1.75 }}>{cv.languages!.join('  •  ')}</div></>}
          {cv.additionalInfo && <><SH>Additional Information</SH><div style={{ fontSize: '11pt', lineHeight: 1.75 }}>{cv.additionalInfo}</div></>}
        </>
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 2. NORDIC (customizable)
// ══════════════════════════════════════════════════════
function NordicTemplate({ cv, accent }: { cv: GeneratedCV; accent: string }) {
  const isLetter = !!cv.coverLetterBody
  const SH = ({ children }: { children: string }) => (
    <div style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: '4px', margin: '18px 0 10px' }}>{children}</div>
  )
  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", fontSize: '10.5pt', lineHeight: 1.6, color: '#1a1a1a', background: '#ffffff', padding: '40px 48px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '24pt', fontWeight: 700, color: '#0a0a0a', lineHeight: 1.15, marginBottom: '4px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '12pt', color: accent, marginBottom: '8px' }}>{cv.jobTitle}</div>}
        <ContactLine cv={cv} color="#444" />
      </div>
      {isLetter
        ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '10.5pt', lineHeight: 1.7, marginBottom: '12px' }}>{p}</p>)
        : <>
          {cv.summary && <><SH>Profile</SH><p style={{ fontSize: '10.5pt', lineHeight: 1.7 }}>{cv.summary}</p></>}
          {cv.experience?.length > 0 && <><SH>Experience</SH>{cv.experience.map(e => (
            <div key={e.id} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '12pt', fontWeight: 700, color: '#0a0a0a' }}>{e.role}</span>
                <span style={{ fontSize: '10pt', color: '#666', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span>
              </div>
              <div style={{ fontSize: '11pt', color: accent, fontStyle: 'italic', marginBottom: '4px' }}>{e.company}</div>
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '10.5pt', lineHeight: 1.55, marginBottom: '2px' }}>{b}</li>)}
              </ul>
            </div>
          ))}</>}
          {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '11pt', fontWeight: 700 }}>{ed.qualification} in {ed.field}</span>
                <span style={{ fontSize: '10pt', color: '#666', whiteSpace: 'nowrap' }}>{ed.startYear} – {ed.endYear}</span>
              </div>
              <div style={{ fontSize: '10.5pt', color: accent, fontStyle: 'italic' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
            </div>
          ))}</>}
          {cv.skills?.length > 0 && <><SH>Skills</SH><div style={{ fontSize: '10.5pt', lineHeight: 1.75 }}>{cv.skills.join('  •  ')}</div></>}
          {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ fontSize: '10.5pt', lineHeight: 1.75 }}>{cv.languages!.join('  •  ')}</div></>}
          {cv.additionalInfo && <><SH>Additional Information</SH><div style={{ fontSize: '10.5pt', lineHeight: 1.75 }}>{cv.additionalInfo}</div></>}
        </>
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 3. CLASSIC
// ══════════════════════════════════════════════════════
function ClassicTemplate({ cv }: { cv: GeneratedCV }) {
  const isLetter = !!cv.coverLetterBody
  const SH = ({ children }: { children: string }) => (
    <div style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#000', borderBottom: '1.5px solid #000', paddingBottom: '3px', margin: '18px 0 10px' }}>{children}</div>
  )
  return (
    <div style={{ fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif", fontSize: '11pt', lineHeight: 1.6, color: '#000', background: '#ffffff', padding: '40px 48px' }}>
      <div style={{ textAlign: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1.5px solid #000' }}>
        <div style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '24pt', fontWeight: 700, color: '#000', lineHeight: 1.15, marginBottom: '4px', letterSpacing: '0.5px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '12pt', fontStyle: 'italic', color: '#333', marginBottom: '6px' }}>{cv.jobTitle}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}><ContactLine cv={cv} color="#333" /></div>
      </div>
      {isLetter
        ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '11pt', lineHeight: 1.7, marginBottom: '12px', textAlign: 'justify' }}>{p}</p>)
        : <>
          {cv.summary && <><SH>Professional Summary</SH><p style={{ fontSize: '11pt', lineHeight: 1.7, textAlign: 'justify' }}>{cv.summary}</p></>}
          {cv.experience?.length > 0 && <><SH>Professional Experience</SH>{cv.experience.map(e => (
            <div key={e.id} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '12pt', fontWeight: 700 }}>{e.role}</span>
                <span style={{ fontSize: '10pt', color: '#444', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span>
              </div>
              <div style={{ fontSize: '11pt', fontStyle: 'italic', color: '#333', marginBottom: '4px' }}>{e.company}</div>
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '11pt', lineHeight: 1.55, marginBottom: '2px' }}>{b}</li>)}
              </ul>
            </div>
          ))}</>}
          {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '11.5pt', fontWeight: 700 }}>{ed.qualification} in {ed.field}</span>
                <span style={{ fontSize: '10pt', color: '#444', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{ed.startYear} – {ed.endYear}</span>
              </div>
              <div style={{ fontSize: '11pt', fontStyle: 'italic', color: '#333' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
            </div>
          ))}</>}
          {cv.skills?.length > 0 && <><SH>Core Skills</SH><div style={{ fontSize: '11pt', lineHeight: 1.75 }}>{cv.skills.join('  •  ')}</div></>}
          {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ fontSize: '11pt', lineHeight: 1.75 }}>{cv.languages!.join('  •  ')}</div></>}
          {cv.additionalInfo && <><SH>Additional Information</SH><div style={{ fontSize: '11pt', lineHeight: 1.75 }}>{cv.additionalInfo}</div></>}
        </>
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 4. ACADEMIC
// ══════════════════════════════════════════════════════
function AcademicTemplate({ cv }: { cv: GeneratedCV }) {
  const SH = ({ children }: { children: string }) => (
    <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '10pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: '#1a1a1a', borderBottom: '1px solid #1a1a1a', paddingBottom: '3px', margin: '18px 0 10px' }}>{children}</div>
  )
  return (
    <div style={{ fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif", fontSize: '10.5pt', lineHeight: 1.65, color: '#1a1a1a', background: '#ffffff', padding: '40px 48px' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1a1a', paddingBottom: '18px', marginBottom: '22px' }}>
        <div style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '26pt', fontWeight: 700, color: '#0a0a0a', marginBottom: '5px', lineHeight: 1.15 }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '13pt', fontStyle: 'italic', color: '#4a4a4a', marginBottom: '10px' }}>{cv.jobTitle}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}><ContactLine cv={cv} color="#555" /></div>
      </div>
      {cv.summary && <><SH>Research Profile</SH><p style={{ fontSize: '10.5pt', lineHeight: 1.7, textAlign: 'justify' }}>{cv.summary}</p></>}
      {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
        <div key={ed.id} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '13pt', fontWeight: 700 }}>{ed.qualification} in {ed.field}</span>
            <span style={{ fontSize: '9pt', color: '#777', whiteSpace: 'nowrap', fontStyle: 'italic' }}>{ed.startYear} – {ed.endYear}</span>
          </div>
          <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#5a5a5a' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
        </div>
      ))}</>}
      {cv.experience?.length > 0 && <><SH>Academic & Professional Experience</SH>{cv.experience.map(e => (
        <div key={e.id} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: '13pt', fontWeight: 700 }}>{e.role}</span>
            <span style={{ fontSize: '9pt', color: '#777', whiteSpace: 'nowrap', fontStyle: 'italic' }}>{e.startDate} – {e.endDate}</span>
          </div>
          <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#4a4a4a', marginBottom: '5px' }}>{e.company}</div>
          <ul style={{ paddingLeft: '16px', margin: 0 }}>
            {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '10.5pt', lineHeight: 1.6, marginBottom: '3px' }}>{b}</li>)}
          </ul>
        </div>
      ))}</>}
      {cv.publications && cv.publications.length > 0 && <><SH>Publications</SH><ul style={{ paddingLeft: '16px', margin: 0 }}>{cv.publications.map((p, i) => <li key={i} style={{ fontSize: '10.5pt', lineHeight: 1.6, marginBottom: '4px' }}>{p}</li>)}</ul></>}
      {cv.skills?.length > 0 && <><SH>Research Methods & Skills</SH><div style={{ fontSize: '10.5pt', lineHeight: 1.8 }}>{cv.skills.join('  ·  ')}</div></>}
      {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ fontSize: '10.5pt', lineHeight: 1.8 }}>{cv.languages!.join('  ·  ')}</div></>}
      {cv.additionalInfo && <><SH>Honours, Awards & Memberships</SH><div style={{ fontSize: '10.5pt', lineHeight: 1.8 }}>{cv.additionalInfo}</div></>}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 5. EUROPASS PRO (customizable, no monogram)
// ══════════════════════════════════════════════════════
function EuropassTemplate({ cv, accent }: { cv: GeneratedCV; accent: string }) {
  const isLetter = !!cv.coverLetterBody
  const NAVY = accent

  if (isLetter) {
    return (
      <div style={{ fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif", fontSize: '10.5pt', lineHeight: 1.7, color: '#1e293b', padding: '40px 48px', background: 'white' }}>
        <div style={{ marginBottom: '24px', borderBottom: `3px solid ${NAVY}`, paddingBottom: '16px' }}>
          <div style={{ fontSize: '26pt', fontWeight: 700, color: NAVY, lineHeight: 1.15 }}>{cv.fullName}</div>
          {cv.jobTitle && <div style={{ fontSize: '13pt', color: '#475569', marginTop: '4px' }}>{cv.jobTitle}</div>}
          <div style={{ marginTop: '10px' }}><ContactLine cv={cv} color="#475569" /></div>
        </div>
        {cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ marginBottom: '14px', textAlign: 'justify' }}>{p}</p>)}
      </div>
    )
  }

  const SidebarH = ({ children }: { children: string }) => (
    <div style={{ fontSize: '9pt', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '2.5px', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '5px', marginBottom: '10px', marginTop: '22px' }}>{children}</div>
  )
  const MainH = ({ children }: { children: string }) => (
    <div style={{ fontSize: '11pt', fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '2.5px', borderBottom: `2px solid ${NAVY}`, paddingBottom: '4px', marginBottom: '12px', marginTop: '22px' }}>{children}</div>
  )

  return (
    <div style={{ ...A4_WRAPPER, gridTemplateColumns: '34% 66%', alignItems: 'start' }}>
      <div style={{ background: NAVY, color: 'white', padding: '40px 24px' }}>
        <div style={{ fontSize: '20pt', fontWeight: 700, lineHeight: 1.15, marginBottom: '6px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '11pt', color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', marginBottom: '6px' }}>{cv.jobTitle}</div>}

        <SidebarH>Contact</SidebarH>
        <div style={{ fontSize: '9.5pt', lineHeight: 1.65 }}>
          {cv.email && <div style={{ marginBottom: '5px', wordBreak: 'break-word' }}>{cv.email}</div>}
          {cv.phone && <div style={{ marginBottom: '5px' }}>{cv.phone}</div>}
          {cv.location && <div style={{ marginBottom: '5px' }}>{cv.location}</div>}
          {cv.linkedin && <div style={{ marginBottom: '5px', wordBreak: 'break-word' }}>{cv.linkedin}</div>}
          {cv.dob && <div style={{ marginBottom: '5px' }}>DOB: {cv.dob}</div>}
        </div>

        {cv.skills?.length > 0 && (<>
          <SidebarH>Skills</SidebarH>
          <div style={{ fontSize: '9.5pt', lineHeight: 1.7 }}>
            {cv.skills.map((s, i) => <div key={i} style={{ paddingLeft: '12px', position: 'relative', marginBottom: '4px' }}>
              <span style={{ position: 'absolute', left: 0, color: 'rgba(255,255,255,0.6)' }}>▪</span>{s}
            </div>)}
          </div>
        </>)}

        {cv.languages && cv.languages.length > 0 && (<>
          <SidebarH>Languages</SidebarH>
          <div style={{ fontSize: '9.5pt', lineHeight: 1.7 }}>
            {cv.languages!.map((l, i) => <div key={i} style={{ paddingLeft: '12px', position: 'relative', marginBottom: '4px' }}>
              <span style={{ position: 'absolute', left: 0, color: 'rgba(255,255,255,0.6)' }}>▪</span>{l}
            </div>)}
          </div>
        </>)}
      </div>

      <div style={{ padding: '40px 36px', background: 'white' }}>
        {cv.summary && (<>
          <MainH>Profile</MainH>
          <p style={{ fontSize: '10.5pt', lineHeight: 1.7, color: '#1e293b', textAlign: 'justify' }}>{cv.summary}</p>
        </>)}
        {cv.experience?.length > 0 && (<>
          <MainH>Work Experience</MainH>
          {cv.experience.map(e => (
            <div key={e.id} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '12pt', fontWeight: 700, color: '#0f172a' }}>{e.role}</span>
                <span style={{ fontSize: '9pt', color: NAVY, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{e.startDate} – {e.endDate}</span>
              </div>
              <div style={{ fontSize: '10.5pt', color: NAVY, fontStyle: 'italic', marginBottom: '6px' }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '10pt', lineHeight: 1.6, color: '#334155', marginBottom: '3px' }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>)}
        {cv.education?.length > 0 && (<>
          <MainH>Education</MainH>
          {cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '11pt', fontWeight: 700, color: '#0f172a' }}>{ed.qualification} in {ed.field}</span>
                <span style={{ fontSize: '9pt', color: NAVY, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{ed.startYear} – {ed.endYear}</span>
              </div>
              <div style={{ fontSize: '10.5pt', color: '#475569', fontStyle: 'italic' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
            </div>
          ))}
        </>)}
        {cv.additionalInfo && (<>
          <MainH>Additional</MainH>
          <div style={{ fontSize: '10pt', color: '#334155', lineHeight: 1.7 }}>{cv.additionalInfo}</div>
        </>)}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 6. NEW YORK (customizable)
// ══════════════════════════════════════════════════════
function NewYorkTemplate({ cv, accent }: { cv: GeneratedCV; accent: string }) {
  const isLetter = !!cv.coverLetterBody
  const CRIMSON = accent
  const INK = '#0a0a0a'
  const SH = ({ children }: { children: string }) => (
    <div style={{ background: CRIMSON, color: 'white', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: '11pt', textTransform: 'uppercase', letterSpacing: '3px', padding: '6px 14px', margin: '22px 0 14px' }}>{children}</div>
  )
  return (
    <div style={{ fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif", fontSize: '10.5pt', lineHeight: 1.6, color: INK, background: '#ffffff' }}>
      <div style={{ padding: '40px 48px 20px', borderBottom: `4px double ${CRIMSON}` }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '30pt', fontWeight: 900, color: INK, letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '6px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '14pt', color: CRIMSON, marginBottom: '14px', fontWeight: 500 }}>{cv.jobTitle}</div>}
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
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '13pt', fontWeight: 700, color: INK }}>{e.role}</span>
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
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '12pt', fontWeight: 700, color: INK }}>{ed.qualification} in {ed.field}</span>
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
// 7. ATELIER (customizable, no monogram)
// ══════════════════════════════════════════════════════
function AtelierTemplate({ cv, accent }: { cv: GeneratedCV; accent: string }) {
  const isLetter = !!cv.coverLetterBody
  const PLUM = accent
  const PLUM_SOFT = darken(accent, -0.3) // lighter version
  const SH = ({ children }: { children: string }) => (
    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '15pt', fontWeight: 600, color: PLUM, margin: '22px 0 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span>{children}</span>
      <span style={{ flex: 1, height: '1px', background: `linear-gradient(to right, ${PLUM_SOFT}, transparent)` }} />
    </div>
  )
  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '11pt', lineHeight: 1.65, color: '#2a1a2e', background: '#fdfcf9', padding: '40px 48px' }}>
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '30pt', fontWeight: 700, fontStyle: 'italic', color: PLUM, letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '4px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '12pt', color: PLUM_SOFT, marginBottom: '10px', fontStyle: 'italic' }}>{cv.jobTitle}</div>}
        <ContactLine cv={cv} color="#5a4a5e" />
      </div>
      {isLetter
        ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '11pt', lineHeight: 1.85, color: '#2a1a2e', marginBottom: '14px', textAlign: 'justify' }}>{p}</p>)
        : <>
          {cv.summary && <><SH>Profile</SH><p style={{ fontSize: '11pt', lineHeight: 1.8, color: '#3a2a3e', textAlign: 'justify', fontStyle: 'italic' }}>{cv.summary}</p></>}
          {cv.experience?.length > 0 && <><SH>Experience</SH>
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div style={{ position: 'absolute', left: '7px', top: '6px', bottom: '6px', width: '0', borderLeft: `1px dashed ${PLUM_SOFT}` }} />
              {cv.experience.map(e => (
                <div key={e.id} style={{ marginBottom: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-24px', top: '6px', width: '14px', height: '14px', borderRadius: '50%', background: '#fdfcf9', border: `2px solid ${PLUM}`, boxSizing: 'border-box' }} />
                  <div style={{ fontSize: '9.5pt', color: PLUM, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>{e.startDate} – {e.endDate}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '13pt', fontWeight: 700, color: '#1a0a1e', marginBottom: '2px' }}>{e.role}</div>
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
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '12pt', fontWeight: 700, color: '#1a0a1e' }}>{ed.qualification} in {ed.field}</span>
                <span style={{ fontSize: '9.5pt', color: PLUM, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '1px' }}>{ed.startYear} – {ed.endYear}</span>
              </div>
              <div style={{ fontSize: '11pt', color: PLUM_SOFT, fontStyle: 'italic' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
            </div>
          ))}</>}
          {cv.skills?.length > 0 && <><SH>Skills</SH>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px' }}>
              {cv.skills.map((s, i) => <span key={i} style={{ fontSize: '10pt', color: PLUM, border: `1px solid ${PLUM_SOFT}`, padding: '3px 10px', borderRadius: '14px', background: lighten(PLUM, 0.04) }}>{s}</span>)}
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
// 8. NOIR
// ══════════════════════════════════════════════════════
function NoirTemplate({ cv }: { cv: GeneratedCV }) {
  const isLetter = !!cv.coverLetterBody
  const SH = ({ children }: { children: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '22px 0 12px' }}>
      <span style={{ width: '4px', height: '14px', background: '#0a0a0a' }} />
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '11pt', letterSpacing: '2px', textTransform: 'uppercase', color: '#0a0a0a' }}>{children}</div>
      <div style={{ flex: 1, height: '1px', background: '#e5e5e5' }} />
    </div>
  )
  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", fontSize: '10.5pt', lineHeight: 1.6, color: '#1a1a1a', background: '#ffffff' }}>
      <div style={{ background: '#0a0a0a', color: 'white', padding: '36px 48px 28px' }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '28pt', fontWeight: 800, color: 'white', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '6px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '12pt', color: '#a3a3a3', fontWeight: 400, letterSpacing: '0.5px', marginBottom: '12px' }}>{cv.jobTitle}</div>}
        <ContactLine cv={cv} color="#d4d4d4" />
      </div>

      <div style={{ padding: '24px 48px 40px' }}>
        {isLetter
          ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ fontSize: '10.5pt', lineHeight: 1.75, color: '#1a1a1a', marginBottom: '14px', textAlign: 'justify' }}>{p}</p>)
          : <>
            {cv.summary && <><SH>Profile</SH><p style={{ fontSize: '10.5pt', lineHeight: 1.75, color: '#1a1a1a', textAlign: 'justify' }}>{cv.summary}</p></>}

            {cv.experience?.length > 0 && <><SH>Experience</SH>{cv.experience.map(e => (
              <div key={e.id} style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12pt', fontWeight: 700, color: '#0a0a0a' }}>{e.role}</span>
                  <span style={{ fontSize: '9.5pt', color: '#666', whiteSpace: 'nowrap', fontWeight: 500 }}>{e.startDate} – {e.endDate}</span>
                </div>
                <div style={{ fontSize: '11pt', fontWeight: 500, color: '#404040', marginBottom: '6px' }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '10.5pt', lineHeight: 1.6, color: '#1a1a1a', marginBottom: '3px' }}>{b}</li>)}
                </ul>
              </div>
            ))}</>}

            {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ fontSize: '11.5pt', fontWeight: 700, color: '#0a0a0a' }}>{ed.qualification} in {ed.field}</span>
                  <span style={{ fontSize: '9.5pt', color: '#666', whiteSpace: 'nowrap', fontWeight: 500 }}>{ed.startYear} – {ed.endYear}</span>
                </div>
                <div style={{ fontSize: '10.5pt', color: '#404040', fontWeight: 500 }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
              </div>
            ))}</>}

            {cv.skills?.length > 0 && <><SH>Skills</SH>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cv.skills.map((s, i) => <span key={i} style={{ fontSize: '9.5pt', color: '#0a0a0a', background: '#f5f5f5', padding: '4px 10px', borderRadius: '4px', fontWeight: 500, border: '1px solid #e5e5e5' }}>{s}</span>)}
              </div>
            </>}
            {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH><div style={{ fontSize: '10.5pt', color: '#1a1a1a', lineHeight: 1.8 }}>{cv.languages!.join('  ·  ')}</div></>}
            {cv.additionalInfo && <><SH>Additional</SH><div style={{ fontSize: '10.5pt', color: '#1a1a1a', lineHeight: 1.8 }}>{cv.additionalInfo}</div></>}
          </>
        }
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 9. MERIDIAN (customizable, no monogram)
// ══════════════════════════════════════════════════════
function MeridianTemplate({ cv, accent }: { cv: GeneratedCV; accent: string }) {
  const isLetter = !!cv.coverLetterBody
  const NAVY = accent
  const GOLD = '#c9a449'

  if (isLetter) {
    return (
      <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: '10.5pt', lineHeight: 1.7, color: '#1e293b', padding: '40px 48px', background: 'white', borderTop: `6px solid ${GOLD}` }}>
        <div style={{ marginBottom: '24px', paddingBottom: '14px', borderBottom: `1px solid ${GOLD}` }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '26pt', fontWeight: 700, color: NAVY, lineHeight: 1.15 }}>{cv.fullName}</div>
          {cv.jobTitle && <div style={{ fontSize: '13pt', color: GOLD, marginTop: '4px', fontStyle: 'italic' }}>{cv.jobTitle}</div>}
          <div style={{ marginTop: '10px' }}><ContactLine cv={cv} color="#475569" /></div>
        </div>
        {cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ marginBottom: '14px', textAlign: 'justify' }}>{p}</p>)}
      </div>
    )
  }

  const SidebarH = ({ children }: { children: string }) => (
    <div style={{ fontSize: '9pt', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '8px', marginTop: '22px' }}>{children}</div>
  )
  const MainH = ({ children }: { children: string }) => (
    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '13pt', fontWeight: 700, color: NAVY, marginBottom: '12px', marginTop: '22px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ width: '24px', height: '2px', background: GOLD }} />
      <span>{children}</span>
    </div>
  )

  return (
    <div style={{ ...A4_WRAPPER, gridTemplateColumns: '36% 64%', alignItems: 'start' }}>
      <div style={{ background: NAVY, color: 'white', padding: '40px 26px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: GOLD }} />
        <div style={{ marginTop: '8px', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22pt', fontWeight: 700, lineHeight: 1.15, marginBottom: '4px' }}>{cv.fullName}</div>
          <div style={{ width: '40px', height: '2px', background: GOLD, marginTop: '8px', marginBottom: '8px' }} />
          {cv.jobTitle && <div style={{ fontSize: '11pt', color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', letterSpacing: '0.5px' }}>{cv.jobTitle}</div>}
        </div>

        <SidebarH>Contact</SidebarH>
        <div style={{ fontSize: '9.5pt', lineHeight: 1.7, color: 'rgba(255,255,255,0.92)' }}>
          {cv.email && <div style={{ marginBottom: '4px', wordBreak: 'break-word' }}>{cv.email}</div>}
          {cv.phone && <div style={{ marginBottom: '4px' }}>{cv.phone}</div>}
          {cv.location && <div style={{ marginBottom: '4px' }}>{cv.location}</div>}
          {cv.linkedin && <div style={{ marginBottom: '4px', wordBreak: 'break-word' }}>{cv.linkedin}</div>}
          {cv.dob && <div style={{ marginBottom: '4px' }}>DOB: {cv.dob}</div>}
        </div>

        {cv.skills?.length > 0 && (<>
          <SidebarH>Core Competencies</SidebarH>
          <div style={{ fontSize: '9.5pt', lineHeight: 1.7, color: 'rgba(255,255,255,0.92)' }}>
            {cv.skills.map((s, i) => (
              <div key={i} style={{ paddingLeft: '14px', position: 'relative', marginBottom: '4px' }}>
                <span style={{ position: 'absolute', left: 0, color: GOLD, fontSize: '8pt', top: '3px' }}>◆</span>{s}
              </div>
            ))}
          </div>
        </>)}

        {cv.languages && cv.languages.length > 0 && (<>
          <SidebarH>Languages</SidebarH>
          <div style={{ fontSize: '9.5pt', lineHeight: 1.7, color: 'rgba(255,255,255,0.92)' }}>
            {cv.languages!.map((l, i) => <div key={i} style={{ paddingLeft: '14px', position: 'relative', marginBottom: '4px' }}>
              <span style={{ position: 'absolute', left: 0, color: GOLD, fontSize: '8pt', top: '3px' }}>◆</span>{l}
            </div>)}
          </div>
        </>)}

        {cv.additionalInfo && (<>
          <SidebarH>Additional</SidebarH>
          <div style={{ fontSize: '9.5pt', lineHeight: 1.7, color: 'rgba(255,255,255,0.92)' }}>{cv.additionalInfo}</div>
        </>)}
      </div>

      <div style={{ padding: '40px 36px', background: 'white' }}>
        {cv.summary && (<>
          <MainH>Executive Summary</MainH>
          <p style={{ fontSize: '10.5pt', lineHeight: 1.75, color: '#1e293b', textAlign: 'justify' }}>{cv.summary}</p>
        </>)}
        {cv.experience?.length > 0 && (<>
          <MainH>Professional Experience</MainH>
          {cv.experience.map(e => (
            <div key={e.id} style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '12pt', fontWeight: 700, color: NAVY }}>{e.role}</span>
                <span style={{ fontSize: '9.5pt', color: GOLD, fontWeight: 600, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span>
              </div>
              <div style={{ fontSize: '10.5pt', color: '#475569', fontStyle: 'italic', marginBottom: '6px' }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: '16px', listStyle: 'none' }}>
                {e.bullets.map((b, i) => (
                  <li key={i} style={{ fontSize: '10pt', lineHeight: 1.6, color: '#334155', marginBottom: '3px', paddingLeft: '14px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: GOLD, fontSize: '8pt', top: '3px' }}>◆</span>{b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>)}
        {cv.education?.length > 0 && (<>
          <MainH>Education</MainH>
          {cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '11.5pt', fontWeight: 700, color: NAVY }}>{ed.qualification} in {ed.field}</span>
                <span style={{ fontSize: '9.5pt', color: GOLD, fontWeight: 600, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{ed.startYear} – {ed.endYear}</span>
              </div>
              <div style={{ fontSize: '10.5pt', color: '#475569', fontStyle: 'italic' }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
            </div>
          ))}
        </>)}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 10. GRADUATE (customizable, no monogram)
// ══════════════════════════════════════════════════════
function GraduateTemplate({ cv, accent }: { cv: GeneratedCV; accent: string }) {
  const isLetter = !!cv.coverLetterBody
  const CORAL = accent
  const CORAL_DARK = darken(accent, 0.15)
  const CORAL_SOFT = lighten(accent, 0.1)
  const INK = '#1f2937'
  const SH = ({ children }: { children: string }) => (
    <div style={{ fontSize: '11pt', fontWeight: 700, color: CORAL, textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: '12px', marginTop: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CORAL }} />
      <span>{children}</span>
      <span style={{ flex: 1, height: '2px', background: `linear-gradient(to right, ${CORAL}, transparent)` }} />
    </div>
  )

  return (
    <div style={{ fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif", fontSize: '10.5pt', lineHeight: 1.65, color: INK, background: '#ffffff' }}>
      <div style={{ background: `linear-gradient(135deg, ${CORAL} 0%, ${CORAL_DARK} 100%)`, color: 'white', padding: '36px 48px' }}>
        <div style={{ fontSize: '28pt', fontWeight: 800, lineHeight: 1.1, marginBottom: '6px', letterSpacing: '-0.5px' }}>{cv.fullName}</div>
        {cv.jobTitle && <div style={{ fontSize: '13pt', color: 'rgba(255,255,255,0.95)', marginBottom: '14px', fontWeight: 500 }}>{cv.jobTitle}</div>}
        <ContactLine cv={cv} color="rgba(255,255,255,0.95)" />
      </div>

      <div style={{ padding: '20px 48px 40px' }}>
        {isLetter
          ? cv.coverLetterBody!.split('\n\n').map((p, i) => <p key={i} style={{ marginBottom: '14px', color: '#374151', lineHeight: 1.75 }}>{p}</p>)
          : <>
            {cv.summary && <><SH>About Me</SH><p style={{ fontSize: '10.5pt', lineHeight: 1.75, color: '#374151' }}>{cv.summary}</p></>}
            {cv.experience?.length > 0 && <><SH>Experience</SH>{cv.experience.map(e => (
              <div key={e.id} style={{ marginBottom: '14px', padding: '14px 16px', background: CORAL_SOFT, borderRadius: '10px', borderLeft: `4px solid ${CORAL}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12pt', fontWeight: 700, color: INK }}>{e.role}</span>
                  <span style={{ fontSize: '9.5pt', color: CORAL_DARK, fontWeight: 700, whiteSpace: 'nowrap' }}>{e.startDate} – {e.endDate}</span>
                </div>
                <div style={{ fontSize: '10.5pt', color: CORAL_DARK, fontWeight: 600, marginBottom: '6px' }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {e.bullets.map((b, i) => <li key={i} style={{ fontSize: '10pt', lineHeight: 1.6, color: '#374151', marginBottom: '3px' }}>{b}</li>)}
                </ul>
              </div>
            ))}</>}
            {cv.education?.length > 0 && <><SH>Education</SH>{cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: '10px', paddingLeft: '14px', borderLeft: `4px solid ${CORAL}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ fontSize: '11pt', fontWeight: 700, color: INK }}>{ed.qualification} in {ed.field}</span>
                  <span style={{ fontSize: '9.5pt', color: CORAL_DARK, fontWeight: 700, whiteSpace: 'nowrap' }}>{ed.startYear} – {ed.endYear}</span>
                </div>
                <div style={{ fontSize: '10.5pt', color: '#6b7280', fontWeight: 500 }}>{ed.institution}{ed.grade ? ` — ${ed.grade}` : ''}</div>
              </div>
            ))}</>}
            {cv.skills?.length > 0 && <><SH>Skills</SH>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {cv.skills.map((s, i) => (
                  <div key={i} style={{ fontSize: '10pt', color: INK, padding: '6px 12px', background: CORAL_SOFT, borderRadius: '20px', borderLeft: `3px solid ${CORAL}`, fontWeight: 500 }}>{s}</div>
                ))}
              </div>
            </>}
            {cv.languages && cv.languages.length > 0 && <><SH>Languages</SH>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {cv.languages!.map((l, i) => <span key={i} style={{ fontSize: '10pt', color: 'white', background: CORAL, padding: '4px 14px', borderRadius: '20px', fontWeight: 600 }}>{l}</span>)}
              </div>
            </>}
            {cv.additionalInfo && <><SH>Additional</SH><div style={{ fontSize: '10pt', color: '#374151', lineHeight: 1.7 }}>{cv.additionalInfo}</div></>}
          </>
        }
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// EDITOR — with Add/Remove buttons + DOB
// ══════════════════════════════════════════════════════
function CVEditor({ cv, updateCV }: { cv: GeneratedCV; updateCV: (p: Partial<GeneratedCV>) => void }) {

  function addExperience() {
    const newExp = {
      id: `exp_${Date.now()}`,
      role: '',
      company: '',
      startDate: '',
      endDate: '',
      bullets: ['']
    }
    updateCV({ experience: [...(cv.experience || []), newExp] })
  }

  function removeExperience(idx: number) {
    if (!confirm('Remove this experience entry?')) return
    updateCV({ experience: cv.experience.filter((_, i) => i !== idx) })
  }

  function addEducation() {
    const newEd = {
      id: `ed_${Date.now()}`,
      qualification: '',
      field: '',
      institution: '',
      grade: '',
      startYear: '',
      endYear: ''
    }
    updateCV({ education: [...(cv.education || []), newEd] })
  }

  function removeEducation(idx: number) {
    if (!confirm('Remove this education entry?')) return
    updateCV({ education: cv.education.filter((_, i) => i !== idx) })
  }

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
          <Inp label="Date of Birth (optional)" value={cv.dob || ''} onChange={v => updateCV({ dob: v })} />
        </Grid>
      </Sec>

      {(cv.summary !== undefined || cv.coverLetterBody) && (
        <Sec title={cv.coverLetterBody ? 'Cover Letter' : 'Summary'}>
          <TA value={cv.coverLetterBody || cv.summary} rows={cv.coverLetterBody ? 12 : 5}
            onChange={v => cv.coverLetterBody ? updateCV({ coverLetterBody: v }) : updateCV({ summary: v })} />
        </Sec>
      )}

      {!cv.coverLetterBody && (
        <Sec title="Experience" action={<AddBtn onClick={addExperience}>+ Add Experience</AddBtn>}>
          {cv.experience?.length === 0 || !cv.experience ? (
            <div style={{ fontSize:'13px', color:'#94a3b8', fontStyle:'italic', padding:'8px 0' }}>No experience yet. Click + to add one.</div>
          ) : cv.experience.map((exp, idx) => (
            <div key={exp.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '10px', position:'relative' }}>
              <RemoveBtn onClick={() => removeExperience(idx)} />
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

      {!cv.coverLetterBody && (
        <Sec title="Education" action={<AddBtn onClick={addEducation}>+ Add Education</AddBtn>}>
          {cv.education?.length === 0 || !cv.education ? (
            <div style={{ fontSize:'13px', color:'#94a3b8', fontStyle:'italic', padding:'8px 0' }}>No education yet. Click + to add one.</div>
          ) : cv.education.map((ed, idx) => (
            <div key={ed.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '10px', position:'relative' }}>
              <RemoveBtn onClick={() => removeEducation(idx)} />
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

      {cv.skills && (
        <Sec title="Skills">
          <TA value={cv.skills.join(', ')} rows={3}
            onChange={v => updateCV({ skills: v.split(',').map(s=>s.trim()).filter(Boolean) })} />
          <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'6px' }}>Separate skills with commas</div>
        </Sec>
      )}

      {cv.languages !== undefined && (
        <Sec title="Languages">
          <TA value={(cv.languages || []).join(', ')} rows={2}
            onChange={v => updateCV({ languages: v.split(',').map(s=>s.trim()).filter(Boolean) })} />
          <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'6px' }}>Separate languages with commas</div>
        </Sec>
      )}

      <Sec title="Additional Information (optional)">
        <TA value={cv.additionalInfo || ''} rows={3}
          onChange={v => updateCV({ additionalInfo: v })} />
        <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'6px' }}>Certifications, NSS, awards, hobbies, references, etc.</div>
      </Sec>
    </div>
  )
}

function Sec({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:'14px', padding:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
        <div style={{ fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:'#0d9488' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}
function AddBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={{ padding:'6px 12px', background:'#f0fdf9', color:'#0d9488', border:'1px solid #5eead4', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>{children}</button>
}
function RemoveBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} style={{ position:'absolute', top:'10px', right:'10px', width:'24px', height:'24px', borderRadius:'50%', background:'#fee2e2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }} title="Remove">×</button>
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
