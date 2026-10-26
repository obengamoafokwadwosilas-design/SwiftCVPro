'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratedCV, TemplateId, ExportFormat } from '@/types'
import CVPreview, { getFlowPdfConfig, TemplatePreview } from '@/components/CVPreview'
import CVHistoryModal from '@/components/CVHistoryModal'
import BalanceModal from '@/components/BalanceModal'
import HeaderMenu from '@/components/HeaderMenu'
import { PACKAGES, packagesForDoc } from '@/lib/packages'
import CreditPicker from '@/components/CreditPicker'
import AccessCodePrompt from '@/components/AccessCodePrompt'

// Read from the packages so the cover-letter offer can never drift from what
// Paystack actually charges (it once said GH₵20 while the package was GH₵19).
const COVER_LETTER_PRICE = PACKAGES.find(p => p.id === 'coverletter')!.price

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
  { id: 'tandem',    name: 'Tandem',          tag: 'Two-Column · Repeating Sidebar · Print Safe', color: '#275D63', formats: 'pdf', category: 'premium', customizable: true },
  { id: 'metro',     name: 'Aurora',          tag: 'Colourful · Bold Header Band',      color: '#7c3aed', formats: 'both', category: 'premium',  customizable: true  },
  // Prestige keeps its fixed navy + gold identity (not colour-customizable).
  { id: 'prestige',  name: 'Prestige',        tag: 'Executive · Navy & Gold · Centered',color: '#a87b00', formats: 'both', category: 'premium',  customizable: false },
  { id: 'classic',   name: 'Classic ATS',     tag: 'Traditional · Recruiter Safe',      color: '#1f2937', formats: 'both', category: 'ats',      customizable: true  },
  { id: 'slate',     name: 'Slate',           tag: 'Dense · Minimalist · Single-Column',color: '#1a1a1a', formats: 'both', category: 'ats',      customizable: true  },
  { id: 'academic',  name: 'Academic',        tag: 'Scholarly · Structured · ATS Safe', color: '#374151', formats: 'both', category: 'academic', customizable: true  },
  { id: 'compass',   name: 'Compass',         tag: 'Centered · Flanked Rules · Clean',   color: '#64748b', formats: 'both', category: 'ats',      customizable: true  },
  { id: 'beacon',    name: 'Beacon',          tag: 'Tab Headings · Bold · Structured',   color: '#2563eb', formats: 'both', category: 'premium',  customizable: true  },
  { id: 'regent',    name: 'Regent',          tag: 'Classic · Blue Banner · Recruiter Style', color: '#1e3a6e', formats: 'both', category: 'ats', customizable: true  },
  // ── PDF only (rich layouts Word can't reproduce faithfully) — shown last ──
  { id: 'atlas',     name: 'Atlas',           tag: 'Timeline Rail · Chronological',     color: '#3b82f6', formats: 'pdf',  category: 'premium',  customizable: true  },
]

// The template a freshly generated CV lands on. Rotated at random so the
// first thing a user sees is one of the three designs that actually sell,
// rather than the plain ATS default. Picked once and remembered for the
// session, so a refresh doesn't re-roll the design out from under them.
// Academic CVs and cover letters are excluded — they have their own allowed
// lists (ACADEMIC_ALLOWED / COVER_LETTER_ALLOWED) and none of these are on them.
const LANDING_TEMPLATES: TemplateId[] = ['regent', 'tandem', 'ascend']

function pickLandingTemplate(): TemplateId {
  try {
    const held = sessionStorage.getItem('swiftcv_landing_tpl')
    if (held && (LANDING_TEMPLATES as string[]).includes(held)) return held as TemplateId
    const picked = LANDING_TEMPLATES[Math.floor(Math.random() * LANDING_TEMPLATES.length)]
    sessionStorage.setItem('swiftcv_landing_tpl', picked)
    return picked
  } catch {
    return LANDING_TEMPLATES[0]
  }
}

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
  { name: 'Cobalt',  value: '#1565c0' },
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
  const [isMobile, setIsMobile] = useState(false)
  const [cv, setCV] = useState<GeneratedCV | null>(null)
  const [email, setEmail] = useState('')
  // Set just before a deliberate navigation away (the in-app-browser payment
  // redirect below), so the "you'll lose your CV" beforeunload warning doesn't
  // interrupt a redirect we're doing on purpose.
  const leavingOnPurposeRef = useRef(false)
  // ── Download-time paywall ──
  // Generation is free; a real credit is only required at download. This
  // remembers which download was blocked so it can be retried automatically
  // once the pricing modal below completes a purchase.
  const [showPricing, setShowPricing] = useState(false)
  const [pendingDownload, setPendingDownload] = useState<'pdf' | 'docx' | null>(null)
  const [purchaseError, setPurchaseError] = useState('')
  const [paymentPending, setPaymentPending] = useState<{ reference: string; cv: number } | null>(null)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
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
  const [hasDownloaded, setHasDownloaded] = useState(false)
  // Whether the document on screen has been paid for. null until the server has
  // answered; anything other than true shows the protected preview, so a slow
  // answer never shows the finished CV by mistake.
  const [docPaid, setDocPaid] = useState<boolean | null>(null)
  const [showReadyBanner, setShowReadyBanner] = useState(true)
  // After a CV download: "Tailor this CV for another job". Once per visit.
  const [showAgainToast, setShowAgainToast] = useState(false)
  const againOffered = useRef(false)
  const [showChooser, setShowChooser] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showBalanceModal, setShowBalanceModal] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // On a phone the A4 page is shrunk with a CSS transform, which does not shrink
  // the space it takes up — so without this the page ended in a screen-high
  // empty gap. The wrapper is sized to the shrunk height instead.
  const cvBoxRef = useRef<HTMLDivElement>(null)
  const cvWrapRef = useRef<HTMLDivElement>(null)
  const [cvBoxHeight, setCvBoxHeight] = useState(0)
  // Shrunk to phone width the CV text is small; the zoom view opens it fitted
  // to the screen first (never cut off) and enlarges it in steps from there.
  const [cvZoomed, setCvZoomed] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const zoomBoxRef = useRef<HTMLDivElement>(null)
  const [zoomBoxHeight, setZoomBoxHeight] = useState(0)
  // The zoom view shows a copy of the page exactly as already laid out. A second
  // live CVPreview would redo its page breaks while shrunk, and the break maths
  // measures on-screen sizes, so it laid the pages out wrong (blank first page).
  const [zoomHtml, setZoomHtml] = useState('')
  function openZoom() {
    setZoomHtml(document.getElementById('cv-print-area')?.innerHTML || '')
    setLookPanel(null)
    setCvZoomed(true)
  }
  useEffect(() => {
    const el = cvBoxRef.current
    if (!isMobile || !el) return
    const ro = new ResizeObserver(() => setCvBoxHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile, activeTab, cv])
  useEffect(() => {
    const el = zoomBoxRef.current
    if (!cvZoomed || !el) return
    const ro = new ResizeObserver(() => setZoomBoxHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [cvZoomed])
  // Phone tools panel (Templates / Colour), opened from the bottom bar. It has no
  // backdrop on purpose: the CV stays visible above it and changes as they tap.
  const [lookPanel, setLookPanel] = useState<null | 'template' | 'colour'>(null)
  const [stripAtEnd, setStripAtEnd] = useState(false)
  // The page behind the zoom view must not scroll along with it.
  useEffect(() => {
    if (!cvZoomed) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [cvZoomed])
  // On Android the phone's back button is how people leave a full-screen view;
  // without a history entry it left the CV page instead. Opening the zoom adds
  // one, so back closes the zoom, and the Back arrow goes through the same step.
  useEffect(() => {
    if (!cvZoomed) return
    if (!window.history.state?.scvZoom) window.history.pushState({ ...window.history.state, scvZoom: true }, '')
    const onPop = () => { setCvZoomed(false); setZoomLevel(1) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [cvZoomed])
  function closeZoom() {
    if (window.history.state?.scvZoom) window.history.back()
    else { setCvZoomed(false); setZoomLevel(1) }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('swiftcv_cv')
    const em = sessionStorage.getItem('swiftcv_email')
    if (!stored) { router.push('/build'); return }
    try {
      const parsed = normalizeCV(JSON.parse(stored))
      setCV(parsed)
      setBaseCv(parsed)
      setEmail(em || '')
      // Restore a cover letter generated earlier this session (if any)
      const storedCover = sessionStorage.getItem('swiftcv_coverletter')
      if (storedCover) { try { setCoverLetter(normalizeCV(JSON.parse(storedCover))) } catch {} }
      const storedCvType = sessionStorage.getItem('swiftcv_type') || 'professional'
      setCvType(storedCvType)
      if (storedCvType === 'cover_letter' || parsed.coverLetterBody) setIsCoverLetter(true)
      if (storedCvType === 'academic') { setIsAcademicCV(true); setTemplate('academic') }
      else if (storedCvType === 'cover_letter') setTemplate('classic')
      else setTemplate((sessionStorage.getItem('swiftcv_template') as TemplateId) || pickLandingTemplate())
    } catch { router.push('/build') }
    const warn = (e: BeforeUnloadEvent) => {
      if (leavingOnPurposeRef.current) return
      e.preventDefault(); e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [router])

  // Reset accent color when switching templates
  useEffect(() => {
    setAccentColor(sessionStorage.getItem('swiftcv_accent') || null)
    sessionStorage.removeItem('swiftcv_accent')
    setShowColorPicker(false)
  }, [template])

  // Keep the saved history row's template/colour in sync with whatever is
  // currently on screen. Fire-and-forget: this is bookkeeping, never blocks
  // the UI, and only applies to CVs (cover letters aren't saved to history).
  useEffect(() => {
    const historyId = sessionStorage.getItem('swiftcv_history_id')
    if (!historyId || !email || isCoverLetter) return
    fetch('/api/cv-history/update-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, historyId: Number(historyId), templateId: template, accentColor }),
    }).catch(() => { /* best-effort — never surface this to the user */ })
  }, [template, accentColor, email, isCoverLetter])

  // Ready toast: pause the countdown while hovered (dismissal is driven by the
  // progress bar's animationEnd below, so there is a single clock).
  const [bannerPaused, setBannerPaused] = useState(false)

  // ── Cover letter (Stage 2) ──────────────────────────────────
  const [baseCv, setBaseCv] = useState<GeneratedCV | null>(null)          // always the CV, never the letter
  const [coverLetter, setCoverLetter] = useState<GeneratedCV | null>(null)
  const [activeDoc, setActiveDoc] = useState<'cv' | 'cover'>('cv')
  // The saved-history id of the document currently on screen. The CV and the
  // "+ Cover Letter" add-on are two separate saved documents with separate
  // ids, so this must follow whichever one is being viewed — handing back the
  // CV's id while a cover letter is on screen would let one purchase wrongly
  // unlock the other. Undefined means "not saved", and the server then falls
  // back to charging per download.
  function paidDocumentId(): number | undefined {
    const key = activeDoc === 'cover' ? 'swiftcv_cover_history_id' : 'swiftcv_history_id'
    const id = sessionStorage.getItem(key)
    return id ? Number(id) : undefined
  }
  // Ask the server whether this document is paid. A document with no saved id
  // cannot be (the paywall charges per saved document), so it stays protected.
  useEffect(() => {
    const id = paidDocumentId()
    if (!id) { setDocPaid(false); return }
    let cancelled = false
    fetch('/api/cv-history/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ historyId: id }) })
      .then(r => r.json())
      .then(d => { if (!cancelled) setDocPaid(!!d.paid) })
      .catch(() => { if (!cancelled) setDocPaid(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc, coverLetter])

  // While a document is only a preview, nothing on the page can be copied or cut.
  // Edit is open before paying (people won't pay until their number and dates are
  // right), so the editor's fields are covered too; other fields (an email box, a
  // pasted job advert) stay normal. Typing and pasting in still work. A deterrent,
  // not a lock — the server is the lock: the PDF and Word files are only ever
  // served for paid documents.
  useEffect(() => {
    if (docPaid === true) return
    const block = (e: Event) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName) && !t.closest('[data-cv-editor]')) return
      e.preventDefault()
    }
    document.addEventListener('copy', block)
    document.addEventListener('cut', block)
    return () => { document.removeEventListener('copy', block); document.removeEventListener('cut', block) }
  }, [docPaid])

  // Unlocking spends a credit the owner already has (a pack bought earlier, or
  // one just paid for) and takes the watermark off; they then pick PDF or Word.
  // Only with no credit does it ask them to buy one.
  const [unlocking, setUnlocking] = useState(false)
  async function unlockWithCredit(): Promise<boolean> {
    const historyId = paidDocumentId()
    if (!historyId) return false
    setUnlocking(true)
    try {
      const res = await fetch('/api/cv-history/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId, isCoverLetter }),
      })
      if (!res.ok) return false
      setDocPaid(true)
      setShowPricing(false)
      // Restarted, not just left on, so "Your CV is ready" gets its full time
      // even when the preview's own message was already running out.
      setShowReadyBanner(false)
      requestAnimationFrame(() => setShowReadyBanner(true))
      return true
    } catch { return false }
    finally { setUnlocking(false) }
  }
  async function unlockDocument() {
    setPurchaseError('')
    if (await unlockWithCredit()) return
    setPendingDownload(null)
    setShowPricing(true)
  }
  // Once this CV's paid status is known, finish what brought them here:
  // - back from Paystack's own page (/payment-return sets the flag when the
  //   payment began here): the new credit unlocks this CV straight away, so
  //   nobody is asked to pay twice for it;
  // - My CVs' "Unlock" / "Download": unlock (credit held, else "Choose your
  //   credits"), or open the PDF / Word choice.
  // Both flags are cleared either way so they can't reach another CV.
  useEffect(() => {
    if (docPaid === null) return
    const afterPay = sessionStorage.getItem('swiftcv_unlock_after_pay') === '1'
    const onOpen = sessionStorage.getItem('swiftcv_on_open')
    if (!afterPay && !onOpen) return
    sessionStorage.removeItem('swiftcv_unlock_after_pay')
    sessionStorage.removeItem('swiftcv_on_open')
    if (docPaid === false && afterPay) void unlockWithCredit()
    else if (docPaid === false && onOpen === 'unlock') void unlockDocument()
    else if (docPaid === true && onOpen === 'download') { setShowReadyBanner(false); setShowDownloadMenu(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docPaid])

  const [showCoverModal, setShowCoverModal] = useState(false)
  const [coverGenerating, setCoverGenerating] = useState(false)
  const [coverJd, setCoverJd] = useState('')
  const [coverErr, setCoverErr] = useState('')
  const [coverReadingFile, setCoverReadingFile] = useState(false)
  // Which kind of letter: a strong general one, or tailored to a specific
  // advert. The job-description field only appears for 'targeted', so the
  // default path stays one click.
  const [coverMode, setCoverMode] = useState<'general' | 'targeted'>('general')
  // Generation takes ~20s with no progress signal from the API, so the bar is
  // time-based: it eases towards 90% over the expected wait and only completes
  // when the letter actually arrives. It never sits still (which reads as
  // "frozen") and never claims to be finished early.
  const [coverPct, setCoverPct] = useState(0)
  useEffect(() => {
    if (!coverGenerating) { setCoverPct(0); return }
    const started = Date.now()
    const id = setInterval(() => {
      const t = (Date.now() - started) / 1000
      setCoverPct(Math.min(90, Math.round(90 * (1 - Math.exp(-t / 9)))))
    }, 200)
    return () => clearInterval(id)
  }, [coverGenerating])

  const [showDownloadPinModal, setShowDownloadPinModal] = useState(false)
  const [pendingDownloadKind, setPendingDownloadKind] = useState<'pdf' | 'docx' | null>(null)
  // Cover-letter credit balance for this phone, so the offer tells the truth:
  // "Included" when a pack already paid for one, or the price when not.
  // null = not checked yet.
  const [clCredits, setClCredits] = useState<number | null>(null)
  // Whether this browser's account already has an access code; a pack bought
  // here asks for one only if not (see CreditPicker).
  const [hasAccessCode, setHasAccessCode] = useState(false)
  const [codeOffer, setCodeOffer] = useState<{ continueLabel: string; next: () => void } | null>(null)
  useEffect(() => {
    fetch('/api/cv-pin/status', { method: 'POST', cache: 'no-store' })
      .then(r => r.json()).then(d => {
        setHasAccessCode(!!d?.pin_set)
        // Back from a full-page checkout (/payment-return flags a pack purchase):
        // the same one-time access-code offer the pop-up checkout shows.
        if (sessionStorage.getItem('swiftcv_offer_code') === '1') {
          sessionStorage.removeItem('swiftcv_offer_code')
          if (!d?.pin_set) setCodeOffer({ continueLabel: 'continue', next: () => {} })
        }
      }).catch(() => {})
  }, [])
  const coverIncluded = (clCredits ?? 0) > 0

  // Fetch the cover-letter balance to label the offer honestly (Included vs the
  // price). The server answers for this browser's owner, so no email is needed.
  // Best-effort; on failure we just omit the tag.
  useEffect(() => {
    if (isCoverLetter || docPaid === null) return
    fetch('/api/check-credits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then(r => r.json())
      .then(d => setClCredits(typeof d.coverLetterCredits === 'number' ? d.coverLetterCredits : 0))
      .catch(() => {})
  }, [isCoverLetter, coverLetter, docPaid])

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
        // Only send the advert when they actually chose the targeted option,
        // so switching back to "general" can't silently reuse stale text.
        body: JSON.stringify({ cv: source, jobDescription: coverMode === 'targeted' ? (coverJd || undefined) : undefined, email })
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'FREE_CAP_REACHED') setCoverErr(data.message || 'You\u2019ve used your free cover-letter previews. Purchase CV credits to keep generating.')
        else setCoverErr(data.error || 'Couldn’t build your cover letter. Please try again.')
        return
      }
      const letter = normalizeCV(data.coverLetter)
      setCoverLetter(letter)
      sessionStorage.setItem('swiftcv_coverletter', JSON.stringify(letter))
      // The letter's own saved-document id, kept apart from the CV's — it is
      // what lets its PDF and Word download cost one credit between them
      // rather than one each (see paidDocumentId).
      if (data.historyId) sessionStorage.setItem('swiftcv_cover_history_id', String(data.historyId))
      else sessionStorage.removeItem('swiftcv_cover_history_id')
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
        // historyId lets the server charge once per DOCUMENT rather than per
        // download, so PDF + Word (and any re-download) cost a single credit.
        body: JSON.stringify({ cv, templateId: template, accentColor, email, historyId: paidDocumentId() })
      })
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'ACCESS_REQUIRED') {
          setPendingDownloadKind('docx')
          setShowDownloadPinModal(true)
          return
        }
      }
      if (res.status === 402) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'NO_CREDITS') { setPendingDownload('docx'); setShowPricing(true); return }
        throw new Error('failed')
      }
      if (!res.ok) throw new Error('failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cv.fullName.replace(/\s+/g, '_')}_CV.docx`
      setHasDownloaded(true)
      setDocPaid(true)
      offerTailorAgain()
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch { alert('Download failed. Please try again.') }
    finally { setDownloading(null) }
  }

  // Right after a download is when the next application comes to mind. The
  // builder reopens on the job step with this CV and its notes already in.
  function offerTailorAgain() {
    if (activeDoc !== 'cv' || isCoverLetter || againOffered.current) return
    againOffered.current = true
    setShowReadyBanner(false)
    setShowAgainToast(true)
  }
  function tailorAgain() {
    const id = sessionStorage.getItem('swiftcv_history_id')
    router.push(id ? `/build?again=${id}` : '/build')
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
        body: JSON.stringify({ html, fullName: cv.fullName, email, isCoverLetter, historyId: paidDocumentId() }),
      })

      if (res.status === 401) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'ACCESS_REQUIRED') {
          setPendingDownloadKind('pdf')
          setShowDownloadPinModal(true)
          return
        }
      }
      if (res.status === 402) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'NO_CREDITS') { setPendingDownload('pdf'); setShowPricing(true); return }
        throw new Error(data.error || 'PDF download failed')
      }
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
      setDocPaid(true)
      offerTailorAgain()
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

  // ── Download-time pricing modal — minimal, self-contained duplicate of
  // triggerPaystack in app/build/page.tsx (kept separate rather than shared
  // while this flow is new; a fast-follow can extract a common hook once
  // it's proven stable). Retries whichever download was blocked once the
  // purchase confirms.
  function isInAppBrowser(): boolean {
    if (typeof navigator === 'undefined') return false
    return /FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|MicroMessenger/i.test(navigator.userAgent || '')
  }

  async function retryPendingDownload() {
    const kind = pendingDownload
    setShowPricing(false)
    setPendingDownload(null)
    if (kind === 'pdf') await handleDownloadPdf()
    else if (kind === 'docx') await handleDownloadDocx()
  }
  // After a purchase: finish the download that asked for it, or (from Unlock)
  // unlock the CV with the credit just bought.
  async function afterPurchase() {
    if (pendingDownload) await retryPendingDownload()
    else await unlockWithCredit()
  }

  async function confirmPreviewPayment(reference: string): Promise<boolean> {
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })
      const data = await res.json()
      if (!data.success) {
        setPurchaseError(data.error || 'We could not confirm your payment. If you completed it, wait a moment and try again.')
        return false
      }
      if (data.verificationRequired) {
        setPurchaseError('Payment received. Open the secure link in your receipt email to access your CVs and credits.')
        return false
      }
      return true
    } catch {
      setPurchaseError('Could not verify your payment. Please check your internet and try again.')
      return false
    }
  }

  async function handlePreviewManualVerify() {
    if (!paymentPending) return
    setVerifyingPayment(true)
    const { reference, cv: cvCredits } = paymentPending
    const ok = await confirmPreviewPayment(reference)
    setVerifyingPayment(false)
    if (ok) { setPaymentPending(null); await offerAccessCode(cvCredits, 'see my CV', () => { void afterPurchase() }) }
  }

  // After a pack is paid for, offer an access code once — only if this account
  // has none — then carry on with `next` whether they save one or skip.
  async function offerAccessCode(cvCredits: number, continueLabel: string, next: () => void) {
    if (cvCredits <= 1) { next(); return }
    let has = hasAccessCode
    if (!has) {
      try { has = !!(await fetch('/api/cv-pin/status', { method: 'POST', cache: 'no-store' }).then(r => r.json())).pin_set } catch { /* offer it anyway */ }
    }
    if (has) { next(); return }
    setShowPricing(false)
    setCodeOffer({ continueLabel, next })
  }

  async function triggerPreviewPaystack(pkg: typeof PACKAGES[number]) {
    setPurchaseError('')
    try {
      const res = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, packageId: pkg.id }),
      })
      const data = await res.json()
      if (!data.success) {
        setPurchaseError(data.error || 'Could not start payment. Please try again.')
        return
      }

      // Leaving this page is safe: the CV lives in sessionStorage, which
      // survives a same-tab navigation, and /payment-return brings them back
      // here (see swiftcv_pay_return).
      const goToHostedCheckout = () => {
        sessionStorage.setItem('swiftcv_pay_return', 'preview')
        leavingOnPurposeRef.current = true
        window.location.assign(data.authorization_url)
      }

      const openHostedFallback = () => {
        const popup = window.open(data.authorization_url, '_blank', 'width=500,height=700')
        // Even a new tab was blocked — navigating this one is the only route
        // left to a completed payment, same as the builder's own fallback.
        if (!popup) { goToHostedCheckout(); return }
        setPaymentPending({ reference: data.reference, cv: pkg.cv })
      }

      // In-app browsers (WhatsApp/Instagram/Facebook webviews) can't reliably
      // run the popup OR window.open, so go straight to the hosted page.
      if (isInAppBrowser()) { goToHostedCheckout(); return }

      const openPopup = () => {
        const PaystackPop = (window as any).PaystackPop
        if (!PaystackPop) { openHostedFallback(); return }
        try {
          const instance = new PaystackPop()
          instance.resumeTransaction(data.access_code, {
            onSuccess: async () => {
              // The access-code offer, when due, appears at once with the payment
              // confirming behind it, instead of after a silent pause.
              const confirmed = confirmPreviewPayment(data.reference)
              const finish = async () => { if (await confirmed) await afterPurchase() }
              if (pkg.cv > 1 && !hasAccessCode) { setShowPricing(false); setCodeOffer({ continueLabel: 'see my CV', next: () => { void finish() } }) }
              else await finish()
            },
            onCancel: () => setPurchaseError('Payment was not completed.'),
            onError: () => openHostedFallback(),
          })
        } catch {
          openHostedFallback()
        }
      }

      if ((window as any).PaystackPop) {
        openPopup()
      } else {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v2/inline.js'
        script.onload = openPopup
        script.onerror = openHostedFallback
        document.body.appendChild(script)
      }
    } catch {
      setPurchaseError('Could not start payment. Please check your internet and try again.')
    }
  }

  function buildPdfHtml(cvMarkup: string, tplId: TemplateId) {
    // Cover letters render through the CoverLetter component (not the paginated
    // engine), so they have no flow document — never take the flow path for
    // them, or the flow CSS would hide their content. This mirrors CVPreview's
    // own isCL(cv) = !!cv.coverLetterBody branch.
    // ── Cover letter: one flowing formal letter, NOT the packed CV engine ──
    // The letter renders as a single page div whose children are the sender
    // block, recipient block and paragraphs. The packed engine's
    // "#cv-print-area > div > div { width:210mm; height:297mm; break-after }"
    // rule would turn every one of those blocks into its own full A4 page —
    // so cover letters get their own minimal wrapper: A4 sheet, the letter's
    // own padding as margins, content free to flow (and spill to a 2nd sheet
    // if long) rather than being sliced or clipped.
    if (cv?.coverLetterBody) {
      return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${PRINT_FONTS_HREF}" />
  <style>
    @page { size: A4; margin: 0; }
    html, body { width: 210mm; margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #cv-print-area { width: 210mm; max-width: 210mm; margin: 0; padding: 0; background: white; }
    /* the letter page: fill the sheet width, flow naturally, never clip */
    #cv-print-area > div { width: 210mm !important; min-height: 297mm; height: auto !important; margin: 0 !important; overflow: visible !important; }
  </style>
</head>
<body>
  ${cvMarkup}
</body>
</html>`
    }

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
    [data-flow-allow-block-split] [data-flow-block]:not([data-flow-head]),
    [data-flow-allow-block-split] [data-flow-block]:not([data-flow-head]) * { break-inside: auto !important; page-break-inside: auto !important; }
    [data-flow-allow-block-split] [data-flow-head] { break-inside: avoid; page-break-inside: avoid; }
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
      sessionStorage.removeItem('swiftcv_email')
      sessionStorage.removeItem('swiftcv_history_id')
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
  const mobileScale = Math.min(1, (typeof window !== 'undefined' ? window.innerWidth : 375) / 820)
  // Phone text runs a little larger than desktop: the same 12.5–13px that reads
  // fine on a laptop is hard work on a small screen held at arm's length.
  const fs = (px: number) => `${isMobile ? px + 1.5 : px}px`
  const mobilePickLabel = { fontSize:'12px', fontWeight:600, letterSpacing:'0.4px', color:'#64748b' }
  // Opening Templates / Colour brings the CV's top up to just below the header,
  // so the part that changes is in view above the panel while they tap.
  // The toasts sit just above the bottom bar, right where the panel and the
  // PDF / Word menu open, so they close first or they'd cover them.
  function openLookPanel(which: 'template' | 'colour') {
    setShowDownloadMenu(false)
    setShowReadyBanner(false)
    setShowAgainToast(false)
    setLookPanel(which)
    const el = cvWrapRef.current
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 52, behavior: 'smooth' })
  }
  function openEditor() {
    setLookPanel(null)
    setShowDownloadMenu(false)
    setActiveTab('edit')
    window.scrollTo({ top: 0 })
  }
  const docWord = isCoverLetter ? 'letter' : 'CV'
  const barButton = (label: string, icon: React.ReactNode, onClick: () => void, active: boolean) => (
    <button onClick={onClick} aria-pressed={active} style={{ flex:'0 0 66px', display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', padding:'6px 0', background: active ? '#f0fdf9' : 'none', borderRadius:'12px', border:'none', cursor:'pointer', color: active ? '#0f766e' : '#334155', fontFamily:"'DM Sans', sans-serif", fontSize:'12px', fontWeight:600 }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      {label}
    </button>
  )
  const barCta = { display:'flex', alignItems:'center', gap:'7px', padding:'11px 18px', background:'#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'14.5px', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' as const, fontFamily:"'DM Sans', sans-serif" }
  const zoomScale = Math.min(1, ((typeof window !== 'undefined' ? window.innerWidth : 375) - 24) / 794) * zoomLevel
  const menuItems = [
    { label: 'My CVs', onClick: () => setShowHistoryModal(true), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { label: 'Check my balance', onClick: () => setShowBalanceModal(true), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14.5" r="1" fill="currentColor" stroke="none"/></svg> },
    { label: 'New CV', onClick: handleNewCV, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg> },
    { label: 'Cover Letter', onClick: () => { setCoverErr(''); setShowCoverModal(true) }, icon: <span style={{ color: '#0d9488' }}>✦</span> },
  ]

  // The protected-preview layer, shared by the page and the full-size viewer.
  // It sits OUTSIDE #cv-print-area: the PDF is built from that element's HTML,
  // so nothing in it may ever reach a file.
  const protectedProps = docPaid === true ? { style: { position: 'relative' as const } } : {
    style: { position: 'relative' as const, userSelect: 'none' as const, WebkitUserSelect: 'none' as const, WebkitTouchCallout: 'none' as const },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  }
  const watermark = docPaid !== true && (
    <div className="no-print" aria-hidden="true" style={{
      position:'absolute', inset:0, zIndex:5, cursor:'default',
      backgroundImage: "url(\"data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='340' height='210'><g transform='rotate(-28 170 105)' fill='rgba(7,24,44,0.16)' font-family='Arial,Helvetica,sans-serif' font-weight='700' text-anchor='middle'><text x='170' y='100' font-size='32' letter-spacing='5'>PREVIEW</text><text x='170' y='128' font-size='13' letter-spacing='1.5'>RemarkableCV · unlock to download</text></g></svg>") + "\")",
      backgroundRepeat:'repeat',
    }} />
  )

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
          email,
          amount: 500, // GH₵5 — Paystack amounts are in pesewas (GH₵1 = 100)
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
          email,
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
    <div style={{ minHeight:'100vh', background:'#faf7f1' }}>
      {/* Load premium fonts for screen + print */}
      <link rel="stylesheet" href={PRINT_FONTS_HREF} />

      {docPaid !== true && (
        <style>{`@media print { #cv-print-area { display: none !important; } body::before { content: "Unlock your finished CV at remarkablecv.com to print or download it."; display: block; padding: 40px; font: 16px sans-serif; } }`}</style>
      )}

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
        @media (max-width:767px) { .scv-toast-wrap { left:16px; right:16px; bottom:calc(76px + env(safe-area-inset-bottom)); width:auto; max-width:none; } }
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
        .scv-tpl:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }
        .scv-swatch:focus-visible { outline: 2px solid #0f766e; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .scv-tpl { transition: none; } .scv-tpl:hover { transform: none; } }
      `}</style>

      {isMobile ? (
        /* Phone: one slim bar — Menu, logo, CV / Letter. Everything that acts on
           the document (Edit, Templates, Colour, Download) is in the bottom bar,
           within thumb reach, so the CV gets the screen in between. */
        <nav className="no-print" style={{ background:'#0a0f1a', padding:'5px 10px 5px 4px', display:'flex', alignItems:'center', gap:'4px', position:'sticky', top:0, zIndex:50 }}>
          <HeaderMenu iconOnly items={menuItems} />
          <a href="/" title="Back to home" style={{ flex:1, fontFamily:"'Cormorant Garamond', serif", fontSize:'1.15rem', fontWeight:600, color:'white', textDecoration:'none', whiteSpace:'nowrap' }}>Remarkable <span style={{ color:'#5eead4' }}>CV</span></a>
          {cvType !== 'cover_letter' && (
            <div style={{ display:'flex', background:'rgba(255,255,255,0.1)', borderRadius:'50px', padding:'3px' }}>
              <button onClick={showCvDoc} style={{ padding:'6px 13px', borderRadius:'50px', fontSize:'13px', fontWeight:600, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background: activeDoc==='cv' ? '#0d9488' : 'transparent', color: activeDoc==='cv' ? 'white' : 'rgba(255,255,255,0.75)' }}>CV</button>
              <button onClick={() => { if (coverLetter) showCoverDoc(); else { setCoverErr(''); setShowCoverModal(true) } }} style={{ padding:'6px 13px', borderRadius:'50px', fontSize:'13px', fontWeight:600, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background: activeDoc==='cover' ? '#0d9488' : 'transparent', color: activeDoc==='cover' ? 'white' : 'rgba(255,255,255,0.75)' }}>Letter</button>
            </div>
          )}
        </nav>
      ) : (
      <nav className="no-print" style={{ background:'#0a0f1a', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50, flexWrap:'wrap', gap:'10px' }}>
        {/* The logo is the universal "get me home" control — clicking it
            leaves the preview for the home page, so the header is never a
            dead end even if someone misses the menu. */}
        <a href="/" title="Back to home" style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.25rem', fontWeight:600, color:'white', textDecoration:'none', cursor:'pointer', whiteSpace:'nowrap' }}>Remarkable <span style={{ color:'#5eead4' }}>CV</span></a>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.08)', borderRadius:'50px', padding:'3px', gap:'2px' }}>
          {/* Inactive tab was rgba(255,255,255,0.4) at weight 400 — near
              invisible on the dark bar, so people could not find Edit. */}
          <button onClick={() => setActiveTab('preview')} style={{ padding:'7px 18px', borderRadius:'50px', fontSize:'12.5px', fontWeight:activeTab==='preview'?600:500, background:activeTab==='preview'?'white':'none', color:activeTab==='preview'?'#0a0f1a':'rgba(255,255,255,0.72)', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Preview</button>
          {/* "Edit with AI" is dropped for now: Edit goes straight to manual
              editing. The chooser + AI-revision flow below are left intact but
              unreachable, so re-enabling is a one-line change (setShowChooser). */}
          <button onClick={() => setActiveTab('edit')} style={{ padding:'7px 18px', borderRadius:'50px', fontSize:'12.5px', fontWeight:activeTab==='edit'?600:500, background:activeTab==='edit'?'white':'none', color:activeTab==='edit'?'#0a0f1a':'rgba(255,255,255,0.72)', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Edit</button>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <HeaderMenu items={menuItems} />
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowDownloadMenu(v => !v)} disabled={!!downloading} style={{ padding: isMobile ? '9px 14px' : '8px 16px', background:'rgba(255,255,255,0.1)', color:'white', border:'none', borderRadius:'50px', fontSize:fs(13), fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', whiteSpace:'nowrap' }}>
              {downloading ? <>Preparing<span className="scv-dots">…</span></> : <><DownIcon /> Download <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ marginLeft:'-1px' }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
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
      )}

      {activeTab === 'preview' && showReadyBanner && (
        <div className="no-print scv-toast-wrap" onMouseEnter={() => setBannerPaused(true)} onMouseLeave={() => setBannerPaused(false)}>
          <div className="scv-toast">
            <div className="scv-toast-sheen" />
            <div className="scv-check" style={{ width:'26px', height:'26px', borderRadius:'50%', background:'linear-gradient(140deg,#14b8a6,#0a5d55)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px -2px rgba(13,148,136,0.5)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="scv-btitle" style={{ fontFamily:"'Cormorant Garamond', serif", fontSize: isMobile ? '1.15rem' : '1.02rem', fontWeight:600, letterSpacing:'0.2px', lineHeight:1.15, color:'#0a0f1a' }}>{docPaid === true ? 'Your CV is ready' : 'Your preview is ready'}</div>
              <div className="scv-bsub" style={{ fontSize:fs(11.5), color:'#64748b', marginTop:'1px' }}>{docPaid === true ? (isMobile ? 'Download it any time from the bar below.' : 'Download it any time from the top bar.') : 'Unlock your finished CV to download it.'}</div>
            </div>
            <button className="scv-x" onClick={() => setShowReadyBanner(false)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:'3px', display:'flex', borderRadius:'8px', alignSelf:'flex-start' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            <div className="scv-toast-timer" data-paused={bannerPaused} onAnimationEnd={() => setShowReadyBanner(false)} />
          </div>
        </div>
      )}
      {activeTab === 'preview' && showAgainToast && (
        <div className="no-print scv-toast-wrap" onMouseEnter={() => setBannerPaused(true)} onMouseLeave={() => setBannerPaused(false)}>
          <div className="scv-toast">
            <div className="scv-toast-sheen" />
            <div className="scv-check" style={{ width:'26px', height:'26px', borderRadius:'50%', background:'linear-gradient(140deg,#14b8a6,#0a5d55)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px -2px rgba(13,148,136,0.5)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="scv-btitle" style={{ fontFamily:"'Cormorant Garamond', serif", fontSize: isMobile ? '1.15rem' : '1.02rem', fontWeight:600, letterSpacing:'0.2px', lineHeight:1.15, color:'#0a0f1a' }}>Downloaded</div>
              <div className="scv-bsub" style={{ fontSize:fs(11.5), color:'#64748b', marginTop:'1px' }}>Applying somewhere else?</div>
              <button onClick={tailorAgain} style={{ background:'none', border:'none', padding:'4px 0 0', color:'#0a8a3f', fontWeight:600, fontSize:fs(12.5), cursor:'pointer', fontFamily:"'DM Sans', sans-serif", textAlign:'left' }}>Tailor this CV for another job →</button>
            </div>
            <button className="scv-x" aria-label="Close" onClick={() => setShowAgainToast(false)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:'3px', display:'flex', borderRadius:'8px', alignSelf:'flex-start' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            <div className="scv-toast-timer" data-paused={bannerPaused} style={{ animationDuration:'10s' }} onAnimationEnd={() => setShowAgainToast(false)} />
          </div>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns: (isCoverLetter || isMobile) ? '1fr' : '260px 1fr', minHeight:'calc(100vh - 57px)' }}>
        {!isCoverLetter && !isMobile && (
          <div className="no-print" style={{ background:'white', borderRight:'1px solid #e2e8f0', padding:'22px 20px', overflowY:'auto', height:'calc(100vh - 57px)' }}>

            {/* ── COLOUR — always visible, premium ── */}
            {currentTpl?.customizable && (
              <div style={{ marginBottom:'22px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'#475569', marginBottom:'12px' }}>Choose Colour</div>
                <div role="group" aria-label="Accent colour" style={{ display:'flex', gap:'9px', flexWrap:'wrap' }}>
                  <button onClick={() => setAccentColor(null)} className="scv-swatch" title="Default" aria-label="Template default colour" aria-pressed={accentColor === null} style={{ width:'26px', height:'26px', borderRadius:'50%', background: currentTpl.color, cursor:'pointer', padding:0, border:'none', boxShadow: accentColor === null ? `0 0 0 2px #fff, 0 0 0 4px ${currentTpl.color}` : '0 0 0 1px #e2e8f0', transition:'all 0.15s' }} />
                  {COLOR_SWATCHES.map(s => (
                    <button key={s.value} onClick={() => setAccentColor(s.value)} className="scv-swatch" title={s.name} aria-label={s.name} aria-pressed={accentColor === s.value} style={{ width:'26px', height:'26px', borderRadius:'50%', background: s.value, cursor:'pointer', padding:0, border:'none', boxShadow: accentColor === s.value ? `0 0 0 2px #fff, 0 0 0 4px ${s.value}` : '0 0 0 1px #e2e8f0', transition:'all 0.15s' }} />
                  ))}
                </div>
              </div>
            )}
            <div style={{ height:'1px', background:'#eef2f6', margin:'0 0 18px' }} />

            <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'#475569', marginBottom:'12px' }}>Choose Template</div>

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

        <div style={{ padding: isMobile ? `${activeTab === 'preview' ? 8 : 16}px 0 ${lookPanel ? 330 : 84}px` : '24px', overflowY:'auto', overflowX: isMobile ? 'hidden' : 'auto', background:'#f1f5f9' }}>
          {/* CV / Cover Letter switch — shown to EVERYONE on a CV, not only
              once a letter exists. It's how people discover the letter at all:
              if none has been made yet, the tab opens the generate sheet (which
              states the price or "Included"), so it doubles as the offer. */}
          {!isMobile && cvType !== 'cover_letter' && (
            <div className="no-print" style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom: isMobile ? '12px' : '18px', padding: isMobile ? '0 14px' : 0 }}>
              {cvType !== 'cover_letter' && (
              <div style={{ display:'inline-flex', background:'white', border:'1px solid #e2e8f0', borderRadius:'50px', padding:'4px', boxShadow:'0 2px 8px rgba(10,15,26,0.06)' }}>
                <button onClick={showCvDoc} style={{ padding: isMobile ? '8px 16px' : '8px 20px', borderRadius:'50px', fontSize:fs(13), fontWeight:600, border:'none', cursor:'pointer', background: activeDoc==='cv' ? '#0d9488' : 'transparent', color: activeDoc==='cv' ? 'white' : '#64748b' }}>CV</button>
                {/* No price badge here — the generate sheet states the price
                    (or "Included") right where the decision is made, so
                    repeating it on the tab is noise. */}
                <button
                  onClick={() => { if (coverLetter) showCoverDoc(); else { setCoverErr(''); setShowCoverModal(true) } }}
                  style={{ padding: isMobile ? '8px 16px' : '8px 20px', borderRadius:'50px', fontSize:fs(13), fontWeight:600, border:'none', cursor:'pointer', background: activeDoc==='cover' ? '#0d9488' : 'transparent', color: activeDoc==='cover' ? 'white' : '#64748b' }}>
                  Cover Letter
                </button>
              </div>
              )}
            </div>
          )}
          {docPaid !== true && activeTab === 'preview' && !isMobile && (
            <div className="no-print" style={{ maxWidth:'210mm', margin:'0 auto 14px' }}>
              <div style={{ background:'white', border:'1px solid #bff0e4', borderRadius:'14px', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' as const, boxShadow:'0 2px 8px rgba(10,15,26,0.05)' }}>
                <div style={{ fontSize:'13.5px', color:'#0a0f1a', lineHeight:1.5, flex:'1 1 240px' }}>
                  <strong>This is your preview.</strong> Unlock your finished {isCoverLetter ? 'cover letter' : 'CV'} to download it as a ready-to-submit PDF or Word file.
                </div>
                <button onClick={() => void unlockDocument()} disabled={unlocking} style={{ padding:'11px 20px', background:'#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'13.5px', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans', sans-serif", whiteSpace:'nowrap' as const, opacity: unlocking ? 0.7 : 1 }}>
                  {unlocking ? 'Unlocking…' : `Unlock your finished ${isCoverLetter ? 'cover letter' : 'CV'}`}
                </button>
              </div>
            </div>
          )}
          {activeTab === 'preview' ? (<>
            <div ref={cvWrapRef} style={isMobile ? {
              width: '100vw',
              display: 'flex',
              justifyContent: 'center',
              height: cvBoxHeight ? `${Math.ceil(cvBoxHeight * mobileScale)}px` : undefined,
              overflow: 'hidden',
              position: 'relative',
            } : {}}>
            <div ref={cvBoxRef} style={isMobile ? {
              transformOrigin: 'top center',
              transform: `scale(${mobileScale})`,
              width: '210mm',
              flexShrink: 0,
              // Its own content height, not stretched to the wrapper: the wrapper
              // is sized FROM this height, so stretching would lock both small.
              alignSelf: 'flex-start',
            } : { background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'visible', boxShadow:'0 8px 40px rgba(0,0,0,0.1)', width:'210mm', maxWidth:'210mm', margin:'0 auto' }}>
              <div {...protectedProps}>
                <div id="cv-print-area">
                  <CVPreview cv={cv} templateId={template} accentColor={accentColor} />
                </div>
                {watermark}
              </div>
            </div>
            {isMobile && (
              // Full screen only when they choose it: a tap or double-tap on the CV
              // itself (often just scrolling, or trying to zoom) shouldn't throw
              // them into another view.
              <button type="button" className="no-print" onClick={openZoom} aria-label={`Expand your ${docWord} to full screen`} style={{ position:'absolute', right:'10px', top:'8px', zIndex:6, width:'40px', height:'40px', borderRadius:'50%', border:'none', padding:0, cursor:'pointer', background:'rgba(10,15,26,0.82)', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              </button>
            )}
            </div>
          </>) : (
            <div data-cv-editor style={{ maxWidth:'720px', margin:'0 auto' }}>
              <button onClick={() => setActiveTab('preview')} className="no-print" style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', background:'white', border:'1px solid #e2e8f0', borderRadius:'50px', fontSize:'12.5px', fontWeight:600, color:'#0a0f1a', cursor:'pointer', margin: isMobile ? '0 14px 14px' : '0 0 18px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5m0 0l6 6m-6-6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Back to preview</button>
              <CVEditor cv={cv} updateCV={updateCV} />
            </div>
          )}
        </div>
      </div>

      {/* PHONE BOTTOM BAR — the actions that work on the document, labelled and
          within thumb reach wherever they have scrolled. The money button is
          the last one: "Unlock" on a preview, "Download" once paid. */}
      {isMobile && (
        <div className="no-print" style={{ position:'fixed', left:0, right:0, bottom:0, zIndex:70, background:'white', borderTop:'1px solid #e2e8f0', boxShadow:'0 -4px 16px rgba(10,15,26,0.06)', paddingBottom:'env(safe-area-inset-bottom)', fontFamily:"'DM Sans', sans-serif" }}>
          {activeTab === 'edit' ? (
            <div style={{ padding:'9px 14px' }}>
              <button onClick={() => { setActiveTab('preview'); window.scrollTo({ top: 0 }) }} style={{ width:'100%', padding:'12px', background:'#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'15px', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>
                Done · see it on your {docWord}
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:'2px', height:'60px', padding:'0 10px 0 4px' }}>
              {barButton('Edit', <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>, openEditor, false)}
              {!isCoverLetter && barButton('Templates', <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/></>, () => lookPanel === 'template' ? setLookPanel(null) : openLookPanel('template'), lookPanel === 'template')}
              {!isCoverLetter && currentTpl?.customizable && barButton('Colour', <><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/><path d="M12 21a2.5 2.5 0 010-5h1.5a2.5 2.5 0 002.5-2.5"/></>, () => lookPanel === 'colour' ? setLookPanel(null) : openLookPanel('colour'), lookPanel === 'colour')}
              <div style={{ position:'relative', marginLeft:'auto' }}>
                {docPaid === true ? (
                  <button onClick={() => { setLookPanel(null); setShowReadyBanner(false); setShowAgainToast(false); setShowDownloadMenu(v => !v) }} disabled={!!downloading} style={barCta}>
                    {downloading ? <>Preparing<span className="scv-dots">…</span></> : <><DownIcon /> Download</>}
                  </button>
                ) : (
                  <button onClick={() => { setLookPanel(null); setShowReadyBanner(false); void unlockDocument() }} disabled={unlocking} style={barCta}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.5-2"/></svg>
                    {unlocking ? <>Unlocking<span className="scv-dots">…</span></> : `Unlock ${docWord}`}
                  </button>
                )}
                {showDownloadMenu && docPaid === true && (
                  <div style={{ position:'absolute', bottom:'calc(100% + 12px)', right:0, background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', boxShadow:'0 12px 30px -6px rgba(10,15,26,0.25)', overflow:'hidden', minWidth:'180px' }}>
                    <button onClick={() => { setShowDownloadMenu(false); handleDownloadPdf() }} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', textAlign:'left', padding:'14px 16px', background:'white', border:'none', borderBottom:'1px solid #f1f5f9', fontSize:'14.5px', fontWeight:600, color:'#0a0f1a', cursor:'pointer' }}><DownIcon/> Download PDF</button>
                    <button onClick={() => { setShowDownloadMenu(false); handleDownloadDocx() }} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', textAlign:'left', padding:'14px 16px', background:'white', border:'none', fontSize:'14.5px', fontWeight:600, color:'#0a0f1a', cursor:'pointer' }}><DownIcon/> Download Word</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PHONE TEMPLATES / COLOUR PANEL — sits on the bottom bar with no
          backdrop, so the CV above changes live with each tap and several
          looks can be tried before "Done". */}
      {isMobile && lookPanel && activeTab === 'preview' && !isCoverLetter && (
        <div className="no-print scv-sheet" style={{ position:'fixed', left:0, right:0, bottom:'calc(60px + env(safe-area-inset-bottom))', zIndex:65, background:'white', borderRadius:'18px 18px 0 0', boxShadow:'0 -10px 30px rgba(10,15,26,0.14)', padding:'8px 0 10px', fontFamily:"'DM Sans', sans-serif" }}>
          <div style={{ width:'36px', height:'4px', borderRadius:'99px', background:'#e2e8f0', margin:'0 auto 6px' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 16px 6px' }}>
            <span style={mobilePickLabel}>{lookPanel === 'colour' ? 'Colour' : `Template · ${premiumTemplates.length + atsTemplates.length} designs`}</span>
            <button onClick={() => setLookPanel(null)} style={{ background:'none', border:'none', color:'#0d9488', fontSize:'14.5px', fontWeight:700, cursor:'pointer', padding:'6px 0', fontFamily:"'DM Sans', sans-serif" }}>Done</button>
          </div>
          {lookPanel === 'colour' && currentTpl?.customizable ? (
            <div role="group" aria-label="Accent colour" style={{ display:'flex', flexWrap:'wrap', gap:'9px', padding:'4px 16px 6px' }}>
              <button onClick={() => setAccentColor(null)} className="scv-swatch" title="Default" aria-label="Template default colour" aria-pressed={accentColor === null} style={{ width:'26px', height:'26px', flexShrink:0, borderRadius:'50%', background: currentTpl.color, cursor:'pointer', padding:0, border:'none', boxShadow: accentColor === null ? `0 0 0 2px #fff, 0 0 0 4px ${currentTpl.color}` : '0 0 0 1px #e2e8f0' }} />
              {COLOR_SWATCHES.map(s => (
                <button key={s.value} onClick={() => setAccentColor(s.value)} className="scv-swatch" title={s.name} aria-label={s.name} aria-pressed={accentColor === s.value} style={{ width:'26px', height:'26px', flexShrink:0, borderRadius:'50%', background: s.value, cursor:'pointer', padding:0, border:'none', boxShadow: accentColor === s.value ? `0 0 0 2px #fff, 0 0 0 4px ${s.value}` : '0 0 0 1px #e2e8f0' }} />
              ))}
            </div>
          ) : (
            /* The fade on the right edge says there is more to swipe; it goes
               once the last design is in view, so it never hides the end. */
            <div style={{ position:'relative' }}>
              <div onScroll={e => { const t = e.currentTarget; setStripAtEnd(t.scrollLeft + t.clientWidth >= t.scrollWidth - 8) }} style={{ display:'flex', gap:'10px', overflowX:'auto', padding:'4px 16px 6px', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch' }}>
                {[...premiumTemplates, ...atsTemplates].map(tpl => (
                  <div key={tpl.id} style={{ flex:'0 0 108px', scrollSnapAlign:'start' }}>
                    <TemplateCard tpl={tpl} large active={template === tpl.id} onClick={() => setTemplate(tpl.id)} />
                  </div>
                ))}
              </div>
              <div aria-hidden="true" style={{ position:'absolute', top:0, right:0, bottom:0, width:'56px', pointerEvents:'none', background:'linear-gradient(90deg, rgba(255,255,255,0), #fff 85%)', opacity: stripAtEnd ? 0 : 1, transition:'opacity .2s ease' }} />
            </div>
          )}
        </div>
      )}

      {/* COVER LETTER MODAL */}
      {showCoverModal && (
        <div onClick={() => !coverGenerating && setShowCoverModal(false)} className="no-print scv-scrim" style={{ position:'fixed', inset:0, background:'rgba(8,13,24,0.5)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)', zIndex:210, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} className="scv-sheet" style={{ background:'white', borderRadius:'20px', width:'100%', maxWidth:'440px', padding:'22px', boxShadow:'0 1px 3px rgba(10,15,26,0.08), 0 24px 60px -12px rgba(10,15,26,0.34)', fontFamily:"'DM Sans', sans-serif" }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
              <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.42rem', fontWeight:600, lineHeight:1.15, color:'#0a0f1a' }}>Build a cover letter</div>
              <button onClick={() => !coverGenerating && setShowCoverModal(false)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:'6px', display:'flex' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            </div>
            <p style={{ fontSize:'12.5px', color:'#64748b', lineHeight:1.5, margin:'0 0 14px' }}>Written from your CV. Choose the kind of letter you need.</p>

            {/* Two clear choices. The advert field only opens for the targeted
                option, so the general path stays a single click. */}
            <div style={{ display:'grid', gap:'9px' }}>
              {([
                { id:'general' as const, title:'General cover letter', desc:'Works for most applications — no advert needed.' },
                { id:'targeted' as const, title:'For a specific role', desc:'Tailored to a job advert you paste or upload.' },
              ]).map(opt => {
                const on = coverMode === opt.id
                return (
                  <button key={opt.id} onClick={() => setCoverMode(opt.id)}
                    style={{ display:'flex', alignItems:'flex-start', gap:'11px', width:'100%', textAlign:'left', cursor:'pointer',
                      background: on ? '#f6fdfb' : 'white', border: on ? '2px solid #0d9488' : '1px solid #e7ebf0',
                      borderRadius:'14px', padding: on ? '12px 13px' : '13px 14px', fontFamily:"'DM Sans', sans-serif" }}>
                    <span style={{ width:'17px', height:'17px', flexShrink:0, marginTop:'1px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background: on ? '#0d9488' : 'transparent', border: on ? 'none' : '1.5px solid #e2e8f0' }}>
                      {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <span>
                      <span style={{ display:'block', fontSize:'13.5px', fontWeight:600, color:'#0a0f1a' }}>{opt.title}</span>
                      <span style={{ display:'block', fontSize:'12px', color:'#64748b', marginTop:'2px', lineHeight:1.5 }}>{opt.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {coverMode === 'targeted' && (
              <div style={{ marginTop:'12px' }}>
                <textarea value={coverJd} onChange={e => setCoverJd(e.target.value)} placeholder="Paste the job advert here…" rows={4} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px 14px', fontSize:'13px', fontFamily:"'DM Sans', sans-serif", resize:'vertical', outline:'none', boxSizing:'border-box' }} />
                <label style={{ display:'inline-flex', alignItems:'center', gap:'7px', marginTop:'10px', fontSize:'12px', color:'#0d9488', fontWeight:600, cursor:'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {coverReadingFile ? 'Reading file…' : 'Or upload the advert (image, PDF, Word)'}
                  <input type="file" accept="image/*,application/pdf,.doc,.docx" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) readCoverFile(f) }} />
                </label>
              </div>
            )}

            {coverErr && <div style={{ marginTop:'12px', fontSize:'12.5px', color:'#b91c1c', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', padding:'10px 12px' }}>{coverErr}</div>}

            {coverGenerating ? (
              <div style={{ marginTop:'18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'8px' }}>
                  <span style={{ fontSize:'13px', fontWeight:600, color:'#0a0f1a' }}>Writing your cover letter…</span>
                  <span style={{ fontSize:'12px', fontWeight:600, color:'#0d9488' }}>{coverPct}%</span>
                </div>
                <div style={{ height:'7px', background:'#e9eef4', borderRadius:'99px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${coverPct}%`, background:'linear-gradient(90deg,#0d9488,#5eead4)', borderRadius:'99px', transition:'width .25s ease' }} />
                </div>
                <div style={{ textAlign:'center', fontSize:'11.5px', color:'#64748b', marginTop:'10px' }}>Usually about 20 seconds — please keep this open.</div>
              </div>
            ) : (
              <>
                <button onClick={handleGenerateCover} disabled={coverReadingFile} style={{ width:'100%', marginTop:'16px', padding:'13px', background:'#0d9488', color:'white', border:'none', borderRadius:'50px', fontSize:'14px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  <span style={{ color:'#fff' }}>✦</span> Build my cover letter
                </button>
                <div style={{ textAlign:'center', fontSize:'11px', color:'#64748b', marginTop:'10px' }}>{coverIncluded ? 'Included in your pack' : `GH₵${COVER_LETTER_PRICE}`} · takes about 20 seconds</div>
              </>
            )}
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

            {/* "Edit with AI" (whole-CV revision panel) deactivated for now —
                a future feature, not ready to ship. Its code (showRevision,
                handleRevision/doRevision, the revision panel below) is left
                in place to resume from later; this is just the entry point. */}
            <button className="scv-opt" onClick={() => { setShowChooser(false); setActiveTab('edit') }} style={{ display:'flex', gap:'14px', alignItems:'center', width:'calc(100% - 16px)', margin:'0 8px', textAlign:'left', padding:'15px', background:'white', border:'1px solid #e7ebf0', borderRadius:'14px', cursor:'pointer' }}>
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

      {/* ZOOM VIEW (phone) — opens with the whole page fitted to the screen, so
          nothing is ever cut off, then + / − enlarge it (pinch works too). It is a
          copy of the laid-out page, outside #cv-print-area, so it never touches
          what the PDF is built from; protected like the page. */}
      {cvZoomed && isMobile && activeTab === 'preview' && (
        <div className="no-print" role="dialog" aria-modal="true" aria-label={`Your ${docWord} zoomed`} style={{ position:'fixed', inset:0, zIndex:300, background:'#e2e8f0', display:'flex', flexDirection:'column', fontFamily:"'DM Sans', sans-serif" }}>
          {/* A full-screen view reads as a page, so it gets a page's back arrow
              (and the phone's own back button does the same — see closeZoom). */}
          <div style={{ display:'flex', alignItems:'center', padding:'6px 8px', background:'#0a0f1a' }}>
            <button onClick={closeZoom} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 12px', background:'none', color:'white', border:'none', fontSize:'15px', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
          </div>
          <div style={{ flex:1, overflow:'auto', WebkitOverflowScrolling:'touch', position:'relative' }}>
            <div style={{ width:`${Math.ceil(794 * zoomScale)}px`, height: zoomBoxHeight ? `${Math.ceil(zoomBoxHeight * zoomScale)}px` : undefined, margin:'12px', overflow:'hidden', boxShadow:'0 4px 20px rgba(10,15,26,0.12)' }}>
              <div ref={zoomBoxRef} style={{ width:'210mm', background:'white', transform:`scale(${zoomScale})`, transformOrigin:'top left' }}>
                <div {...protectedProps}>
                  {/* CVPreview hides its print-only pages on screen with a rule scoped to
                      #cv-print-area; the copy needs the same rule under its own marker. */}
                  <style>{`[data-zoom-copy] > div > div:not([data-screen-doc]):not([data-measure-pass]) { display: none !important; }`}</style>
                  <div data-zoom-copy dangerouslySetInnerHTML={{ __html: zoomHtml }} />
                  {watermark}
                </div>
              </div>
            </div>
          </div>
          <div style={{ position:'absolute', right:'14px', bottom: docPaid === true ? '18px' : '78px', display:'flex', flexDirection:'column', gap:'8px' }}>
            {([['Zoom in', 0.5, 'M12 5v14M5 12h14'], ['Zoom out', -0.5, 'M5 12h14']] as const).map(([label, step, d]) => (
              <button key={label} aria-label={label} onClick={() => setZoomLevel(z => Math.min(2.5, Math.max(1, z + step)))} style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#0a0f1a', color:'white', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 4px 12px rgba(10,15,26,0.25)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d={d}/></svg>
              </button>
            ))}
          </div>
          {docPaid !== true && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', padding:'10px 14px', background:'white', borderTop:'1px solid #e2e8f0' }}>
              <span style={{ fontSize:'14px', color:'#0a0f1a' }}><strong>Preview.</strong> Unlock to download.</span>
              <button onClick={() => { closeZoom(); void unlockDocument() }} disabled={unlocking} style={barCta}>Unlock {docWord}</button>
            </div>
          )}
        </div>
      )}

      <CVHistoryModal open={showDownloadPinModal} initialEmail={email} onClose={() => setShowDownloadPinModal(false)} />

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

      {showPricing && (
        <div onClick={() => { setShowPricing(false); setPendingDownload(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(8,13,24,0.6)', backdropFilter: 'blur(4px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '22px', width: '100%', maxWidth: '440px', padding: '28px 26px', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', fontFamily: "'DM Sans', sans-serif", maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 600, color: '#0a0f1a', lineHeight: 1.15 }}>Choose your credits</div>
              <button onClick={() => { setShowPricing(false); setPendingDownload(null) }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', display: 'flex' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>Your {isCoverLetter ? 'letter' : 'CV'} is ready — one credit unlocks it for download. Credits never expire.</p>

            {purchaseError && <div style={{ fontSize: '12.5px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px' }}>{purchaseError}</div>}

            {paymentPending ? (
              <div style={{ background: '#f0fdf9', border: '1px solid #bff0e4', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0a0f1a', marginBottom: '4px' }}>Complete payment in the window that opened</div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '12px', lineHeight: 1.6 }}>Once you&apos;ve paid, click below to confirm — your {isCoverLetter ? 'letter' : 'CV'} unlocks right after.</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                  <button onClick={handlePreviewManualVerify} disabled={verifyingPayment} style={{ padding: '11px 20px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '50px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', opacity: verifyingPayment ? 0.6 : 1 }}>
                    {verifyingPayment ? 'Checking…' : 'Verify Payment'}
                  </button>
                  <button onClick={() => setPaymentPending(null)} style={{ padding: '11px 20px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '50px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <CreditPicker packages={packagesForDoc(isCoverLetter)} onContinue={pkg => { void triggerPreviewPaystack(pkg) }} />
            )}

            {!paymentPending && (
              <button type="button" onClick={() => { setShowPricing(false); setPendingDownload(null); setShowHistoryModal(true) }}
                style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#15803d', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Already purchased? Access your credits
              </button>
            )}
          </div>
        </div>
      )}

      {codeOffer && (
        <AccessCodePrompt continueLabel={codeOffer.continueLabel} onDone={saved => {
          if (saved) setHasAccessCode(true)
          const next = codeOffer.next
          setCodeOffer(null)
          next()
        }} />
      )}

      <CVHistoryModal open={showHistoryModal} initialEmail={email} onClose={() => setShowHistoryModal(false)} />
      <BalanceModal open={showBalanceModal} onClose={() => setShowBalanceModal(false)} />
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
  return <div style={{ fontSize:'9.5px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'#64748b', marginBottom:'2px', marginTop:'18px' }}>{children}</div>
}

function TemplateCard({ tpl, active, onClick, large }: { tpl: typeof TEMPLATES[0]; active: boolean; onClick: () => void; large?: boolean }) {
  const both = tpl.formats === 'both'
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={`${tpl.name} template — ${both ? 'PDF and Word' : 'PDF only'}`} className="scv-tpl" title={tpl.tag} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', width:'100%', padding:'12px 8px 11px', border:'none', font:'inherit', textAlign:'center', borderRadius:'12px', background: active ? '#f6fdfb' : '#fff', boxShadow: active ? '0 0 0 1.5px #0d9488' : '0 0 0 1px #eef2f6', cursor:'pointer' }}>
      {active && <span style={{ position:'absolute', top:'6px', right:'6px', width:'16px', height:'16px', borderRadius:'50%', background:'#0d9488', display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>}
      <TemplatePreview templateId={tpl.id} />
      <div style={{ textAlign:'center', width:'100%' }}>
        <div style={{ fontSize: large ? '13.5px' : '12px', fontWeight:600, color: active ? '#0f766e' : '#0a0f1a', lineHeight:1.2 }}>{tpl.name}</div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', marginTop:'5px', fontSize: large ? '9px' : '7.5px', fontWeight:700, letterSpacing:'0.4px', padding:'2.5px 7px', borderRadius:'20px', background: both ? '#ecfdf5' : '#fffbeb', color: both ? '#0f766e' : '#b45309' }}>
          <svg width="8" height="9" viewBox="0 0 12 14" fill="none"><path d="M2 1h5l3 3v9H2V1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
          {both ? 'PDF · WORD' : 'PDF ONLY'}
        </div>
      </div>
    </button>
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

      {cv.coverLetterBody && (
        <Sec title="Letter Details">
          <Inp label="Subject line" value={cv.clSubject || ''} onChange={v => updateCV({ clSubject: v.toUpperCase() })} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 10 }}>
            <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Recipient — one line each (e.g. The HR Manager, Company, P.O. Box, City)</label>
            <TA
              value={(cv.clRecipient || []).join('\n')} rows={4}
              onChange={v => updateCV({ clRecipient: v.split('\n').map(s => s.trim()).filter(Boolean) })} />
          </div>
        </Sec>
      )}

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

      {/* Skills, Languages and Extra Sections belong to a CV — the letter
          template never renders them, so on a cover letter they were empty
          boxes that did nothing. Hidden there, same as Experience/Education. */}
      {!cv.coverLetterBody && cv.skills && (
        <Sec title="Skills">
          <TA value={cv.skills.join(', ')} rows={3}
            onChange={v => updateCV({ skills: v.split(',').map(s=>s.trim()).filter(Boolean) })} />
          <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'6px' }}>Separate skills with commas</div>
        </Sec>
      )}

      {!cv.coverLetterBody && cv.languages !== undefined && (
        <Sec title="Languages">
          <TA value={(cv.languages || []).join(', ')} rows={2}
            onChange={v => updateCV({ languages: v.split(',').map(s=>s.trim()).filter(Boolean) })} />
          <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'6px' }}>Separate languages with commas</div>
        </Sec>
      )}

      {!cv.coverLetterBody && (
        <Sec title="Extra Sections (optional)">
          <TA value={extraSectionsToText(cv)} rows={5}
            onChange={v => updateCV({ extraSections: textToExtraSections(v), additionalInfo: undefined } as any)} />
          <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'6px' }}>One section per line as "Heading: item; item; item" — e.g. "Certifications: PMP; Google PM" or "References: Available on request"</div>
        </Sec>
      )}
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
