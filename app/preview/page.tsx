'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratedCV, TemplateId, ExportFormat } from '@/types'
import CVPreview from '@/components/CVPreview'

// ══════════════════════════════════════════════════════
// TEMPLATE LIBRARY — Premium first, then ATS, then Academic
// ══════════════════════════════════════════════════════
type Formats = 'both' | 'pdf'
type Category = 'ats' | 'premium' | 'academic'

const TEMPLATES: { id: TemplateId; name: string; tag: string; color: string; formats: Formats; category: Category; customizable: boolean }[] = [
  // 💎 Premium — perfect in BOTH PDF and Word
  { id: 'vertex',    name: 'Vertex',    tag: 'Bold · Colour Rail · Two-Column', color: '#e0533d', formats: 'both', category: 'premium', customizable: true  },
  { id: 'sovereign', name: 'Sovereign', tag: 'Prestige · Crest · Centered',     color: '#b08d3f', formats: 'both', category: 'premium', customizable: true  },
  { id: 'meridian',  name: 'Meridian',  tag: 'Teal Sidebar · Modern',           color: '#0d9488', formats: 'both', category: 'premium', customizable: true  },
  { id: 'ascend',    name: 'Ascend',    tag: 'Corporate · Colour Bars',         color: '#1d4ed8', formats: 'both', category: 'premium', customizable: true  },
  { id: 'harbour',   name: 'Harbour',   tag: 'Editorial · Refined Serif',       color: '#0f766e', formats: 'both', category: 'premium', customizable: true  },
  { id: 'pulse',     name: 'Pulse',     tag: 'Modern · Dark Sidebar · Pill',    color: '#6d4aff', formats: 'both', category: 'premium', customizable: true  },

  // 🔵 ATS — PDF + Word, recruiter-safe minimal
  { id: 'classic',  name: 'Classic',   tag: 'Traditional · ATS Safe',          color: '#1f2937', formats: 'both', category: 'ats',     customizable: false },
  { id: 'london',   name: 'London',     tag: 'Clean · Single Column',          color: '#1a3a5a', formats: 'both', category: 'ats',     customizable: false },

  // 🎓 Academic — only shows for academic CV type
  { id: 'academic', name: 'Academic',   tag: 'Scholarly · Structured',         color: '#374151', formats: 'both', category: 'academic', customizable: false },
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
  const [cvType, setCvType] = useState<string>('professional')
  const [pdfOnlyModal, setPdfOnlyModal] = useState(false)
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showRevision, setShowRevision] = useState(false)
  const [revisionText, setRevisionText] = useState('')
  const [freeRevisionUsed, setFreeRevisionUsed] = useState(false)
  const [isRevising, setIsRevising] = useState(false)
  const [revisionError, setRevisionError] = useState('')
  const [showUpsell, setShowUpsell] = useState(false)
  const [hasDownloaded, setHasDownloaded] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('swiftcv_cv')
    const ph = sessionStorage.getItem('swiftcv_phone')
    if (!stored) { router.push('/build'); return }
    try {
      const parsed = JSON.parse(stored)
      setCV(parsed)
      setPhone(ph || '')
      const storedCvType = sessionStorage.getItem('swiftcv_type') || 'professional'
      setCvType(storedCvType)
      if (storedCvType === 'cover_letter' || parsed.coverLetterBody) setIsCoverLetter(true)
      if (storedCvType === 'academic') { setIsAcademicCV(true); setTemplate('academic') }
      if (storedCvType === 'cover_letter') setTemplate('classic')
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
      setHasDownloaded(true)
      setTimeout(() => setShowUpsell(true), 2000)
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch { alert('Download failed. Please try again.') }
    finally { setDownloading(null) }
  }

  async function handleDownloadPdf() {
    if (!cv) return

    const printArea = document.getElementById('cv-print-area')
    if (!printArea) {
      alert('CV preview not found. Please try again.')
      return
    }

    setDownloading('pdf')

    try {
      const html = buildPdfHtml(printArea.outerHTML, template)

      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, fullName: cv.fullName }),
      })

      if (!res.ok) {
        const message = await res.text().catch(() => '')
        throw new Error(message || 'PDF download failed')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cv.fullName.replace(/\s+/g, '_')}_CV.pdf`
      setHasDownloaded(true)
      setTimeout(() => setShowUpsell(true), 2000)
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download failed:', error)
      alert('PDF download failed. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  function buildPdfHtml(cvMarkup: string, tplId: TemplateId) {
    // Sidebar templates bleed to the edge (margin 0); single-column get page breathing room
    const sidebarTemplates: TemplateId[] = ['meridian', 'pulse']
    const isSidebar = sidebarTemplates.includes(tplId)
    const pageMargin = isSidebar ? '0' : '14mm 0'
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${PRINT_FONTS_HREF}" />
  <style>
    @page { size: A4; margin: ${pageMargin}; }
    html, body {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 0;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    #cv-print-area {
      width: 210mm;
      max-width: 210mm;
      margin: 0;
      padding: 0;
      background: white;
    }
  </style>
</head>
<body>
  ${cvMarkup}
</body>
</html>`
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

  // ── Template filtering by CV type ──────────────────────
  const ACADEMIC_ALLOWED: TemplateId[] = ['classic', 'academic', 'sovereign', 'harbour', 'london']
  const COVER_LETTER_ALLOWED: TemplateId[] = ['classic', 'sovereign', 'harbour', 'london']

  const visibleTemplates = isCoverLetter
    ? TEMPLATES.filter(t => COVER_LETTER_ALLOWED.includes(t.id))
    : isAcademicCV
      ? TEMPLATES.filter(t => ACADEMIC_ALLOWED.includes(t.id))
      : TEMPLATES.filter(t => t.category === 'ats' || t.category === 'premium')

  const premiumTemplates = visibleTemplates.filter(t => t.category === 'premium')
  const atsTemplates = visibleTemplates.filter(t => t.category === 'ats' || t.category === 'academic')
  const academicTemplates = visibleTemplates.filter(t => t.category === 'academic')

  async function handleRevision() {
    if (!revisionText.trim()) { setRevisionError('Please describe what you would like changed.'); return }
    if (!cv) return
    if (freeRevisionUsed) {
      // Trigger GH₵5 payment
      const script = document.createElement('script')
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.onload = () => {
        const handler = (window as any).PaystackPop.setup({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
          email: `${phone.replace('+','')}@swiftcvpro.com`,
          amount: 500000, // GH₵5
          currency: 'GHS',
          ref: `rev_${Date.now()}`,
          callback: async () => { await doRevision() },
          onClose: () => {}
        })
        handler.openIframe()
      }
      document.body.appendChild(script)
      return
    }
    await doRevision()
  }

  async function doRevision() {
    if (!cv) return
    setIsRevising(true)
    setRevisionError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvType: sessionStorage.getItem('swiftcv_type') || 'professional',
          rawContent: JSON.stringify(cv),
          specialRequests: revisionText,
          isRevision: true,
          phoneNumber: phone,
          lockedName: cv.fullName,
        })
      })
      const data = await res.json()
      if (data.success && data.cv) {
        // Preserve locked name
        data.cv.fullName = cv.fullName
        sessionStorage.setItem('swiftcv_cv', JSON.stringify(data.cv))
        setCV(data.cv)
        setFreeRevisionUsed(true)
        setShowRevision(false)
        setRevisionText('')
      } else {
        setRevisionError('Something went wrong. Please try again.')
      }
    } catch {
      setRevisionError('Connection error. Please try again.')
    }
    setIsRevising(false)
  }

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
          <button onClick={handleNewCV} style={{ padding:'8px 14px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50px', fontSize:'12px', fontWeight:500, cursor:'pointer' }}>+ New CV</button>
          <button onClick={handleDownloadDocx} disabled={!!downloading} style={{ padding:'8px 16px', background: currentTpl?.formats === 'pdf' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)', color: currentTpl?.formats === 'pdf' ? 'rgba(255,255,255,0.5)' : 'white', border:'none', borderRadius:'50px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>{downloading==='docx'?'...':'↓ Word'}</button>
          <button onClick={handleDownloadPdf} disabled={!!downloading} style={{ padding:'8px 16px', background:'#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'13px', fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(13,148,136,0.3)' }}>{downloading==='pdf'?'...':'↓ PDF'}</button>
          <button onClick={() => setShowRevision(true)} style={{ padding:'8px 16px', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.92)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'50px', fontSize:'12px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}><span style={{ color:'#5eead4' }}>✦</span> Want changes? Edit free</button>
        </div>
      </nav>

      
      <div style={{ display:'grid', gridTemplateColumns: isCoverLetter ? '1fr' : '260px 1fr', minHeight:'calc(100vh - 57px)' }}>
        {!isCoverLetter && (
          <div className="no-print" style={{ background:'white', borderRight:'1px solid #e2e8f0', padding:'22px 20px', overflowY:'auto' }}>

            {/* ── COLOUR — always visible, premium ── */}
            {currentTpl?.customizable && (
              <div style={{ marginBottom:'22px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'#94a3b8', marginBottom:'12px' }}>Colour</div>
                <div style={{ display:'flex', gap:'9px', flexWrap:'wrap' }}>
                  <button onClick={() => setAccentColor(null)} title="Default" style={{ width:'26px', height:'26px', borderRadius:'50%', background: currentTpl.color, cursor:'pointer', padding:0, border:'none', boxShadow: accentColor === null ? `0 0 0 2px #fff, 0 0 0 4px ${currentTpl.color}` : '0 0 0 1px #e2e8f0', transition:'all 0.15s' }} />
                  {COLOR_SWATCHES.map(s => (
                    <button key={s.value} onClick={() => setAccentColor(s.value)} title={s.name} style={{ width:'26px', height:'26px', borderRadius:'50%', background: s.value, cursor:'pointer', padding:0, border:'none', boxShadow: accentColor === s.value ? `0 0 0 2px #fff, 0 0 0 4px ${s.value}` : '0 0 0 1px #e2e8f0', transition:'all 0.15s' }} />
                  ))}
                </div>
              </div>
            )}
            <div style={{ height:'1px', background:'#eef2f6', margin:'0 0 20px' }} />

            {/* PREMIUM SECTION FIRST */}
            {premiumTemplates.length > 0 && (<>
              <CategoryHeader>Premium</CategoryHeader>
              <div style={{ fontSize:'10px', color:'#cbd5e1', marginBottom:'12px', lineHeight:1.5 }}>Rich design · PDF &amp; Word</div>
              {premiumTemplates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} active={template===tpl.id} onClick={() => setTemplate(tpl.id)} />)}
            </>)}

            {/* ATS SECTION */}
            <CategoryHeader>ATS Templates</CategoryHeader>
            <div style={{ fontSize:'10px', color:'#cbd5e1', marginBottom:'12px', lineHeight:1.5 }}>Recruiter-safe · PDF &amp; Word</div>
            {atsTemplates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} active={template===tpl.id} onClick={() => setTemplate(tpl.id)} />)}

            {/* ACADEMIC SECTION */}
            {academicTemplates.length > 0 && (<>
              <CategoryHeader>Academic</CategoryHeader>
              <div style={{ fontSize:'10px', color:'#cbd5e1', marginBottom:'12px', lineHeight:1.5 }}>Scholarly · PDF &amp; Word</div>
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

        <div style={{ padding:'24px', overflowY:'auto', overflowX:'auto', background:'#f1f5f9' }}>
          {activeTab === 'preview' ? (
            <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'visible', boxShadow:'0 8px 40px rgba(0,0,0,0.1)', width:'210mm', maxWidth:'210mm', margin:'0 auto' }}>
              <div id="cv-print-area">
                <CVPreview cv={cv} templateId={template} accentColor={accentColor} />
              </div>
            </div>
          ) : (
            <CVEditor cv={cv} updateCV={updateCV} />
          )}
        </div>
      </div>

      {/* REVISION PANEL */}
      {showRevision && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:'20px 20px 0 0', padding:'28px 24px 36px', width:'100%', maxWidth:'600px', boxShadow:'0 -8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.4rem', fontWeight:600, color:'#0a0f1a' }}>What would you like changed?</div>
              <button onClick={() => setShowRevision(false)} style={{ background:'none', border:'none', fontSize:'20px', color:'#94a3b8', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'12px', fontStyle:'italic' }}>e.g. "Make the summary more confident" · "Add my KNUST degree" · "Remove date of birth"</div>
            <div style={{ fontSize:'11px', color:'#64748b', background: freeRevisionUsed ? '#fffbeb' : '#f0fdf9', border:`1px solid ${freeRevisionUsed ? 'rgba(245,158,11,0.3)' : 'rgba(13,148,136,0.2)'}`, borderRadius:'8px', padding:'8px 14px', marginBottom:'14px' }}>
              {freeRevisionUsed ? '⚠️ Your free revision has been used. This revision costs GH₵5.' : '✅ 1 free revision included.'}
            </div>
            <textarea value={revisionText} onChange={e => setRevisionText(e.target.value)} placeholder="Describe what you'd like changed..." style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #e2e8f0', borderRadius:'12px', fontFamily:"'DM Sans', sans-serif", fontSize:'14px', color:'#0a0f1a', resize:'none', lineHeight:1.7, minHeight:'100px', marginBottom:'8px' }} />
            {revisionError && <div style={{ fontSize:'12px', color:'#e24b4a', marginBottom:'10px' }}>{revisionError}</div>}
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={() => setShowRevision(false)} style={{ padding:'11px 22px', background:'white', border:'1px solid #e2e8f0', borderRadius:'50px', fontSize:'13px', fontWeight:500, color:'#64748b', cursor:'pointer' }}>Cancel</button>
              <button onClick={handleRevision} disabled={isRevising} style={{ padding:'11px 28px', background: freeRevisionUsed ? '#f59e0b' : '#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'13px', fontWeight:600, cursor:'pointer', opacity: isRevising ? 0.7 : 1 }}>
                {isRevising ? 'Regenerating...' : freeRevisionUsed ? 'Pay GH₵5 & Regenerate →' : 'Regenerate →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COVER LETTER UPSELL */}
      {showUpsell && !isCoverLetter && (
        <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:150, background:'white', borderRadius:'16px', padding:'18px 20px', boxShadow:'0 8px 40px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', maxWidth:'280px' }}>
          <button onClick={() => setShowUpsell(false)} style={{ position:'absolute', top:'10px', right:'12px', background:'none', border:'none', fontSize:'16px', color:'#94a3b8', cursor:'pointer' }}>✕</button>
          <div style={{ fontSize:'1.1rem', fontWeight:600, color:'#0a0f1a', fontFamily:"'Cormorant Garamond', serif", marginBottom:'6px' }}>Add a Cover Letter?</div>
          <div style={{ fontSize:'12px', color:'#64748b', lineHeight:1.6, marginBottom:'14px' }}>Tailored to a specific role using this CV. Instant delivery.</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#0a0f1a' }}>GH₵ 10</div>
            <button onClick={() => { setShowUpsell(false); window.location.href = '/build?type=cover_letter' }} style={{ padding:'9px 18px', background:'#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>Add Now →</button>
          </div>
        </div>
      )}

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
  const wrap: React.CSSProperties = { width: W, height: H, borderRadius: 4, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.12)', background: 'white', border: '1px solid #e2e8f0' }
  const lines = (x: number, y: number, w: number, n: number, gap = 2.6, c = '#cbd5e1') =>
    Array.from({ length: n }).map((_, i) => <rect key={i} x={x} y={y + i * gap} width={w} height="0.8" fill={c} rx="0.4" />)

  // VERTEX — colour rail + two columns
  if (id === 'vertex') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <rect x="0" y="0" width="4" height={H} fill="#e0533d" />
      <text x="9" y="11" fontFamily="sans-serif" fontWeight="800" fontSize="6" fill="#1c1c1c">NAME</text>
      <rect x="9" y="14" width="9" height="1.4" fill="#e0533d" />
      <rect x="9" y="20" width="6" height="1" fill="#1c1c1c" />{lines(9, 23, 18, 4)}
      <rect x="9" y="36" width="6" height="1" fill="#1c1c1c" />{lines(9, 39, 17, 3)}
      <rect x="31" y="20" width="6" height="1" fill="#1c1c1c" />{lines(31, 23, 14, 5)}
    </svg></div>
  )
  // SOVEREIGN — crest + centered
  if (id === 'sovereign') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fdfcfa" />
      <circle cx="25" cy="9" r="4" fill="none" stroke="#b08d3f" strokeWidth="0.8" />
      <text x="25" y="11" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="3" fill="#1a2238">WB</text>
      <text x="25" y="19" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="4.5" fill="#1a2238" letterSpacing="1">NAME</text>
      <line x1="6" y1="23" x2="44" y2="23" stroke="#b08d3f" strokeWidth="0.6" />
      <rect x="22" y="28" width="6" height="1" fill="#1a2238" />{lines(8, 32, 34, 3)}
      <rect x="8" y="42" width="6" height="1" fill="#1a2238" />{lines(8, 46, 34, 3)}
    </svg></div>
  )
  // MERIDIAN — teal sidebar, name in main
  if (id === 'meridian') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <rect x="0" y="0" width="17" height={H} fill="#0d9488" />
      <rect x="3" y="6" width="6" height="1" fill="#fff" opacity="0.9" />{lines(3, 9, 10, 3, 2.4, 'rgba(255,255,255,0.6)')}
      <rect x="3" y="20" width="6" height="1" fill="#fff" opacity="0.9" />{lines(3, 23, 11, 4, 2.4, 'rgba(255,255,255,0.6)')}
      <text x="21" y="10" fontFamily="serif" fontWeight="700" fontSize="5" fill="#1a1a1a">NAME</text>
      <rect x="21" y="13" width="10" height="1.2" fill="#0d9488" />{lines(21, 18, 24, 3)}
      <rect x="21" y="29" width="6" height="1" fill="#0d9488" />{lines(21, 32, 22, 4)}
    </svg></div>
  )
  // ASCEND — colour bar headings
  if (id === 'ascend') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <text x="4" y="11" fontFamily="sans-serif" fontWeight="800" fontSize="6" fill="#1a1a1a">NAME</text>
      <rect x="4" y="14" width="9" height="1.2" fill="#1d4ed8" />
      <rect x="4" y="20" width="42" height="3.5" fill="#1d4ed8" />{lines(4, 26, 40, 3)}
      <rect x="4" y="37" width="42" height="3.5" fill="#1d4ed8" />{lines(4, 43, 40, 3)}
    </svg></div>
  )
  // HARBOUR — tick headings, editorial
  if (id === 'harbour') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <rect x="4" y="6" width="2" height="9" fill="#0f766e" />
      <text x="9" y="11" fontFamily="serif" fontWeight="700" fontSize="6" fill="#1a2a2a">NAME</text>
      <text x="9" y="15" fontFamily="serif" fontStyle="italic" fontSize="3" fill="#0f766e">title</text>
      <line x1="4" y1="19" x2="46" y2="19" stroke="#d8e0e0" strokeWidth="0.6" />
      <rect x="4" y="23" width="2" height="3" fill="#0f766e" /><rect x="8" y="23" width="6" height="1" fill="#1a2a2a" />{lines(4, 28, 42, 3)}
      <rect x="4" y="40" width="2" height="3" fill="#0f766e" /><rect x="8" y="40" width="6" height="1" fill="#1a2a2a" />{lines(4, 45, 42, 3)}
    </svg></div>
  )
  // PULSE — dark sidebar right, pill title
  if (id === 'pulse') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <rect x="33" y="0" width="17" height={H} fill="#15131f" />
      <text x="4" y="11" fontFamily="sans-serif" fontWeight="800" fontSize="6" fill="#15131f">NAME</text>
      <rect x="4" y="14" width="14" height="3" rx="1.5" fill="#6d4aff" />
      <rect x="4" y="22" width="5" height="1" fill="#6d4aff" /><rect x="4" y="25" width="1" height="10" fill="#6d4aff" />{lines(7, 26, 22, 4)}
      <rect x="36" y="6" width="5" height="1" fill="#6d4aff" />{lines(36, 9, 11, 3, 2.4, 'rgba(255,255,255,0.6)')}
      <rect x="36" y="20" width="5" height="1" fill="#6d4aff" />{lines(36, 23, 10, 3, 2.4, 'rgba(255,255,255,0.6)')}
    </svg></div>
  )
  // LONDON — clean single column
  if (id === 'london') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <text x="4" y="11" fontFamily="serif" fontWeight="700" fontSize="6" fill="#1a3a5a">NAME</text>
      <line x1="4" y1="15" x2="46" y2="15" stroke="#1a3a5a" strokeWidth="1.2" />
      <rect x="4" y="20" width="7" height="1" fill="#1a3a5a" />{lines(4, 23, 42, 3)}
      <rect x="4" y="35" width="7" height="1" fill="#1a3a5a" />{lines(4, 38, 42, 3)}
    </svg></div>
  )
  // ACADEMIC — scholarly
  if (id === 'academic') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <text x="25" y="10" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="5" fill="#374151">NAME</text>
      <line x1="4" y1="14" x2="46" y2="14" stroke="#374151" strokeWidth="0.6" />
      <rect x="4" y="19" width="8" height="1" fill="#374151" />{lines(4, 22, 42, 4)}
      <rect x="4" y="36" width="8" height="1" fill="#374151" />{lines(4, 39, 42, 3)}
    </svg></div>
  )
  // CLASSIC (default) — centered minimal
  return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <text x="25" y="10" textAnchor="middle" fontFamily="sans-serif" fontWeight="700" fontSize="5" fill="#1f2937">NAME</text>
      <line x1="4" y1="14" x2="46" y2="14" stroke="#1f2937" strokeWidth="0.8" />
      <rect x="4" y="19" width="7" height="1" fill="#1f2937" />{lines(4, 22, 42, 4)}
      <rect x="4" y="36" width="7" height="1" fill="#1f2937" />{lines(4, 39, 42, 3)}
    </svg></div>
  )
}

// ══════════════════════════════════════════════════════
// SIDEBAR UI
// ══════════════════════════════════════════════════════
function CategoryHeader({ children }: { children: string }) {
  return <div style={{ fontSize:'9.5px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'#b0bccb', marginBottom:'2px', marginTop:'18px' }}>{children}</div>
}

function TemplateCard({ tpl, active, onClick }: { tpl: typeof TEMPLATES[0]; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'11px 12px', borderRadius:'12px', background: active ? '#f6fdfb' : 'none', boxShadow: active ? '0 0 0 1.5px #0d9488' : '0 0 0 1px transparent', cursor:'pointer', marginBottom:'7px', transition:'all 0.18s' }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#fafbfc' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'none' }}>
      <TemplateThumb id={tpl.id} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13px', fontWeight:600, color: active ? '#0d9488' : '#0a0f1a' }}>{tpl.name}</div>
        <div style={{ fontSize:'10px', color:'#94a3b8', marginTop:'2px', marginBottom:'5px' }}>{tpl.tag}</div>
        <div style={{
          display:'inline-block', fontSize:'8px', fontWeight:700, letterSpacing:'0.8px',
          padding:'2.5px 7px', borderRadius:'20px',
          background: tpl.formats === 'both' ? '#ecfdf5' : '#fffbeb',
          color:      tpl.formats === 'both' ? '#0d9488' : '#b45309'
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
