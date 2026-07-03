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

  // ✨ PDF-only premium — rich designs, PDF download only
  { id: 'onyx',      name: 'Onyx',      tag: 'Dark Header · Gold · Editorial',  color: '#c9a86a', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'sterling',  name: 'Sterling',  tag: 'Gold Executive · Navy Sidebar',   color: '#c9a86a', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'verde',     name: 'Verde',     tag: 'Green Header · Timeline · Cards',  color: '#3f9142', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'crimson',   name: 'Crimson',   tag: 'Magazine · Colour Band · Bold',   color: '#a01e1e', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'atlas',     name: 'Atlas',     tag: 'Timeline Rail · Dated · Modern',   color: '#3b82f6', formats: 'pdf',  category: 'premium', customizable: true  },
  { id: 'slate',     name: 'Slate',     tag: 'Minimal · Airy · Understated',    color: '#1a1a1a', formats: 'pdf',  category: 'premium', customizable: false },

  // 🔵 ATS — PDF + Word, recruiter-safe minimal
  { id: 'classic',  name: 'Classic',   tag: 'Traditional · ATS Safe',          color: '#1f2937', formats: 'both', category: 'ats',     customizable: false },

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

// ══════════════════════════════════════════════════════
// SANITISE MODEL OUTPUT — the AI returns JSON whose shape isn't
// guaranteed. Force arrays to be arrays and strings to be strings so
// no render path (e.bullets.map, fullName.split, etc.) can ever throw.
// ══════════════════════════════════════════════════════
function normalizeCV(raw: any): GeneratedCV {
  const arr = (v: any) => (Array.isArray(v) ? v : [])
  const str = (v: any) => (typeof v === 'string' ? v : v == null ? '' : String(v))
  return {
    ...raw,
    fullName: str(raw?.fullName),
    jobTitle: str(raw?.jobTitle),
    email: str(raw?.email),
    phone: str(raw?.phone),
    location: str(raw?.location),
    summary: str(raw?.summary),
    skills: arr(raw?.skills).map(str),
    languages: arr(raw?.languages).map(str),
    publications: arr(raw?.publications).map(str),
    research: arr(raw?.research).map(str),
    teaching: arr(raw?.teaching).map(str),
    education: arr(raw?.education).map((e: any) => ({
      ...e,
      qualification: str(e?.qualification),
      field: str(e?.field),
      institution: str(e?.institution),
      startYear: str(e?.startYear),
      endYear: str(e?.endYear),
    })),
    experience: arr(raw?.experience).map((e: any) => ({
      ...e,
      role: str(e?.role),
      company: str(e?.company),
      startDate: str(e?.startDate),
      endDate: str(e?.endDate),
      bullets: arr(e?.bullets).map(str),
    })),
  }
}

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
  const [showReadyBanner, setShowReadyBanner] = useState(true)
  const [showChooser, setShowChooser] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('swiftcv_cv')
    const ph = sessionStorage.getItem('swiftcv_phone')
    if (!stored) { router.push('/build'); return }
    try {
      const parsed = normalizeCV(JSON.parse(stored))
      setCV(parsed)
      setBaseCv(parsed)
      setPhone(ph || '')
      // Restore a cover letter generated earlier this session (if any)
      const storedCover = sessionStorage.getItem('swiftcv_coverletter')
      if (storedCover) { try { setCoverLetter(normalizeCV(JSON.parse(storedCover))) } catch {} }
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

  // Ready toast: pause the countdown while hovered (dismissal is driven by the
  // progress bar's animationEnd below, so there is a single clock).
  const [bannerPaused, setBannerPaused] = useState(false)

  // ── Cover letter (Stage 2) ──────────────────────────────────
  const [baseCv, setBaseCv] = useState<GeneratedCV | null>(null)          // always the CV, never the letter
  const [coverLetter, setCoverLetter] = useState<GeneratedCV | null>(null)
  const [activeDoc, setActiveDoc] = useState<'cv' | 'cover'>('cv')
  const [showCoverModal, setShowCoverModal] = useState(false)
  const [coverGenerating, setCoverGenerating] = useState(false)
  const [coverJd, setCoverJd] = useState('')
  const [coverErr, setCoverErr] = useState('')
  const [coverReadingFile, setCoverReadingFile] = useState(false)

  function updateCV(patch: Partial<GeneratedCV>) {
    if (!cv) return
    const updated = { ...cv, ...patch }
    setCV(updated)
    if (activeDoc === 'cover') {
      setCoverLetter(updated)
      sessionStorage.setItem('swiftcv_coverletter', JSON.stringify(updated))
    } else {
      setBaseCv(updated)
      sessionStorage.setItem('swiftcv_cv', JSON.stringify(updated))
    }
  }

  function showCvDoc() {
    if (!baseCv) return
    setActiveDoc('cv'); setCV(baseCv); setIsCoverLetter(false); setActiveTab('preview')
  }
  function showCoverDoc() {
    if (!coverLetter) return
    setActiveDoc('cover'); setCV(coverLetter); setIsCoverLetter(true); setActiveTab('preview')
  }

  async function readCoverFile(file: File) {
    setCoverReadingFile(true); setCoverErr('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/extract-content', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.text) { setCoverErr('Could not read that file. Try pasting the text instead.'); return }
      setCoverJd(data.text)
    } catch { setCoverErr('Could not read that file. Try pasting the text instead.') }
    finally { setCoverReadingFile(false) }
  }

  async function handleGenerateCover() {
    const source = baseCv || cv
    if (!source) return
    setCoverGenerating(true); setCoverErr('')
    try {
      const res = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: source, jobDescription: coverJd || undefined, phoneNumber: phone })
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'NO_CREDITS') setCoverErr('You\u2019ve used the free cover letter that came with this CV. Add a credit to generate another.')
        else setCoverErr(data.error || 'Generation failed. Please try again.')
        return
      }
      const letter = normalizeCV(data.coverLetter)
      setCoverLetter(letter)
      sessionStorage.setItem('swiftcv_coverletter', JSON.stringify(letter))
      setShowCoverModal(false); setCoverJd('')
      setActiveDoc('cover'); setCV(letter); setIsCoverLetter(true); setActiveTab('preview')
    } catch { setCoverErr('Network error. Please try again.') }
    finally { setCoverGenerating(false) }
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

  function buildPdfHtml(cvMarkup: string, _tplId: TemplateId) {
    // Multi-page engine: each page div is a self-contained A4 with its own sidebar.
    // @page margin is 0 — the page divs handle their own internal padding.
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${PRINT_FONTS_HREF}" />
  <style>
    @page { size: A4; margin: 0; }
    html, body {
      width: 210mm;
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
    ul { list-style-type: disc !important; }
    ul li { list-style: disc outside !important; display: list-item !important; }
    #cv-print-area {
      width: 210mm;
      max-width: 210mm;
      margin: 0;
      padding: 0;
      background: white;
    }
    /* each rendered page = one printed sheet */
    #cv-print-area > div > div {
      width: 210mm !important;
      height: 296mm;
      margin: 0 !important;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    #cv-print-area > div > div:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    /* never print any hidden measuring artifacts */
    [data-measure-pass] { display: none !important; }
    /* the continuous screen-only doc must never appear in the PDF */
    [data-screen-doc] { display: none !important; }
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
  const ACADEMIC_ALLOWED: TemplateId[] = ['classic', 'academic', 'sovereign', 'harbour']
  const COVER_LETTER_ALLOWED: TemplateId[] = ['classic', 'sovereign', 'harbour']

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
        const revised = normalizeCV(data.cv)
        sessionStorage.setItem('swiftcv_cv', JSON.stringify(revised))
        setCV(revised)
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

      {/* ── Redesign motion + polish (screen only) ── */}
      <style>{`
        @keyframes scv-pop { from{opacity:0;transform:scale(.4)} to{opacity:1;transform:scale(1)} }
        @keyframes scv-draw { to{stroke-dashoffset:0} }
        @keyframes scv-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes scv-scrimIn { from{opacity:0} to{opacity:1} }
        @keyframes scv-sheetIn { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes scv-optIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes scv-menuIn { from{opacity:0;transform:scale(.96) translateY(-4px)} to{opacity:1;transform:scale(1) translateY(0)} }

        /* ── ready toast ── */
        @keyframes scv-toastIn { from{opacity:0;transform:translateY(-14px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes scv-sheen { 0%{transform:translateX(-120%) skewX(-18deg)} 60%,100%{transform:translateX(320%) skewX(-18deg)} }
        @keyframes scv-timer { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        .scv-toast-wrap { position:fixed; top:70px; right:22px; z-index:120; width:340px; max-width:calc(100vw - 32px); }
        .scv-toast { position:relative; display:flex; gap:13px; align-items:flex-start; padding:16px 16px 18px;
          background:linear-gradient(150deg,#ffffff 0%,#f6fefb 100%); border:1px solid rgba(13,148,136,.16);
          border-radius:16px; overflow:hidden;
          box-shadow:0 2px 6px rgba(10,15,26,.06), 0 20px 44px -12px rgba(10,15,26,.28);
          animation:scv-toastIn .42s cubic-bezier(.22,1,.36,1); }
        .scv-toast::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(#14b8a6,#0a5d55); }
        .scv-toast-sheen { position:absolute; top:0; bottom:0; left:0; width:40%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);
          animation:scv-sheen 1.1s .35s ease-out both; pointer-events:none; }
        .scv-toast .scv-check { animation:scv-pop .5s .06s cubic-bezier(.34,1.56,.64,1) both; }
        .scv-toast .scv-check path { stroke-dasharray:20; stroke-dashoffset:20; animation:scv-draw .4s .34s ease forwards; }
        .scv-toast .scv-btitle { animation:scv-up .5s .12s cubic-bezier(.22,1,.36,1) both; }
        .scv-toast .scv-bsub { animation:scv-up .5s .18s cubic-bezier(.22,1,.36,1) both; }
        .scv-toast .scv-bbtn1 { animation:scv-up .5s .26s cubic-bezier(.22,1,.36,1) both; }
        .scv-toast .scv-bbtn2 { animation:scv-up .5s .32s cubic-bezier(.22,1,.36,1) both; }
        .scv-toast-timer { position:absolute; left:0; right:0; bottom:0; height:2.5px; transform-origin:left;
          background:linear-gradient(90deg,#14b8a6,#0a5d55); animation:scv-timer 6s linear forwards; }
        .scv-toast-timer[data-paused="true"] { animation-play-state:paused; }
        .scv-bbtn { transition: transform .16s ease, border-color .16s ease, color .16s ease, background .16s ease; }
        .scv-bbtn:hover { transform: translateY(-1px); border-color:#0d9488; color:#0a5d55; }
        .scv-bbtn-primary:hover { background:#0a5d55; color:#fff; }

        .scv-scrim { animation: scv-scrimIn .22s ease; }
        .scv-sheet { animation: scv-sheetIn .34s cubic-bezier(.22,1,.36,1); }
        .scv-opt { transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; opacity:0; }
        .scv-opt:nth-of-type(1) { animation: scv-optIn .4s .08s cubic-bezier(.22,1,.36,1) forwards; }
        .scv-opt:nth-of-type(2) { animation: scv-optIn .4s .15s cubic-bezier(.22,1,.36,1) forwards; }
        .scv-opt:hover { transform: translateY(-2px); box-shadow: 0 1px 2px rgba(10,15,26,.06), 0 12px 28px -8px rgba(10,15,26,.16); border-color:#d7dee6; }
        .scv-opt .scv-go { transition: transform .16s ease; }
        .scv-opt:hover .scv-go { transform: translateX(3px); }
        .scv-x { transition:.15s; }
        .scv-x:hover { background:#f1f5f9; }

        .scv-tpl { transition: transform .16s ease, box-shadow .16s ease, background .16s ease; }
        .scv-tpl:hover { transform: translateY(-2px); box-shadow: 0 1px 2px rgba(10,15,26,.06), 0 10px 22px -10px rgba(10,15,26,.22); background:#fafbfc; }
      `}</style>

      <nav className="no-print" style={{ background:'#0a0f1a', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50, flexWrap:'wrap', gap:'10px' }}>
        <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.25rem', fontWeight:600, color:'white' }}>Swift<span style={{ color:'#5eead4' }}>CV</span>Pro</div>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.08)', borderRadius:'50px', padding:'3px', gap:'2px' }}>
          <button onClick={() => setActiveTab('preview')} style={{ padding:'7px 18px', borderRadius:'50px', fontSize:'12px', fontWeight:activeTab==='preview'?600:400, background:activeTab==='preview'?'white':'none', color:activeTab==='preview'?'#0a0f1a':'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Preview</button>
          <button onClick={() => setShowChooser(true)} style={{ padding:'7px 18px', borderRadius:'50px', fontSize:'12px', fontWeight:activeTab==='edit'?600:400, background:activeTab==='edit'?'white':'none', color:activeTab==='edit'?'#0a0f1a':'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Edit</button>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={handleNewCV} style={{ padding:'8px 14px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50px', fontSize:'12px', fontWeight:500, cursor:'pointer' }}>+ New CV</button>
          <button onClick={() => { setCoverErr(''); setShowCoverModal(true) }} title="Generate a cover letter from this CV" style={{ padding:'8px 14px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.72)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50px', fontSize:'12px', fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:'7px' }}><span style={{ color:'#5eead4' }}>✦</span> Cover Letter</button>
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowDownloadMenu(v => !v)} disabled={!!downloading} style={{ padding:'8px 16px', background:'rgba(255,255,255,0.1)', color:'white', border:'none', borderRadius:'50px', fontSize:'13px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
              {downloading ? '...' : <>↓ Download <span style={{ fontSize:'10px' }}>▾</span></>}
            </button>
            {showDownloadMenu && (
              <div onMouseLeave={() => setShowDownloadMenu(false)} style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', boxShadow:'0 12px 30px -6px rgba(10,15,26,0.2)', overflow:'hidden', minWidth:'168px', zIndex:60, animation:'scv-menuIn 0.14s ease', transformOrigin:'top right' }}>
                <button onClick={() => { setShowDownloadMenu(false); handleDownloadPdf() }} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', textAlign:'left', padding:'12px 16px', background:'white', border:'none', borderBottom:'1px solid #f1f5f9', fontSize:'13px', fontWeight:600, color:'#0a0f1a', cursor:'pointer' }}><DownIcon/> Download PDF</button>
                <button onClick={() => { setShowDownloadMenu(false); handleDownloadDocx() }} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', textAlign:'left', padding:'12px 16px', background:'white', border:'none', fontSize:'13px', fontWeight:600, color:'#0a0f1a', cursor:'pointer' }}><DownIcon/> Download Word</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {activeTab === 'preview' && showReadyBanner && (
        <div className="no-print scv-toast-wrap" onMouseEnter={() => setBannerPaused(true)} onMouseLeave={() => setBannerPaused(false)}>
          <div className="scv-toast">
            <div className="scv-toast-sheen" />
            <div className="scv-check" style={{ width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(140deg,#14b8a6,#0a5d55)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px -2px rgba(13,148,136,0.55)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="scv-btitle" style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.18rem', fontWeight:600, letterSpacing:'0.2px', lineHeight:1.15, color:'#0a0f1a' }}>Great job! Your CV is ready.</div>
              <div className="scv-bsub" style={{ fontSize:'12px', color:'#64748b', marginTop:'2px' }}>Download it now or make changes before you send it.</div>
              <div style={{ display:'flex', gap:'8px', marginTop:'11px' }}>
                <button className="scv-bbtn scv-bbtn-primary scv-bbtn1" onClick={handleDownloadPdf} disabled={!!downloading} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'#0d9488', color:'white', border:'1px solid #0d9488', borderRadius:'50px', fontSize:'12px', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 6px 16px -4px rgba(13,148,136,0.5)' }}><DownIcon/> PDF</button>
                <button className="scv-bbtn scv-bbtn2" onClick={handleDownloadDocx} disabled={!!downloading} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'white', color:'#0a0f1a', border:'1px solid #e7ebf0', borderRadius:'50px', fontSize:'12px', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 1px 2px rgba(10,15,26,0.05)' }}><DownIcon/> Word</button>
              </div>
            </div>
            <button className="scv-x" onClick={() => setShowReadyBanner(false)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:'4px', display:'flex', borderRadius:'8px', alignSelf:'flex-start' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            <div className="scv-toast-timer" data-paused={bannerPaused} onAnimationEnd={() => setShowReadyBanner(false)} />
          </div>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns: isCoverLetter ? '1fr' : '260px 1fr', minHeight:'calc(100vh - 57px)' }}>
        {!isCoverLetter && (
          <div className="no-print" style={{ background:'white', borderRight:'1px solid #e2e8f0', padding:'22px 20px', overflowY:'auto', height:'calc(100vh - 57px)' }}>

            {/* ── COLOUR — always visible, premium ── */}
            {currentTpl?.customizable && (
              <div style={{ marginBottom:'22px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'#94a3b8', marginBottom:'12px' }}>Choose Colour</div>
                <div style={{ display:'flex', gap:'9px', flexWrap:'wrap' }}>
                  <button onClick={() => setAccentColor(null)} title="Default" style={{ width:'26px', height:'26px', borderRadius:'50%', background: currentTpl.color, cursor:'pointer', padding:0, border:'none', boxShadow: accentColor === null ? `0 0 0 2px #fff, 0 0 0 4px ${currentTpl.color}` : '0 0 0 1px #e2e8f0', transition:'all 0.15s' }} />
                  {COLOR_SWATCHES.map(s => (
                    <button key={s.value} onClick={() => setAccentColor(s.value)} title={s.name} style={{ width:'26px', height:'26px', borderRadius:'50%', background: s.value, cursor:'pointer', padding:0, border:'none', boxShadow: accentColor === s.value ? `0 0 0 2px #fff, 0 0 0 4px ${s.value}` : '0 0 0 1px #e2e8f0', transition:'all 0.15s' }} />
                  ))}
                </div>
              </div>
            )}
            <div style={{ height:'1px', background:'#eef2f6', margin:'0 0 18px' }} />

            <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'#94a3b8', marginBottom:'12px' }}>Choose Template</div>

            {/* PREMIUM */}
            {premiumTemplates.length > 0 && (<>
              <CategoryHeader>Premium</CategoryHeader>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'9px', margin:'6px 0 16px' }}>
                {premiumTemplates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} active={template===tpl.id} onClick={() => setTemplate(tpl.id)} />)}
              </div>
            </>)}

            {/* ATS */}
            <CategoryHeader>ATS Templates</CategoryHeader>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'9px', margin:'6px 0 16px' }}>
              {atsTemplates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} active={template===tpl.id} onClick={() => setTemplate(tpl.id)} />)}
            </div>

            {/* ACADEMIC */}
            {academicTemplates.length > 0 && (<>
              <CategoryHeader>Academic</CategoryHeader>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'9px', margin:'6px 0 4px' }}>
                {academicTemplates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} active={template===tpl.id} onClick={() => setTemplate(tpl.id)} />)}
              </div>
            </>)}

          </div>
        )}

        <div style={{ padding:'24px', overflowY:'auto', overflowX:'auto', background:'#f1f5f9' }}>
          {coverLetter && (
            <div className="no-print" style={{ display:'flex', justifyContent:'center', marginBottom:'18px' }}>
              <div style={{ display:'inline-flex', background:'white', border:'1px solid #e2e8f0', borderRadius:'50px', padding:'4px', boxShadow:'0 2px 8px rgba(10,15,26,0.06)' }}>
                <button onClick={showCvDoc} style={{ padding:'8px 20px', borderRadius:'50px', fontSize:'13px', fontWeight:600, border:'none', cursor:'pointer', background: activeDoc==='cv' ? '#0d9488' : 'transparent', color: activeDoc==='cv' ? 'white' : '#64748b' }}>CV</button>
                <button onClick={showCoverDoc} style={{ padding:'8px 20px', borderRadius:'50px', fontSize:'13px', fontWeight:600, border:'none', cursor:'pointer', background: activeDoc==='cover' ? '#0d9488' : 'transparent', color: activeDoc==='cover' ? 'white' : '#64748b' }}>Cover Letter</button>
              </div>
            </div>
          )}
          {activeTab === 'preview' ? (
            <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'visible', boxShadow:'0 8px 40px rgba(0,0,0,0.1)', width:'210mm', maxWidth:'210mm', margin:'0 auto' }}>
              <div id="cv-print-area">
                <CVPreview cv={cv} templateId={template} accentColor={accentColor} />
              </div>
            </div>
          ) : (
            <div style={{ maxWidth:'720px', margin:'0 auto' }}>
              <button onClick={() => setActiveTab('preview')} className="no-print" style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 16px', background:'white', border:'1px solid #e2e8f0', borderRadius:'50px', fontSize:'12.5px', fontWeight:600, color:'#0a0f1a', cursor:'pointer', marginBottom:'18px' }}>← Back to preview</button>
              <CVEditor cv={cv} updateCV={updateCV} />
            </div>
          )}
        </div>
      </div>

      {/* COVER LETTER MODAL */}
      {showCoverModal && (
        <div onClick={() => !coverGenerating && setShowCoverModal(false)} className="no-print scv-scrim" style={{ position:'fixed', inset:0, background:'rgba(8,13,24,0.5)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)', zIndex:210, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} className="scv-sheet" style={{ background:'white', borderRadius:'20px', width:'100%', maxWidth:'440px', padding:'22px', boxShadow:'0 1px 3px rgba(10,15,26,0.08), 0 24px 60px -12px rgba(10,15,26,0.34)', fontFamily:"'DM Sans', sans-serif" }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
              <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.42rem', fontWeight:600, lineHeight:1.15, color:'#0a0f1a' }}>Generate a cover letter</div>
              <button onClick={() => !coverGenerating && setShowCoverModal(false)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:'6px', display:'flex' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            </div>
            <p style={{ fontSize:'12.5px', color:'#64748b', lineHeight:1.5, margin:'0 0 16px' }}>We’ll write a cover letter from your CV. Applying for a specific role? Paste or upload the job posting to tailor it — or skip for a strong general letter.</p>

            <textarea value={coverJd} onChange={e => setCoverJd(e.target.value)} placeholder="Paste the job description here (optional)…" rows={5} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px 14px', fontSize:'13px', fontFamily:"'DM Sans', sans-serif", resize:'vertical', outline:'none', boxSizing:'border-box' }} />

            <label style={{ display:'inline-flex', alignItems:'center', gap:'7px', marginTop:'10px', fontSize:'12px', color:'#0d9488', fontWeight:600, cursor:'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {coverReadingFile ? 'Reading file\u2026' : 'Or upload the job (image, PDF, Word)'}
              <input type="file" accept="image/*,application/pdf,.doc,.docx" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) readCoverFile(f) }} />
            </label>

            {coverErr && <div style={{ marginTop:'12px', fontSize:'12.5px', color:'#b91c1c', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', padding:'10px 12px' }}>{coverErr}</div>}

            <button onClick={handleGenerateCover} disabled={coverGenerating || coverReadingFile} style={{ width:'100%', marginTop:'16px', padding:'13px', background: coverGenerating ? '#5eead4' : '#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'14px', fontWeight:600, cursor: coverGenerating ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              {coverGenerating ? 'Writing your cover letter\u2026' : <><span style={{ color:'#fff' }}>✦</span> Generate Cover Letter</>}
            </button>
            <div style={{ textAlign:'center', fontSize:'11px', color:'#94a3b8', marginTop:'10px' }}>Free with your CV · takes about 20 seconds</div>
          </div>
        </div>
      )}

      {/* NEED CHANGES? CHOOSER */}
      {showChooser && (
        <div onClick={() => setShowChooser(false)} className="no-print scv-scrim" style={{ position:'fixed', inset:0, background:'rgba(8,13,24,0.5)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)', zIndex:210, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} className="scv-sheet" style={{ background:'white', borderRadius:'20px', width:'100%', maxWidth:'392px', padding:'8px', boxShadow:'0 1px 3px rgba(10,15,26,0.08), 0 24px 60px -12px rgba(10,15,26,0.34)', fontFamily:"'DM Sans', sans-serif" }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'16px 16px 10px' }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.42rem', fontWeight:600, lineHeight:1.15, letterSpacing:'0.2px', color:'#0a0f1a' }}>How would you like to make changes?</div>
                <div style={{ fontSize:'12.5px', color:'#64748b', marginTop:'3px' }}>Pick a path — you can switch anytime.</div>
              </div>
              <button className="scv-x" onClick={() => setShowChooser(false)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:'6px', borderRadius:'8px', display:'flex' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            </div>

            <button className="scv-opt" onClick={() => { setShowChooser(false); setShowRevision(true) }} style={{ position:'relative', display:'flex', gap:'14px', alignItems:'center', width:'calc(100% - 16px)', margin:'0 8px', textAlign:'left', padding:'15px', background:'linear-gradient(140deg,#f0fdf9,#e7fbf5)', border:'1.5px solid rgba(13,148,136,0.4)', borderRadius:'14px', cursor:'pointer' }}>
              <span style={{ position:'absolute', top:'-9px', left:'17px', font:"700 9px 'DM Sans'", letterSpacing:'1px', color:'#0a5d55', background:'#d7f5ee', padding:'3px 8px', borderRadius:'20px' }}>POPULAR</span>
              <span style={{ width:'42px', height:'42px', borderRadius:'11px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(140deg,#14b8a6,#0a5d55)', boxShadow:'0 6px 14px -4px rgba(13,148,136,0.55)' }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" fill="#fff"/><circle cx="18.5" cy="4.5" r="1.3" fill="#fff"/><circle cx="5" cy="16" r="1" fill="#fff"/></svg>
              </span>
              <span style={{ flex:1 }}>
                <span style={{ display:'block', fontSize:'14.5px', fontWeight:700, letterSpacing:'-0.1px', color:'#0a0f1a' }}>Edit with AI</span>
                <span style={{ display:'block', fontSize:'12.5px', color:'#64748b', marginTop:'2px', lineHeight:1.45 }}>Make changes faster with AI.</span>
              </span>
              <span className="scv-go" style={{ color:'#0d9488', display:'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            </button>

            <button className="scv-opt" onClick={() => { setShowChooser(false); setActiveTab('edit') }} style={{ display:'flex', gap:'14px', alignItems:'center', width:'calc(100% - 16px)', margin:'9px 8px 0', textAlign:'left', padding:'15px', background:'white', border:'1px solid #e7ebf0', borderRadius:'14px', cursor:'pointer' }}>
              <span style={{ width:'42px', height:'42px', borderRadius:'11px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9' }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M14.5 4.5l5 5M4 20l1.2-4.2L15.3 5.7a1.7 1.7 0 012.4 0l.6.6a1.7 1.7 0 010 2.4L8.2 18.8 4 20z" stroke="#0a0f1a" strokeWidth="1.8" strokeLinejoin="round"/></svg>
              </span>
              <span style={{ flex:1 }}>
                <span style={{ display:'block', fontSize:'14.5px', fontWeight:700, letterSpacing:'-0.1px', color:'#0a0f1a' }}>Edit manually</span>
                <span style={{ display:'block', fontSize:'12.5px', color:'#64748b', marginTop:'2px', lineHeight:1.45 }}>Edit every section yourself.</span>
              </span>
              <span className="scv-go" style={{ color:'#94a3b8', display:'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            </button>

            <button className="scv-x" onClick={() => setShowChooser(false)} style={{ display:'block', width:'calc(100% - 16px)', margin:'12px 8px 8px', padding:'12px', background:'white', border:'1px solid #e7ebf0', borderRadius:'50px', fontSize:'13px', fontWeight:500, color:'#64748b', cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

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
function DownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

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
  // ONYX — dark header band, gold
  if (id === 'onyx') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <rect x="0" y="0" width={W} height="18" fill="#15131f" />
      <text x="4" y="9" fontFamily="serif" fontWeight="800" fontSize="5.5" fill="#fff">NAME</text>
      <rect x="4" y="12" width="14" height="1.4" fill="#c9a86a" />
      <rect x="4" y="24" width="6" height="1" fill="#c9a86a" />{lines(4, 27, 42, 3)}
      <rect x="4" y="40" width="6" height="1" fill="#c9a86a" />{lines(4, 43, 42, 3)}
    </svg></div>
  )
  // STERLING — gold executive, navy sidebar right
  if (id === 'sterling') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <rect x="35" y="0" width="15" height={H} fill="#1a2238" />
      <circle cx="42.5" cy="10" r="3.5" fill="none" stroke="#c9a86a" strokeWidth="0.7" />
      <text x="4" y="10" fontFamily="serif" fontWeight="700" fontSize="6" fill="#1a2238">NAME</text>
      <rect x="4" y="13" width="12" height="1" fill="#c9a86a" />
      <rect x="4" y="20" width="6" height="1" fill="#1a2238" /><rect x="4" y="22" width="9" height="0.6" fill="#c9a86a" />{lines(4, 25, 26, 4)}
      <rect x="37" y="18" width="5" height="0.8" fill="#c9a86a" />{lines(37, 21, 10, 3, 2.4, 'rgba(255,255,255,0.6)')}
    </svg></div>
  )
  // VERDE — green gradient header, cards
  if (id === 'verde') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs><linearGradient id="vg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#14532d"/><stop offset="1" stopColor="#1f7a44"/></linearGradient></defs>
      <rect width={W} height={H} fill="#fff" />
      <rect x="0" y="0" width={W} height="16" fill="url(#vg)" />
      <text x="4" y="9" fontFamily="serif" fontWeight="700" fontSize="5.5" fill="#fff">NAME</text>
      <circle cx="5" cy="22" r="1.2" fill="#3f9142" /><rect x="8" y="21" width="6" height="1" fill="#14532d" />
      <rect x="4" y="26" width="42" height="9" rx="2" fill="#f4f7f4" />{lines(7, 28, 36, 2)}
      <circle cx="5" cy="40" r="1.2" fill="#3f9142" /><rect x="8" y="39" width="6" height="1" fill="#14532d" />
    </svg></div>
  )
  // CRIMSON — magazine colour band
  if (id === 'crimson') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <rect x="0" y="0" width={W} height="3" fill="#a01e1e" />
      <text x="4" y="13" fontFamily="serif" fontWeight="800" fontSize="6" fill="#1a1a1a">NAME</text>
      <rect x="4" y="16" width="13" height="3" fill="#a01e1e" />
      <rect x="4" y="24" width="6" height="1" fill="#a01e1e" /><rect x="4" y="26" width="42" height="0.6" fill="#a01e1e" />{lines(4, 29, 42, 3)}
      <rect x="4" y="42" width="6" height="1" fill="#a01e1e" />{lines(4, 45, 42, 2)}
    </svg></div>
  )
  // ATLAS — timeline date rail
  if (id === 'atlas') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <text x="4" y="10" fontFamily="serif" fontWeight="300" fontSize="6" fill="#0f172a">NA<tspan font-weight="800">ME</tspan></text>
      <rect x="4" y="13" width="12" height="1" fill="#3b82f6" />
      <text x="4" y="24" fontFamily="sans-serif" fontWeight="800" fontSize="3.5" fill="#0f172a">26</text>
      <line x1="13" y1="20" x2="13" y2="34" stroke="#e2e8f0" strokeWidth="1" />
      <circle cx="13" cy="22" r="1.3" fill="#3b82f6" />
      <rect x="16" y="21" width="10" height="1" fill="#0f172a" />{lines(16, 24, 28, 3)}
      <text x="4" y="40" fontFamily="sans-serif" fontWeight="800" fontSize="3.5" fill="#0f172a">20</text>
      <line x1="13" y1="37" x2="13" y2="46" stroke="#e2e8f0" strokeWidth="1" />
      <circle cx="13" cy="39" r="1.3" fill="#3b82f6" />
      <rect x="16" y="38" width="10" height="1" fill="#0f172a" />{lines(16, 41, 28, 2)}
    </svg></div>
  )
  // SLATE — minimal mono
  if (id === 'slate') return (
    <div style={wrap}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#fff" />
      <text x="6" y="12" fontFamily="serif" fontWeight="300" fontSize="5" fill="#1a1a1a" letterSpacing="1.5">NAME</text>
      <rect x="6" y="16" width="8" height="1" fill="#1a1a1a" />
      <rect x="6" y="26" width="7" height="0.8" fill="#1a1a1a" />{lines(6, 29, 38, 3, 3)}
      <rect x="6" y="44" width="7" height="0.8" fill="#1a1a1a" />{lines(6, 47, 38, 2, 3)}
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
  const both = tpl.formats === 'both'
  return (
    <div onClick={onClick} className="scv-tpl" title={tpl.tag} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', padding:'12px 8px 11px', borderRadius:'12px', background: active ? '#f6fdfb' : '#fff', boxShadow: active ? '0 0 0 1.5px #0d9488' : '0 0 0 1px #eef2f6', cursor:'pointer' }}>
      {active && <span style={{ position:'absolute', top:'6px', right:'6px', width:'16px', height:'16px', borderRadius:'50%', background:'#0d9488', color:'#fff', fontSize:'9px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>✓</span>}
      <TemplateThumb id={tpl.id} />
      <div style={{ textAlign:'center', width:'100%' }}>
        <div style={{ fontSize:'12px', fontWeight:600, color: active ? '#0d9488' : '#0a0f1a', lineHeight:1.2 }}>{tpl.name}</div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', marginTop:'5px', fontSize:'7.5px', fontWeight:700, letterSpacing:'0.4px', padding:'2.5px 7px', borderRadius:'20px', background: both ? '#ecfdf5' : '#fffbeb', color: both ? '#0d9488' : '#b45309' }}>
          <svg width="8" height="9" viewBox="0 0 12 14" fill="none"><path d="M2 1h5l3 3v9H2V1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
          {both ? 'PDF · WORD' : 'PDF ONLY'}
        </div>
      </div>
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
