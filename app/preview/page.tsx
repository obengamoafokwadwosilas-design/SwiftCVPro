'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratedCV, TemplateId, ExportFormat } from '@/types'
import CVPreview, { getFlowPdfConfig, TemplatePreview } from '@/components/CVPreview'

// ══════════════════════════════════════════════════════
// TEMPLATE LIBRARY — Premium first, then ATS, then Academic
// ══════════════════════════════════════════════════════
type Formats = 'both' | 'pdf'
type Category = 'ats' | 'premium' | 'academic'

const TEMPLATES: { id: TemplateId; name: string; tag: string; color: string; formats: Formats; category: Category; customizable: boolean }[] = [
  // Curated pagination-safe library. Every design uses the same granular
  // block structure; only typography, headings and header styling differ.
  // ── PDF + Word, colour-customizable ──
  { id: 'vertex',    name: 'Editorial',       tag: 'Magazine · Bold Rules · Strong Colour', color: '#e0533d', formats: 'both', category: 'premium', customizable: true },
  { id: 'sovereign', name: 'Executive Gold',  tag: 'Prestige · Centered · Corporate',  color: '#b08d3f', formats: 'both', category: 'premium',  customizable: true  },
  { id: 'ascend',    name: 'Corporate Blue',  tag: 'Strong · Colour Bars · Structured',color: '#1d4ed8', formats: 'both', category: 'premium',  customizable: true  },
  { id: 'harbour',   name: 'Refined Teal',    tag: 'Editorial · Elegant · Professional',color: '#0f766e',formats: 'both', category: 'premium',  customizable: true  },
  { id: 'meridian',  name: 'Meridian',        tag: 'Two-Column · Colour Sidebar',       color: '#0d9488', formats: 'both', category: 'premium',  customizable: true  },
  { id: 'metro',     name: 'Aurora',          tag: 'Colourful · Bold Header Band',      color: '#7c3aed', formats: 'both', category: 'premium',  customizable: true  },
  // Prestige keeps its fixed navy + gold identity (not colour-customizable).
  { id: 'prestige',  name: 'Prestige',        tag: 'Executive · Navy & Gold · Centered',color: '#a87b00', formats: 'both', category: 'premium',  customizable: false },
  { id: 'classic',   name: 'Classic ATS',     tag: 'Traditional · Recruiter Safe',      color: '#1f2937', formats: 'both', category: 'ats',      customizable: true  },
  { id: 'slate',     name: 'Slate',           tag: 'Dense · Minimalist · Single-Column',color: '#1a1a1a', formats: 'both', category: 'ats',      customizable: true  },
  { id: 'academic',  name: 'Academic',        tag: 'Scholarly · Structured · ATS Safe', color: '#374151', formats: 'both', category: 'academic', customizable: true  },
  { id: 'compass',   name: 'Compass',         tag: 'Centered · Flanked Rules · Clean',   color: '#64748b', formats: 'both', category: 'ats',      customizable: true  },
  { id: 'beacon',    name: 'Beacon',          tag: 'Tab Headings · Bold · Structured',   color: '#2563eb', formats: 'both', category: 'premium',  customizable: true  },
  // ── PDF only (rich layouts Word can't reproduce faithfully) — shown last ──
  { id: 'atlas',     name: 'Atlas',           tag: 'Timeline Rail · Chronological',     color: '#3b82f6', formats: 'pdf',  category: 'premium',  customizable: true  },
  { id: 'sterling',  name: 'Sterling',        tag: 'Two-Column · Dark Sidebar',         color: '#c9a86a', formats: 'pdf',  category: 'premium',  customizable: true  },
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
// Editor helpers: extraSections <-> labelled-lines text ("Heading: item; item")
function extraSectionsToText(cv: any): string {
  const secs = cv?.extraSections as { heading: string; items: string[] }[] | undefined
  if (secs?.length) return secs.map(s => `${s.heading}: ${s.items.join('; ')}`).join('\n')
  return cv?.additionalInfo || ''
}
function textToExtraSections(text: string): { heading: string; items: string[] }[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const ci = line.indexOf(':')
    if (ci > 0) return { heading: line.slice(0, ci).trim(), items: line.slice(ci + 1).split(';').map(x => x.trim()).filter(Boolean) }
    return { heading: 'Additional Information', items: [line] }
  }).filter(s => s.items.length)
}

function normalizeCV(raw: any): GeneratedCV {
  const arr = (v: any) => (Array.isArray(v) ? v : [])
  const str = (v: any) => (typeof v === 'string' ? v : v == null ? '' : String(v))
  return {
    ...raw,
    fullName: str(raw?.fullName),
    // Do not label CVs with an AI-inferred profession/headline.
    // Keep the field only for cover letters, where the target role is useful.
    jobTitle: raw?.coverLetterBody ? str(raw?.jobTitle) : '',
    email: str(raw?.email),
    phone: str(raw?.phone),
    location: str(raw?.location),
    summary: str(raw?.summary),
    skills: arr(raw?.skills).map(str),
    attributes: arr(raw?.attributes).map(str),
    extraSections: arr(raw?.extraSections).map((s: any) => ({ heading: str(s?.heading), items: arr(s?.items).map(str) })).filter((s: any) => s.heading && s.items.length),
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
  const [template, setTemplate] = useState<TemplateId>('classic')
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
  const [upsellShown, setUpsellShown] = useState(false)
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
      setTimeout(() => { if (!upsellShown && !coverLetter && activeDoc === 'cv') { setShowUpsell(true); setUpsellShown(true) } }, 2000)
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
      // Let webfonts finish loading first — the correction pass below measures
      // real text, so it needs the real fonts already applied.
      const fonts = (document as any).fonts
      if (fonts?.ready && typeof fonts.ready.then === 'function') {
        await fonts.ready.catch(() => undefined)
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      // CVPreview's pagination engine self-corrects its first (conservative)
      // page-break plan against the real rendered document, then flags
      // [data-pagination-ready="true"] once that correction has committed.
      // Serialising outerHTML before that flag appears was capturing the
      // stale, over-conservative plan — pages breaking earlier than the
      // content actually needed, even with room left on the page. Poll for
      // the real signal instead of guessing a fixed number of frames; if it
      // never arrives (e.g. a cover letter, which has no async pagination
      // and is marked ready immediately, or an edge-case failure), fall
      // through after a bounded wait rather than hanging the download.
      const settleDeadline = Date.now() + 4000
      while (!printArea.querySelector('[data-pagination-ready="true"]') && Date.now() < settleDeadline) {
        await new Promise<void>(resolve => setTimeout(resolve, 60))
      }

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
      setTimeout(() => { if (!upsellShown && !coverLetter && activeDoc === 'cv') { setShowUpsell(true); setUpsellShown(true) } }, 2000)
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
    // Cover letters render through the CoverLetter component (not the paginated
    // engine), so they have no flow document — never take the flow path for
    // them, or the flow CSS would hide their content. This mirrors CVPreview's
    // own isCL(cv) = !!cv.coverLetterBody branch.
    const flow = cv && !cv.coverLetterBody ? getFlowPdfConfig(tplId) : null
    if (flow) {
      // ── Renderer-owned pagination ────────────────────────────────────
      // For flagged single-column templates, hand the whole document to the
      // PDF renderer as one continuous flow and let IT choose the page breaks
      // (break-inside / break-after). The renderer that decides the break is
      // the one that draws it, so the browser-vs-remote height drift that used
      // to clip bottom-edge content cannot occur — an over-hanging block is
      // flowed onto the next sheet instead of being sliced. Per-sheet margins
      // come from @page; the flow wrapper only holds horizontal padding.
      return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${PRINT_FONTS_HREF}" />
  <style>
    @page { size: A4; margin: ${flow.padTop}px ${flow.padRight}px ${flow.padBottom}px ${flow.padLeft}px; }
    ${flow.banded ? '@page :first { margin-top: 0; }' : ''}
    html, body {
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
    #cv-print-area { margin: 0; padding: 0; background: white; }
    /* show ONLY the continuous flow document; hide packed frames + artifacts */
    #cv-print-area > div > div:not([data-flow-doc]) { display: none !important; }
    [data-measure-pass] { display: none !important; }
    [data-screen-doc] { display: none !important; }
    [data-flow-doc] { display: block !important; width: auto !important; background: white; }
    /* the renderer flows content; these keep atomic blocks whole and headings
       attached to the item that follows them */
    [data-flow-block] { break-inside: avoid; page-break-inside: avoid; }
    [data-flow-head] { break-after: avoid; page-break-after: avoid; }
  </style>
</head>
<body>
  ${cvMarkup}
</body>
</html>`
    }
    // ── Packed fixed-page engine (all other templates, unchanged) ──────
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
      height: 297mm;
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
  const ACADEMIC_ALLOWED: TemplateId[] = ['academic', 'classic', 'sovereign', 'harbour']
  const COVER_LETTER_ALLOWED: TemplateId[] = ['classic', 'sovereign', 'harbour']

  const visibleTemplates = isCoverLetter
    ? TEMPLATES.filter(t => COVER_LETTER_ALLOWED.includes(t.id))
    : isAcademicCV
      ? TEMPLATES.filter(t => ACADEMIC_ALLOWED.includes(t.id))
      : TEMPLATES.filter(t => t.category === 'ats' || t.category === 'premium')

  // Within each group, keep PDF+Word templates first and PDF-only ones last.
  const bothFirst = (a: typeof TEMPLATES[0], b: typeof TEMPLATES[0]) => (a.formats === b.formats ? 0 : a.formats === 'both' ? -1 : 1)
  const premiumTemplates = visibleTemplates.filter(t => t.category === 'premium').sort(bothFirst)
  const atsTemplates = visibleTemplates.filter(t => t.category === 'ats' || t.category === 'academic').sort(bothFirst)
  const academicTemplates = visibleTemplates.filter(t => t.category === 'academic').sort(bothFirst)

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

      {/* Load the print fonts in the PREVIEW too: the paginator must measure with
          the exact fonts the PDF renders with, or line-wrapping (and thus page
          breaks) drift between screen and PDF. fonts.ready in CVPreview waits on these. */}
      <link rel="stylesheet" href={PRINT_FONTS_HREF} />

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
        @keyframes scv-toastIn { from{opacity:0;transform:translateY(14px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes scv-sheen { 0%{transform:translateX(-120%) skewX(-18deg)} 60%,100%{transform:translateX(320%) skewX(-18deg)} }
        @keyframes scv-timer { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        .scv-toast-wrap { position:fixed; bottom:24px; right:24px; z-index:120; width:300px; max-width:calc(100vw - 32px); }
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
          {/* "Edit with AI" is dropped for now: Edit goes straight to manual
              editing. The chooser + AI-revision flow below are left intact but
              unreachable, so re-enabling is a one-line change (setShowChooser). */}
          <button onClick={() => setActiveTab('edit')} style={{ padding:'7px 18px', borderRadius:'50px', fontSize:'12px', fontWeight:activeTab==='edit'?600:400, background:activeTab==='edit'?'white':'none', color:activeTab==='edit'?'#0a0f1a':'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Edit</button>
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
            <div className="scv-check" style={{ width:'26px', height:'26px', borderRadius:'50%', background:'linear-gradient(140deg,#14b8a6,#0a5d55)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px -2px rgba(13,148,136,0.5)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="scv-btitle" style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.02rem', fontWeight:600, letterSpacing:'0.2px', lineHeight:1.15, color:'#0a0f1a' }}>Great job! Your CV is ready.</div>
              <div className="scv-bsub" style={{ fontSize:'11.5px', color:'#64748b', marginTop:'1px' }}>Download it from the top bar when you\u2019re ready.</div>
            </div>
            <button className="scv-x" onClick={() => setShowReadyBanner(false)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:'3px', display:'flex', borderRadius:'8px', alignSelf:'flex-start' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
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
      {showUpsell && !isCoverLetter && !coverLetter && (
        <div className="scv-sheet" style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:150, background:'white', borderRadius:'16px', padding:'18px 20px', boxShadow:'0 8px 40px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', maxWidth:'290px' }}>
          <button onClick={() => setShowUpsell(false)} style={{ position:'absolute', top:'10px', right:'12px', background:'none', border:'none', fontSize:'16px', color:'#94a3b8', cursor:'pointer' }}>✕</button>
          <div style={{ fontSize:'1.15rem', fontWeight:600, color:'#0a0f1a', fontFamily:"'Cormorant Garamond', serif", marginBottom:'6px' }}>Add a matching cover letter?</div>
          <div style={{ fontSize:'12px', color:'#64748b', lineHeight:1.6, marginBottom:'14px' }}>Written from this same CV — tailored to a role, or general. Ready in seconds.</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#0d9488', background:'#f0fdf9', padding:'4px 10px', borderRadius:'20px' }}>Free with your CV</div>
            <button onClick={() => { setShowUpsell(false); setCoverErr(''); setShowCoverModal(true) }} style={{ padding:'9px 18px', background:'#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>Generate →</button>
          </div>
        </div>
      )}

      {pdfOnlyModal && (
        <div onClick={() => setPdfOnlyModal(false)} style={{ position:'fixed', inset:0, background:'rgba(10,15,26,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', backdropFilter:'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'18px', maxWidth:'380px', width:'100%', padding:'36px 34px 28px', boxShadow:'0 25px 80px rgba(0,0,0,0.4)', fontFamily:"'DM Sans', sans-serif", textAlign:'center' }}>
            <div style={{ width:'46px', height:'46px', borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', color:'#0d9488' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'24px', fontWeight:600, color:'#0a0f1a', marginBottom:'12px' }}>PDF-only design</div>
            <div style={{ fontSize:'14px', color:'#475569', lineHeight:1.7, marginBottom:'26px' }}>
              This design is available in PDF only. Choose another template to download your CV in Word&nbsp;(.docx) format.
            </div>
            <button onClick={() => { setPdfOnlyModal(false); handleDownloadPdf() }} style={{ width:'100%', padding:'13px', background:'#0d9488', color:'white', border:'none', borderRadius:'11px', cursor:'pointer', fontWeight:600, fontSize:'14px', marginBottom:'10px' }}>Download PDF</button>
            <button onClick={() => setPdfOnlyModal(false)} style={{ width:'100%', padding:'11px', background:'transparent', color:'#64748b', border:'none', borderRadius:'11px', cursor:'pointer', fontWeight:600, fontSize:'13px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ICONS
// Template previews now render the real template scaled down
// (TemplatePreview in components/CVPreview.tsx), so there are no
// hand-drawn thumbnails to keep in sync here.
// ══════════════════════════════════════════════════════
function DownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
      <TemplatePreview templateId={tpl.id} />
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
          {cv.coverLetterBody && <Inp label="Job Title" value={cv.jobTitle} onChange={v => updateCV({ jobTitle: v })} />}
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

      <Sec title="Extra Sections (optional)">
        <TA value={extraSectionsToText(cv)} rows={5}
          onChange={v => updateCV({ extraSections: textToExtraSections(v), additionalInfo: undefined } as any)} />
        <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'6px' }}>One section per line as "Heading: item; item; item" — e.g. "Certifications: PMP; Google PM" or "References: Available on request"</div>
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
