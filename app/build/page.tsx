'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { CVType } from '@/types'

// ─────────────────────────────────────────────────────────────
// LOADING SCREEN DATA
// ─────────────────────────────────────────────────────────────
const LOADING_STEPS = [
  { pct: 5,  msg: 'Reading your details...',            detail: 'Extracting your experience and qualifications' },
  { pct: 15, msg: 'Understanding your background...',   detail: 'Mapping your career story and achievements' },
  { pct: 28, msg: 'Crafting your professional summary...', detail: 'Writing a summary that opens doors' },
  { pct: 42, msg: 'Writing your experience section...', detail: 'Turning duties into powerful achievements' },
  { pct: 55, msg: 'Perfecting your education section...', detail: 'Formatting qualifications to impress' },
  { pct: 67, msg: 'Optimising for ATS systems...',      detail: 'Making sure algorithms rank you highly' },
  { pct: 78, msg: 'Polishing language and tone...',     detail: 'Removing weak words, adding impact verbs' },
  { pct: 88, msg: 'Final quality check...',             detail: 'Running through 24 quality checkpoints' },
  { pct: 95, msg: 'Almost there...',                    detail: 'Putting the finishing touches' },
  { pct: 99, msg: 'Your CV is ready!',                  detail: 'Preparing your preview' },
]

const DID_YOU_KNOWS = [
  { fact: 'Recruiters spend an average of 6 seconds scanning a CV before deciding.', tip: 'That\'s why your name, job title and top bullet points must land instantly.' },
  { fact: 'CVs with quantified achievements are 40% more likely to get an interview.', tip: 'Numbers like "reduced costs by 30%" or "managed team of 12" make you memorable.' },
  { fact: '75% of CVs are rejected by ATS before a human ever reads them.', tip: 'SwiftCVPro writes your CV to pass ATS systems first, humans second.' },
  { fact: 'The ideal CV length for most professionals is 1–2 pages.', tip: 'Longer is not better. A tight, focused CV signals confidence and clarity.' },
  { fact: 'Action verbs like "led", "built", and "delivered" outperform passive language.', tip: 'Every bullet point in your CV starts with a strong past-tense action verb.' },
  { fact: 'Ghana has one of the fastest-growing professional workforces in West Africa.', tip: 'A strong CV positions you to compete locally and internationally.' },
  { fact: 'Tailored CVs get 3x more interview callbacks than generic ones.', tip: 'Our Targeted CV product writes a unique CV for each job you apply for.' },
  { fact: 'LinkedIn profiles that match your CV get 21% more profile views.', tip: 'After downloading, update your LinkedIn to match your new SwiftCV.' },
]

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type Screen = 'type' | 'method' | 'paste' | 'form-1' | 'form-2' | 'form-3' | 'form-4' | 'form-5' | 'summary'

const CV_TYPE_META: Record<CVType, { label: string; shortLabel: string; hasJobStep: boolean; totalFormSteps: number }> = {
  professional: { label: 'Professional CV', shortLabel: 'Professional CV', hasJobStep: true,  totalFormSteps: 5 },
  targeted:     { label: 'Targeted CV',     shortLabel: 'Targeted CV',     hasJobStep: true,  totalFormSteps: 5 },
  academic:     { label: 'Academic CV',     shortLabel: 'Academic CV',     hasJobStep: false, totalFormSteps: 4 },
  cover_letter: { label: 'Cover Letter',    shortLabel: 'Cover Letter',    hasJobStep: true,  totalFormSteps: 5 },
}

export default function BuildPage() {
  const router = useRouter()

  // ── Screen state ──────────────────────────────
  const [screen, setScreen] = useState<Screen>('type')
  const [cvType, setCvType] = useState<CVType>('professional')
  const [inputMethod, setInputMethod] = useState<'paste' | 'form'>('paste')
  const [pasteInputMode, setPasteInputMode] = useState<'paste' | 'upload'>('paste')
  const [uploadedCV, setUploadedCV] = useState<File | null>(null)
  const [uploadedJD, setUploadedJD] = useState<File | null>(null)
  const [jdInputMode, setJdInputMode] = useState<'paste' | 'upload'>('paste')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<{ title: string; msg: string; type: 'payment' | 'input' | 'server' | 'network' } | null>(null)

  // Academic optional expands
  const [showAcademicEdu, setShowAcademicEdu] = useState(false)
  const [showAcademicExp, setShowAcademicExp] = useState(false)
  const [showAcademicExtras, setShowAcademicExtras] = useState(false)
  const [showOptionalPersonal, setShowOptionalPersonal] = useState(false)
  const [showDutiesTip, setShowDutiesTip] = useState(false)

  // Loading animation state
  const [loadingPct, setLoadingPct] = useState(0)
  const [loadingStep, setLoadingStep] = useState(0)
  const [didYouKnowIdx, setDidYouKnowIdx] = useState(0)
  const [didYouKnowFade, setDidYouKnowFade] = useState(true)

  const meta = CV_TYPE_META[cvType]
  // JD is available/captured for everything except Academic. It is optional for
  // Professional (tailor if given) and only genuinely required for cover letters.
  const needsJD = cvType !== 'academic'

  // ── Refs ──────────────────────────────────────
  const refs = {
    paste: useRef<HTMLTextAreaElement>(null),
    clarify: useRef<HTMLTextAreaElement>(null),
    jdPaste: useRef<HTMLTextAreaElement>(null),
    fullName: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    location: useRef<HTMLInputElement>(null),
    dob: useRef<HTMLInputElement>(null),
    nationality: useRef<HTMLInputElement>(null),
    linkedin: useRef<HTMLInputElement>(null),
    education: useRef<HTMLTextAreaElement>(null),
    // academic education extras
    gpa: useRef<HTMLInputElement>(null),
    thesis: useRef<HTMLInputElement>(null),
    research: useRef<HTMLTextAreaElement>(null),
    experience: useRef<HTMLTextAreaElement>(null),
    // academic experience extras
    publications: useRef<HTMLTextAreaElement>(null),
    teaching: useRef<HTMLTextAreaElement>(null),
    conferences: useRef<HTMLTextAreaElement>(null),
    extras: useRef<HTMLTextAreaElement>(null),
    // academic extras
    grants: useRef<HTMLTextAreaElement>(null),
    supervision: useRef<HTMLTextAreaElement>(null),
    orcid: useRef<HTMLInputElement>(null),
    // job details
    jobTitle: useRef<HTMLInputElement>(null),
    company: useRef<HTMLInputElement>(null),
    jobDesc: useRef<HTMLTextAreaElement>(null),
    whyRole: useRef<HTMLTextAreaElement>(null),
  }

  // ── URL param pre-select ──────────────────────
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type') as CVType
    if (t && ['professional','targeted','academic','cover_letter'].includes(t)) setCvType(t)
  }, [])

  // ── Loading animation ─────────────────────────
  useEffect(() => {
    if (!isGenerating) { setLoadingPct(0); setLoadingStep(0); return }
    let stepIdx = 0
    const targets = LOADING_STEPS.map(s => s.pct)
    let current = 0
    const interval = setInterval(() => {
      const target = targets[Math.min(stepIdx, targets.length - 1)]
      if (current < target) {
        current = Math.min(current + 1, target)
        setLoadingPct(current)
        const si = LOADING_STEPS.findIndex(s => s.pct >= current)
        setLoadingStep(Math.max(0, si))
      } else if (stepIdx < LOADING_STEPS.length - 1) {
        stepIdx++
      }
    }, 180)
    const dyk = setInterval(() => {
      setDidYouKnowFade(false)
      setTimeout(() => { setDidYouKnowIdx(i => (i + 1) % DID_YOU_KNOWS.length); setDidYouKnowFade(true) }, 400)
    }, 5000)
    return () => { clearInterval(interval); clearInterval(dyk) }
  }, [isGenerating])

  // ── Navigation ────────────────────────────────
  const go = (s: Screen) => { setScreen(s); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  function goFromMethod(m?: 'paste' | 'form') {
    const method = m || inputMethod
    if (method === 'paste') go('paste')
    else go('form-1')
  }

  function goFromForm4() {
    if (meta.hasJobStep) go('form-5')
    else go('summary')
  }

  // ── File extract ──────────────────────────────
  async function extractFile(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/extract-content', { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Could not read file')
    return data.text
  }

  // ── Validate ──────────────────────────────────
  function validate(): string | null {
    if (!phoneNumber.trim()) return 'phone'
    if (inputMethod === 'paste') {
      if (pasteInputMode === 'paste' && !refs.paste.current?.value.trim()) return 'content'
      if (pasteInputMode === 'upload' && !uploadedCV) return 'file'
    }
    if (inputMethod === 'form') {
      if (!refs.fullName.current?.value.trim()) return 'name'
    }
    return null
  }

  // ── Generate ──────────────────────────────────
  async function handleGenerate() {
    setError(null)
    const validErr = validate()
    if (validErr) {
      const msgs: Record<string, {title:string;msg:string;type:any}> = {
        phone:    { title: 'Phone number required', msg: 'Please enter your phone number so we can link your credit to the right account.', type: 'input' },
        content:  { title: 'No CV content', msg: 'Please paste your CV or notes before generating.', type: 'input' },
        file:     { title: 'No file uploaded', msg: 'Please upload your CV file before generating.', type: 'input' },
        name:     { title: 'Name required', msg: 'Please enter your full name.', type: 'input' },
        email:    { title: 'Email required', msg: 'Please enter your email address.', type: 'input' },
        location: { title: 'Location required', msg: 'Please enter your location (e.g. Accra, Ghana).', type: 'input' },
        jd:       { title: 'Job description required', msg: 'This CV type needs a job description. Please paste or upload one.', type: 'input' },
      }
      setError(msgs[validErr] || { title: 'Something missing', msg: 'Please check your details and try again.', type: 'input' })
      return
    }
    setIsGenerating(true)
    try {
      const creditRes = await fetch('/api/check-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      })
      const creditData = await creditRes.json()
      if (!creditData.hasCredits) {
        setIsGenerating(false)
        triggerPaystack(creditData.phoneNumber || phoneNumber)
        return
      }
      await doGenerate(creditData.phoneNumber)
    } catch {
      setIsGenerating(false)
      setError({ title: 'Connection error', msg: 'Could not connect to the server. Please check your internet and try again.', type: 'network' })
    }
  }

  async function doGenerate(normalizedPhone: string) {
    try {
      let rawContent = ''
      let jobDescription = ''

      if (inputMethod === 'paste') {
        rawContent = pasteInputMode === 'upload' && uploadedCV
          ? await extractFile(uploadedCV)
          : refs.paste.current?.value || ''
        const clarify = refs.clarify.current?.value?.trim()
        if (clarify) rawContent += '\n\nADDITIONAL NOTES:\n' + clarify
        if (needsJD) {
          jobDescription = jdInputMode === 'upload' && uploadedJD
            ? await extractFile(uploadedJD)
            : refs.jdPaste.current?.value || ''
        }
      }

      if (inputMethod === 'form') {
        const r = refs
        // Build structured CVFormData for the prompt builder
        const formData = {
          cvType,
          fullName: r.fullName.current?.value || '',
          jobTitle: r.jobTitle.current?.value || '',
          email: r.email.current?.value || '',
          phone: r.phone.current?.value || phoneNumber,
          location: r.location.current?.value || '',
          nationality: r.nationality.current?.value || undefined,
          dob: r.dob.current?.value || undefined,
          linkedin: r.linkedin.current?.value || undefined,
          education: r.education.current?.value || undefined,
          experience: r.experience.current?.value || undefined,
          extras: r.extras.current?.value || undefined,
          // Academic extras
          gpa: r.gpa.current?.value || undefined,
          thesis: r.thesis.current?.value || undefined,
          research: r.research.current?.value || undefined,
          publications: r.publications.current?.value || undefined,
          teaching: r.teaching.current?.value || undefined,
          conferences: r.conferences.current?.value || undefined,
          grants: r.grants.current?.value || undefined,
          supervision: r.supervision.current?.value || undefined,
          orcid: r.orcid.current?.value || undefined,
          // Job targeting
          company: r.company.current?.value || undefined,
          jobDescription: needsJD ? (r.jobDesc.current?.value || undefined) : undefined,
          whyRole: cvType === 'cover_letter' ? (r.whyRole.current?.value || undefined) : undefined,
        }
        // Pass as formData to the API — it will use buildGenerationPrompt
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvType, formData, phoneNumber: normalizedPhone })
        })
        const data = await res.json()
        if (!data.success) {
          setIsGenerating(false)
          if (data.error === 'NO_CREDITS') {
            setError({ title: 'No credits', msg: 'No credits found for this number. Please complete payment to generate your CV.', type: 'payment' })
          } else if (res.status === 503) {
            setError({ title: 'Service busy', msg: data.error || 'The AI is handling many requests right now. Please wait 30 seconds and try again.', type: 'server' })
          } else {
            setError({ title: 'Generation failed', msg: data.error || 'Something went wrong. Please try again.', type: 'server' })
          }
          return
        }
        sessionStorage.setItem('swiftcv_cv', JSON.stringify(data.cv))
        sessionStorage.setItem('swiftcv_type', cvType)
        sessionStorage.setItem('swiftcv_phone', normalizedPhone)
        router.push('/preview')
        return
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvType, rawContent, jobDescription: needsJD ? (jobDescription || undefined) : undefined, phoneNumber: normalizedPhone })
      })
      const data = await res.json()
      if (!data.success) {
        setIsGenerating(false)
        if (data.error === 'NO_CREDITS') {
          setError({ title: 'No credits', msg: 'No credits found for this number. Please complete payment to generate your CV.', type: 'payment' })
        } else if (res.status === 503) {
          setError({ title: 'Service busy', msg: data.error || 'The AI is handling many requests right now. Please wait 30 seconds and try again.', type: 'server' })
        } else {
          setError({ title: 'Generation failed', msg: data.error || 'Something went wrong. Please try again.', type: 'server' })
        }
        return
      }
      sessionStorage.setItem('swiftcv_cv', JSON.stringify(data.cv))
      sessionStorage.setItem('swiftcv_type', cvType)
      sessionStorage.setItem('swiftcv_phone', normalizedPhone)
      router.push('/preview')
    } catch {
      setIsGenerating(false)
      setError({ title: 'Network error', msg: 'Lost connection mid-generation. Please check your internet and try again.', type: 'network' })
    }
  }

  function triggerPaystack(normalizedPhone: string) {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = () => {
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: `${normalizedPhone.replace('+', '')}@swiftcvpro.com`,
        amount: 3500000,
        currency: 'GHS',
        ref: `scv_${Date.now()}_${normalizedPhone.slice(-4)}`,
        metadata: { phone: normalizedPhone, cvType },
        callback: async () => {
          setIsGenerating(true)
          await new Promise(r => setTimeout(r, 2500))
          await doGenerate(normalizedPhone)
        },
        onClose: () => setError({ title: 'Payment cancelled', msg: 'Payment was not completed. Your CV has not been generated. Try again whenever you are ready.', type: 'payment' })
      })
      handler.openIframe()
    }
    document.body.appendChild(script)
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0fdf9 0%, #f8fafc 40%, #fefdfb 100%)' }}>
      <Nav step={screen === 'type' ? 1 : screen === 'method' ? 2 : 3} />

      {/* ══ SCREEN: CV TYPE ══════════════════════════════════ */}
      {screen === 'type' && (
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 600, color: '#0a0f1a', marginBottom: '8px', lineHeight: 1.1 }}>
            Select a <span style={{ color: '#0d9488' }}>CV Type</span>
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '36px', fontWeight: 300, lineHeight: 1.7 }}>Choose the option that best fits your goals.</p>

          {/* CV TYPES — the actual answer to "what CV type" — get equal top billing. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '18px' }}>
            {([
              {
                id: 'professional' as CVType, recommended: true,
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><path d="M2 12h20"/></svg>,
                iconBg: '#e1f5ee', name: 'Professional CV', desc: 'For most job applications and any industry.', cta: 'Choose Professional CV'
              },
              {
                id: 'academic' as CVType, recommended: false,
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#534ab7" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
                iconBg: '#eeedfe', name: 'Academic CV', desc: 'For research roles, postgraduate applications, and lecturing positions.', cta: 'Choose Academic CV'
              },
            ] as any[]).map((card: any) => (
              <div
                key={card.id}
                onClick={() => { setCvType(card.id); go('method') }}
                style={{
                  position: 'relative', background: 'white', display: 'flex', flexDirection: 'column',
                  border: card.recommended ? '2px solid #0d9488' : '1px solid #e2e8f0',
                  borderRadius: '18px', padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  if (card.recommended) el.style.boxShadow = '0 0 0 4px rgba(13,148,136,0.1)'
                  else el.style.borderColor = '#0d9488'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = 'none'
                  if (!card.recommended) el.style.borderColor = '#e2e8f0'
                }}
              >
                {card.recommended && (
                  <div style={{ position: 'absolute', top: '-12px', left: '18px', background: '#0d9488', color: 'white', fontSize: '10.5px', fontWeight: 600, padding: '3px 12px', borderRadius: '100px' }}>★ Recommended</div>
                )}
                <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>{card.icon}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '6px' }}>{card.name}</div>
                <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.65, fontWeight: 300, marginBottom: '16px', flex: 1 }}>{card.desc}</div>
                <button style={{
                  width: '100%', border: 'none', borderRadius: '100px', padding: '10px 0', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                  background: card.recommended ? '#0d9488' : 'transparent',
                  color: card.recommended ? 'white' : '#0a0f1a',
                  ...(card.recommended ? {} : { border: '0.5px solid #e2e8f0' })
                }}>{card.cta} →</button>
              </div>
            ))}
          </div>

          {/* Divider — signals a category change, not a third peer option */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 16px' }}>
            <div style={{ flex: 1, height: '0.5px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Need something else instead?</span>
            <div style={{ flex: 1, height: '0.5px', background: '#e2e8f0' }} />
          </div>

          {/* COVER LETTER — a different document, not a third CV type, so it's
              visually set apart below rather than styled as a peer of the two above. */}
          <div
            onClick={() => { setCvType('cover_letter'); go('method') }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', background: 'white',
              border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 18px',
              cursor: 'pointer', marginBottom: '16px', transition: 'border-color 0.2s'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#0d9488' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0' }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fbeaf0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#993556" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 600, color: '#0a0f1a' }}>Cover Letter</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>A personalised letter that introduces you and makes the case for you.</div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0a0f1a', whiteSpace: 'nowrap' as const, border: '0.5px solid #e2e8f0', borderRadius: '100px', padding: '9px 18px' }}>Choose Cover Letter →</div>
          </div>

          {/* Helper */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ width: '28px', height: '28px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.65, fontWeight: 300 }}>
              <strong style={{ fontWeight: 600, color: '#0a0f1a' }}>Not sure which to pick?</strong> Choose Professional CV — it works for most job applications and can be used anywhere.
            </p>
          </div>

          <div style={{ marginTop: '24px' }}>
            <a href="/build" onClick={(e) => { e.preventDefault(); window.history.back() }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '11px 20px', background: 'white', border: '2px solid #185fa5', borderRadius: '50px', fontSize: '13px', fontWeight: 600, color: '#185fa5', cursor: 'pointer', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>← Back</a>
          </div>
        </div>
      )}

      {/* ══ SCREEN: METHOD ══════════════════════════════════ */}
      {screen === 'method' && (
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 600, color: '#0a0f1a', marginBottom: '8px', lineHeight: 1.1 }}>
            How do you want to <span style={{ color: '#0d9488' }}>share your info?</span>
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px', fontWeight: 300, lineHeight: 1.7 }}>Both paths give the same quality result.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            {([
              { id: 'paste' as const, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, iconBg: '#e1f5ee', title: 'Upload or paste old CV', desc: 'Copy from your old CV or upload a file directly.' },
              { id: 'form' as const,  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, iconBg: '#e6f1fb', title: 'Chat with Swift', desc: 'Answer guided questions. Perfect if starting from scratch.' },
            ] as any[]).map((opt: any) => (
              <div key={opt.id} onClick={() => { setInputMethod(opt.id as 'paste' | 'form'); goFromMethod(opt.id as 'paste' | 'form') }}
                style={{ background: opt.id === 'form' ? '#f0f7ff' : 'white', border: opt.id === 'form' ? '2px solid #185fa5' : `${inputMethod === 'paste' ? '2px solid #0d9488' : '1px solid #e2e8f0'}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column', gap: '10px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = opt.id === 'form' ? '#185fa5' : '#0d9488' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = opt.id === 'form' ? '#185fa5' : inputMethod === 'paste' ? '#0d9488' : '#e2e8f0' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: opt.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{opt.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: opt.id === 'form' ? '#185fa5' : '#0a0f1a' }}>{opt.title}</div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{opt.desc}</div>
              </div>
            ))}
          </div>

          <button onClick={() => go('type')} style={btnBack}>← Back</button>
        </div>
      )}

      {/* ══ SCREEN: PASTE PATH ══════════════════════════════════ */}
      {screen === 'paste' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <StepLabel label="Step 1 of 1" />
          <h1 style={h1Style}>Share Your CV Content</h1>
          <p style={subStyle}>Paste your information below. Don't worry about formatting. Swift will organise everything for you.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {[{id:'paste',label:'✎ Paste text'},{id:'upload',label:'↑ Upload file'}].map(opt => (
              <button key={opt.id} onClick={() => setPasteInputMode(opt.id as any)}
                style={{ padding: '12px', border: `2px solid ${opt.id === 'upload' ? '#185fa5' : pasteInputMode === 'paste' ? '#0d9488' : '#e2e8f0'}`, borderRadius: '12px', background: opt.id === 'upload' ? '#eff6ff' : pasteInputMode === 'paste' ? '#f0fdf9' : 'white', color: opt.id === 'upload' ? '#185fa5' : pasteInputMode === 'paste' ? '#0f766e' : '#64748b', fontWeight: pasteInputMode === opt.id ? 700 : 500, fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {opt.label} {pasteInputMode === opt.id ? '✓' : ''}
              </button>
            ))}
          </div>

          {pasteInputMode === 'paste' ? (
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Paste your CV here</div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', fontWeight: 300 }}>Any format is fine — Word, PDF copy, WhatsApp, rough notes.</p>
              <textarea ref={refs.paste} style={TA(180)} rows={8} placeholder="Paste your CV content here — any format is fine..." />
            </div>
          ) : (
            <div style={cardStyle}>
              <UploadZone label="Click to upload or drag and drop" hint="PDF · Word (.docx) · Text (.txt)" onFile={setUploadedCV} file={uploadedCV} />
            </div>
          )}

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={cardTitleStyle}>Anything to add or clarify?</div>
              <span style={optBadge}>Optional</span>
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#cbd5e1', marginBottom: '6px' }}>Example</div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginBottom: '12px', border: '1px solid #f1f5f9', lineHeight: 1.8 }}>
              {`"I was promoted to Senior Manager in 2023" · "Please emphasise my leadership experience" · "Remove my national service — too old"`}
            </div>
            <textarea ref={refs.clarify} style={TA(70)} rows={3} placeholder="Type any special requests — or leave blank..." />
          </div>

          {needsJD && <JDSection method={jdInputMode} setMethod={setJdInputMode} pasteRef={refs.jdPaste} uploadedFile={uploadedJD} setUploadedFile={setUploadedJD} cvType={cvType} />}

          <PhoneAndPrice phone={phoneNumber} setPhone={setPhoneNumber} />
          <ErrorDisplay error={error} onRetry={handleGenerate} onDismiss={() => setError(null)} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', gap: '12px', flexWrap: 'wrap' as const }}>
            <button onClick={() => go('method')} style={btnBack}>← Back</button>
            <button onClick={handleGenerate} disabled={isGenerating} style={{ ...btnPrimary, opacity: isGenerating ? 0.6 : 1 }}>
              {isGenerating ? 'Generating...' : `Generate my ${cvType === 'cover_letter' ? 'cover letter' : 'CV'} →`}
            </button>
          </div>
        </div>
      )}

      {/* ══ SCREEN: FORM STEP 1 — PERSONAL ══════════════════════ */}
      {screen === 'form-1' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          {/* Swift greeting with typing animation */}
          <SwiftGreeting label={meta.label} />

          <StepLabel label={`Step 1 of ${meta.totalFormSteps}`} />
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h1 style={h1Style}>Personal Details</h1>
          <p style={subStyle}>Tell me who you are. These will appear at the top of your CV.</p>

          <div style={cardStyle}>
            <Field label="Full name *" placeholder="e.g. Kwame Mensah" fieldRef={refs.fullName} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '12px 0' }}>
              <Field label="Phone *" placeholder="e.g. 0551234567" fieldRef={refs.phone} />
              <Field label="Email *" placeholder="kwame@email.com" fieldRef={refs.email} />
            </div>
            <Field label="Location *" placeholder="e.g. Accra, Ghana" fieldRef={refs.location} />

            {/* Optional expand */}
            <button onClick={() => setShowOptionalPersonal(v => !v)}
              style={{ marginTop: '14px', ...expandToggleStyle }}>
              <span>{showOptionalPersonal ? '−' : '＋'} Add optional details (DOB, LinkedIn, Nationality)</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showOptionalPersonal ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showOptionalPersonal && (
              <div style={{ marginTop: '10px', padding: '14px', background: '#f8fffe', border: '1px solid rgba(13,148,136,0.15)', borderRadius: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <Field label="Date of Birth" placeholder="e.g. 14 March 1995" fieldRef={refs.dob} />
                  <Field label="Nationality" placeholder="e.g. Ghanaian" fieldRef={refs.nationality} />
                </div>
                <Field label="LinkedIn URL" placeholder="linkedin.com/in/kwame" fieldRef={refs.linkedin} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <button onClick={() => go('method')} style={btnBack}>← Back</button>
            <button onClick={() => go('form-2')} style={btnPrimary}>Next →</button>
          </div>
        </div>
      )}

      {/* ══ SCREEN: FORM STEP 2 — EDUCATION ══════════════════════ */}
      {screen === 'form-2' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <StepLabel label={`Step 2 of ${meta.totalFormSteps}`} />
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <h1 style={h1Style}>Education & Certifications</h1>
          <p style={subStyle}>Tell me about your schools, courses, and training.</p>

          <div style={cardStyle}>
            <ExBox text={'BSc Nursing, University of Cape Coast, 2018–2022\nCertificate in Critical Care Nursing, 2024\nWASSCE, St Thomas Aquinas SHS, 2018'} />
            <textarea ref={refs.education} style={TA(110)} rows={5} placeholder="Write your education and certifications here..." />

            {/* Academic optional expand */}
            {cvType === 'academic' && (
              <>
                <button onClick={() => setShowAcademicEdu(v => !v)} style={{ marginTop: '12px', ...expandToggleStyle }}>
                  <span>{showAcademicEdu ? '−' : '＋'} Add academic details (GPA, Thesis, Research)</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showAcademicEdu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showAcademicEdu && (
                  <div style={{ marginTop: '10px', padding: '14px', background: '#f8fffe', border: '1px solid rgba(13,148,136,0.15)', borderRadius: '10px' }}>
                    <Field label="GPA or Class of Degree" placeholder="e.g. First Class, GPA 3.8 / 4.0" fieldRef={refs.gpa} />
                    <div style={{ marginTop: '10px' }}><Field label="Thesis / Dissertation Title" placeholder="e.g. Climate Change Adaptation in Rural Ghana" fieldRef={refs.thesis} /></div>
                    <div style={{ marginTop: '10px' }}>
                      <label style={labelStyle}>Research Undertaken</label>
                      <textarea ref={refs.research} style={{ ...TA(70), marginTop: '5px' }} rows={3} placeholder="Brief description of your research focus..." />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <button onClick={() => go('form-3')} style={{ ...btnSkip }}>Skip this section →</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <button onClick={() => go('form-1')} style={btnBack}>← Back</button>
            <button onClick={() => go('form-3')} style={btnPrimary}>Next →</button>
          </div>
        </div>
      )}

      {/* ══ SCREEN: FORM STEP 3 — EXPERIENCE ══════════════════════ */}
      {screen === 'form-3' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <StepLabel label={`Step 3 of ${meta.totalFormSteps}`} />
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eeedfe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#534ab7" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><path d="M2 12h20"/></svg>
          </div>
          <h1 style={h1Style}>Work Experience</h1>
          <p style={subStyle}>Tell me about your jobs, internships, national service, or volunteer roles.</p>

          <div style={cardStyle}>
            <ExBox text={'Staff Nurse – Korle Bu Teaching Hospital – 2022 to Present\nSales Assistant – Melcom – 2020–2021\nNational Service – GRA Kumasi – 2019–2020'} />

            {/* Collapsible duties tip */}
            <button onClick={() => setShowDutiesTip(v => !v)} style={{ ...tipToggleStyle, marginBottom: '10px' }}>
              <span>Want to add job duties? Click to see how →</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showDutiesTip ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showDutiesTip && (
              <div style={{ background: '#f0fdf9', borderLeft: '3px solid #0d9488', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: '10px', fontSize: '12px', color: '#0f6e56', lineHeight: 1.7 }}>
                Adding duties is completely optional — our AI will write them for you. If you'd like to add your own, list them under each role:<br/><br/>
                <em>Staff Nurse – Korle Bu – 2022 to Present<br/>– Administered medication to 30+ patients daily<br/>– Managed ward records and patient handovers</em>
              </div>
            )}

            <textarea ref={refs.experience} style={TA(110)} rows={5} placeholder="Write your work experience here..." />

            {/* Academic experience expand */}
            {cvType === 'academic' && (
              <>
                <button onClick={() => setShowAcademicExp(v => !v)} style={{ marginTop: '12px', ...expandToggleStyle }}>
                  <span>{showAcademicExp ? '−' : '＋'} Add academic activities (Publications, Teaching, Conferences)</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showAcademicExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showAcademicExp && (
                  <div style={{ marginTop: '10px', padding: '14px', background: '#f8fffe', border: '1px solid rgba(13,148,136,0.15)', borderRadius: '10px', display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Publications & Papers</label>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', margin: '4px 0 6px' }}>e.g. Mensah K. (2023). Climate Change in Rural Ghana. Journal of African Studies, 12(3), 45–62.</div>
                      <textarea ref={refs.publications} style={TA(70)} rows={3} placeholder="List your publications here..." />
                    </div>
                    <div>
                      <label style={labelStyle}>Teaching Experience</label>
                      <textarea ref={refs.teaching} style={{ ...TA(60), marginTop: '5px' }} rows={2} placeholder="e.g. Lecturer – KNUST – Introduction to Economics – 2021–2023" />
                    </div>
                    <div>
                      <label style={labelStyle}>Conferences & Presentations</label>
                      <textarea ref={refs.conferences} style={{ ...TA(60), marginTop: '5px' }} rows={2} placeholder="e.g. Presented at African Development Forum, Accra, 2023" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <button onClick={() => go('form-4')} style={btnSkip}>Skip this section →</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <button onClick={() => go('form-2')} style={btnBack}>← Back</button>
            <button onClick={() => go('form-4')} style={btnPrimary}>Next →</button>
          </div>
        </div>
      )}

      {/* ══ SCREEN: FORM STEP 4 — EXTRAS ══════════════════════ */}
      {screen === 'form-4' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <StepLabel label={`Step 4 of ${meta.totalFormSteps}`} />
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#faeeda', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#854f0b" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <h1 style={h1Style}>Skills & Extra Details</h1>
          <p style={subStyle}>Add anything you'd like included — the AI handles the rest.</p>

          <div style={cardStyle}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#94a3b8', marginBottom: '7px' }}>Example</div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#64748b', lineHeight: 1.9, fontStyle: 'italic' }}>
              <strong style={{ color: '#475569', fontStyle: 'normal' }}>Technical Skills:</strong> AutoCAD, Python, QuickBooks<br/>
              <strong style={{ color: '#475569', fontStyle: 'normal' }}>Languages:</strong> Twi, French<br/>
              <strong style={{ color: '#475569', fontStyle: 'normal' }}>Leadership:</strong> SRC President, UPSA, 2015<br/>
              <strong style={{ color: '#475569', fontStyle: 'normal' }}>Award:</strong> Best Employee, MTN Ghana, 2023<br/>
              <strong style={{ color: '#475569', fontStyle: 'normal' }}>Reference:</strong> Mr Kwadwo Asante, Manager, Diamond King Ventures, 0256677189
            </div>

            {/* Academic extras expand */}
            {cvType === 'academic' && (
              <>
                <button onClick={() => setShowAcademicExtras(v => !v)} style={{ ...expandToggleStyle, marginBottom: '10px' }}>
                  <span>{showAcademicExtras ? '−' : '＋'} Add academic extras (Grants, Supervision, ORCID)</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showAcademicExtras ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showAcademicExtras && (
                  <div style={{ marginTop: '10px', padding: '14px', background: '#f8fffe', border: '1px solid rgba(13,148,136,0.15)', borderRadius: '10px', display: 'flex', flexDirection: 'column' as const, gap: '12px', marginBottom: '12px' }}>
                    <div><label style={labelStyle}>Grants & Fellowships</label><textarea ref={refs.grants} style={{ ...TA(60), marginTop: '5px' }} rows={2} placeholder="e.g. DAAD Research Fellowship, 2022 – University of Bonn" /></div>
                    <div><label style={labelStyle}>Student Supervision</label><textarea ref={refs.supervision} style={{ ...TA(60), marginTop: '5px' }} rows={2} placeholder="e.g. Supervised 4 BSc dissertations, KNUST, 2021–2023" /></div>
                    <div><Field label="ORCID ID" placeholder="e.g. 0000-0002-1825-0097" fieldRef={refs.orcid} /></div>
                  </div>
                )}
              </>
            )}

            <textarea ref={refs.extras} style={TA(110)} rows={5} placeholder="Technical skills, languages, awards, references, or anything else..." />
          </div>

          <button onClick={goFromForm4} style={btnSkip}>Skip this section →</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <button onClick={() => go('form-3')} style={btnBack}>← Back</button>
            <button onClick={goFromForm4} style={btnPrimary}>{meta.hasJobStep ? 'Next →' : 'Review Details →'}</button>
          </div>
        </div>
      )}

      {/* ══ SCREEN: FORM STEP 5 — JOB DETAILS ══════════════════════ */}
      {screen === 'form-5' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <StepLabel label={`Step 5 of ${meta.totalFormSteps}`} />
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: cvType === 'cover_letter' ? '#fbeaf0' : '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            {cvType === 'cover_letter'
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#993556" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            }
          </div>
          <h1 style={h1Style}>{cvType === 'cover_letter' ? 'The Role You\'re Applying For' : 'The Role You\'re Targeting'}</h1>
          <p style={subStyle}>{cvType === 'cover_letter' ? 'Tell me about the position. This helps me write a compelling, tailored letter.' : 'Tell me about the job. The more you share, the better we can tailor your CV.'}</p>

          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <Field label={`Job Title${cvType === 'cover_letter' ? ' *' : ''}`} placeholder="e.g. Staff Nurse" fieldRef={refs.jobTitle} />
              <Field label={`Company Name${cvType === 'cover_letter' ? ' *' : ''}`} placeholder="e.g. Korle Bu Hospital" fieldRef={refs.company} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Job advert or description <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>Optional but recommended</span></label>
              <textarea ref={refs.jobDesc} style={{ ...TA(100), marginTop: '5px' }} rows={5} placeholder={cvType === 'cover_letter' ? 'Paste the job posting — we\'ll tailor the letter to match it exactly...' : 'Paste the full job posting here — we\'ll match your CV to it exactly...'} />
            </div>
            {cvType === 'cover_letter' && (
              <div>
                <label style={labelStyle}>Why do you want this role? <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>Optional</span></label>
                <textarea ref={refs.whyRole} style={{ ...TA(70), marginTop: '5px' }} rows={3} placeholder="e.g. I have 3 years experience in telecoms and admire this company's values..." />
              </div>
            )}
          </div>

          <button onClick={() => go('summary')} style={btnSkip}>Skip job details →</button>

          <PhoneAndPrice phone={phoneNumber} setPhone={setPhoneNumber} />
          <ErrorDisplay error={error} onRetry={handleGenerate} onDismiss={() => setError(null)} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', gap: '12px', flexWrap: 'wrap' as const }}>
            <button onClick={() => go('form-4')} style={btnBack}>← Back</button>
            <button onClick={handleGenerate} disabled={isGenerating} style={{ ...btnPrimary, opacity: isGenerating ? 0.6 : 1 }}>
              {isGenerating ? 'Generating...' : `Generate my ${cvType === 'cover_letter' ? 'cover letter' : 'CV'} →`}
            </button>
          </div>
        </div>
      )}

      {/* ══ SCREEN: SUMMARY ══════════════════════════════════ */}
      {screen === 'summary' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 style={{ ...h1Style, marginBottom: '6px' }}>Ready To Build Your CV</h1>
          <p style={{ ...subStyle, marginBottom: '28px' }}>Review your details before we generate.</p>

          {/* Summary blocks — only show sections with content */}
          {[
            { title: 'Document Type', val: meta.label, editScreen: 'type' as Screen, alwaysShow: true },
            { title: 'Personal Details', val: [refs.fullName.current?.value, refs.phone.current?.value, refs.email.current?.value, refs.location.current?.value].filter(Boolean).join(' · '), editScreen: 'form-1' as Screen },
            { title: 'Education', val: refs.education.current?.value || '', editScreen: 'form-2' as Screen },
            { title: 'Work Experience', val: refs.experience.current?.value || '', editScreen: 'form-3' as Screen },
            { title: 'Skills & Extras', val: refs.extras.current?.value || '', editScreen: 'form-4' as Screen },
            ...(meta.hasJobStep ? [{ title: 'Target Role', val: [refs.jobTitle.current?.value, refs.company.current?.value].filter(Boolean).join(' at '), editScreen: 'form-5' as Screen }] : []),
          ].filter(b => (b as any).alwaysShow || b.val).map(b => (
            <div key={b.title} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#94a3b8' }}>{b.title}</span>
                <button onClick={() => go(b.editScreen)} style={{ fontSize: '12px', color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>Edit</button>
              </div>
              <div style={{ fontSize: '13px', color: '#0a0f1a', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>{b.val}</div>
            </div>
          ))}

          <PhoneAndPrice phone={phoneNumber} setPhone={setPhoneNumber} />
          <ErrorDisplay error={error} onRetry={handleGenerate} onDismiss={() => setError(null)} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', gap: '12px', flexWrap: 'wrap' as const }}>
            <button onClick={() => go(meta.hasJobStep ? 'form-5' : 'form-4')} style={btnBack}>← Back</button>
            <button onClick={handleGenerate} disabled={isGenerating} style={{ ...btnPrimary, opacity: isGenerating ? 0.6 : 1 }}>
              {isGenerating ? 'Generating...' : `Generate my ${cvType === 'cover_letter' ? 'cover letter' : 'CV'} →`}
            </button>
          </div>
        </div>
      )}

      {/* ══ LOADING OVERLAY ══════════════════════════════════ */}
      {isGenerating && (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0f1a', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '32px' }}>
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ width: '100%', maxWidth: '540px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 32px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="url(#tealGrad)" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - loadingPct / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                <defs><linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#5eead4" /><stop offset="100%" stopColor="#0d9488" /></linearGradient></defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '22px', fontWeight: 700, color: 'white', lineHeight: 1 }}>{loadingPct}</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>%</span>
              </div>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', color: 'white', fontWeight: 500, marginBottom: '8px', lineHeight: 1.2 }}>
              {LOADING_STEPS[loadingStep]?.msg || 'Building your CV...'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '32px' }}>{LOADING_STEPS[loadingStep]?.detail || 'Please wait...'}</p>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden', marginBottom: '40px' }}>
              <div style={{ height: '100%', width: `${loadingPct}%`, background: 'linear-gradient(90deg, #0d9488, #5eead4)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px 24px', textAlign: 'left', opacity: didYouKnowFade ? 1 : 0, transition: 'opacity 0.4s ease' }}>
              <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2px', color: '#5eead4', marginBottom: '8px' }}>DID YOU KNOW?</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: '10px' }}>{DID_YOU_KNOWS[didYouKnowIdx].fact}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>💡 {DID_YOU_KNOWS[didYouKnowIdx].tip}</div>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)', marginTop: '24px' }}>Please do not close this page</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
      `}</style>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// SWIFT GREETING — typing animation
// ─────────────────────────────────────────────────────────────
function SwiftGreeting({ label }: { label: string }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const fullText = `Hi, I'm Swift 👋\nI'll help you build your ${label} today.\nKindly provide the following information.`

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(fullText.slice(0, i))
      if (i >= fullText.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, 28)
    return () => clearInterval(interval)
  }, [label])

  const lines = displayed.split('\n')

  return (
    <div style={{ background: '#f0fdf9', border: '1px solid rgba(13,148,136,0.15)', borderRadius: '14px', padding: '14px 18px', marginBottom: '28px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </div>
      <div style={{ fontSize: '14px', color: '#0a0f1a', lineHeight: 1.7 }}>
        {lines.map((line, i) => (
          <span key={i}>
            {i === 1 ? (
              <>
                {line.replace(`I'll help you build your ${label} today.`, '').trim()}
                {line.includes(label) && (
                  <>I'll help you build your <strong>{label}</strong> today.</>
                )}
                {!line.includes(label) && line}
              </>
            ) : line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
        {!done && <span style={{ display: 'inline-block', width: '2px', height: '14px', background: '#0d9488', marginLeft: '2px', verticalAlign: 'middle', animation: 'blink 0.7s step-end infinite' }} />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// STYLE CONSTANTS
// ─────────────────────────────────────────────────────────────
const h1Style: React.CSSProperties = { fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 600, color: '#0a0f1a', marginBottom: '8px', lineHeight: 1.1 }
const subStyle: React.CSSProperties = { fontSize: '14px', color: '#64748b', marginBottom: '24px', fontWeight: 300, lineHeight: 1.7 }
const cardStyle: React.CSSProperties = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px 22px', marginBottom: '14px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }
const cardTitleStyle: React.CSSProperties = { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '4px' }
const optBadge: React.CSSProperties = { fontSize: '10px', fontWeight: 500, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: '20px' }
const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: '#475569', display: 'block' }
const expandToggleStyle: React.CSSProperties = { fontSize: '12px', color: '#0d9488', background: 'none', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left' }
const tipToggleStyle: React.CSSProperties = { fontSize: '12px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left' }
const btnSkip: React.CSSProperties = { fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline', textUnderlineOffset: '2px', display: 'block', textAlign: 'right', width: '100%', marginBottom: '8px', padding: '4px 0' }
const TA = (minH: number): React.CSSProperties => ({ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: '#0a0f1a', resize: 'none', lineHeight: 1.65, minHeight: minH ? `${minH}px` : undefined, transition: 'border-color 0.2s' })
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '14px 36px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', borderRadius: '50px', fontSize: '14px', fontWeight: 600, color: 'white', cursor: 'pointer', letterSpacing: '0.3px', boxShadow: '0 8px 28px rgba(13,148,136,0.35)', transition: 'all 0.2s' }
const btnBack: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '13px 22px', background: 'white', border: '2px solid #185fa5', borderRadius: '50px', fontSize: '13px', fontWeight: 600, color: '#185fa5', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────
function StepLabel({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <div style={{ width: '18px', height: '2px', background: '#0d9488' }} />
      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#0d9488' }}>{label}</span>
    </div>
  )
}

function ExBox({ text }: { text: string }) {
  return (
    <>
      <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#94a3b8', marginBottom: '6px' }}>Example</div>
      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#64748b', lineHeight: 1.85, fontStyle: 'italic', marginBottom: '12px', border: '1px solid #f1f5f9', whiteSpace: 'pre-line' }}>{text}</div>
    </>
  )
}

function Field({ label, placeholder, fieldRef }: { label: string; placeholder: string; fieldRef: React.RefObject<HTMLInputElement> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>{label}</label>
      <input ref={fieldRef} placeholder={placeholder} style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: '#0a0f1a', transition: 'border-color 0.2s' }} />
    </div>
  )
}

function JDSection({ method, setMethod, pasteRef, uploadedFile, setUploadedFile, cvType }: any) {
  const required = cvType === 'cover_letter'
  return (
    <div style={{ background: '#fffbf5', border: '2px dashed #f59e0b', borderRadius: '18px', padding: '24px', marginBottom: '16px' }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
        🎯 Job Description
        <span style={{ fontSize: '10px', fontWeight: 600, background: '#fef9c3', color: '#854d0e', padding: '3px 10px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif" }}>{required ? 'Required for Cover Letter' : 'Optional — we\u2019ll tailor your CV to it'}</span>
      </div>
      <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.65, marginBottom: '14px', fontWeight: 300 }}>
        {required
          ? 'Paste or upload the job posting so we can tailor your letter to match exactly what the employer wants.'
          : 'Applying for a specific job? Paste or upload the posting (text, image, PDF or Word) and we\u2019ll tailor your CV to it. Skip this for a strong general CV.'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        {[{id:'paste',label:'✎ Paste text'},{id:'upload',label:'↑ Upload file'}].map(opt => (
          <button key={opt.id} onClick={() => setMethod(opt.id)}
            style={{ padding: '12px', border: `2px solid ${method === opt.id ? '#0d9488' : '#e2e8f0'}`, borderRadius: '12px', background: method === opt.id ? '#f0fdf9' : 'white', color: method === opt.id ? '#0f766e' : '#64748b', fontWeight: method === opt.id ? 700 : 500, fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {opt.label} {method === opt.id ? '✓' : ''}
          </button>
        ))}
      </div>
      {method === 'paste'
        ? <textarea ref={pasteRef} style={TA(110)} rows={5} placeholder="Paste job posting or describe the role here..." />
        : <UploadZone label="Upload the job posting" hint="PDF · Word · Image (screenshot)" onFile={setUploadedFile} file={uploadedFile} />
      }
    </div>
  )
}

function PhoneAndPrice({ phone, setPhone }: { phone: string; setPhone: (v: string) => void }) {
  return (
    <>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', marginBottom: '14px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '6px' }}>Your Phone Number</div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', fontWeight: 300, lineHeight: 1.65 }}>Your credits are linked to your phone number. Returning users with credits skip payment automatically.</p>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0551234567  or  +233551234567"
          style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: '#0a0f1a', transition: 'border-color 0.2s', display: 'block' }} />
      </div>
      <div style={{ background: 'linear-gradient(135deg, #f0fdf9, #ecfdf5)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '18px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '12px' }}>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0a0f1a' }}>GH₵ 35</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>One-time payment · No subscription</div>
        </div>
        <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>✓ 7 premium templates · ✓ Word + PDF download<br/>✓ Instant delivery · ✓ No subscription</div>
      </div>
    </>
  )
}

function ErrorDisplay({ error, onRetry, onDismiss }: { error: any; onRetry: () => void; onDismiss: () => void }) {
  if (!error) return null
  const icons: Record<string, string> = { payment: '💳', input: '📋', server: '⚙️', network: '🌐' }
  const colors: Record<string, string> = { payment: '#f59e0b', input: '#3b82f6', server: '#ef4444', network: '#8b5cf6' }
  const bgColors: Record<string, string> = { payment: '#fffbeb', input: '#eff6ff', server: '#fef2f2', network: '#f5f3ff' }
  const c = colors[error.type] || '#ef4444'
  return (
    <div style={{ background: bgColors[error.type] || '#fef2f2', border: `1px solid ${c}30`, borderRadius: '16px', padding: '20px', marginBottom: '16px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icons[error.type] || '❌'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111', marginBottom: '4px' }}>{error.title}</div>
          <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '14px' }}>{error.msg}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            <button onClick={onRetry} style={{ padding: '8px 18px', background: c, color: 'white', border: 'none', borderRadius: '50px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>Try Again</button>
            <button onClick={onDismiss} style={{ padding: '8px 18px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '50px', fontSize: '12.5px', fontWeight: 500, color: '#64748b', cursor: 'pointer' }}>Dismiss</button>
            <a href="https://wa.me/233559519783?text=Hi,%20I%20need%20help%20with%20SwiftCVPro" target="_blank" rel="noopener noreferrer" style={{ padding: '8px 18px', background: '#dcfce7', color: '#166534', borderRadius: '50px', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none' }}>💬 WhatsApp Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function UploadZone({ label, hint, onFile, file }: { label: string; hint: string; onFile: (f: File | null) => void; file: File | null }) {
  const ref = useRef<HTMLInputElement>(null)
  if (file) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#f0fdf9', border: '1.5px solid #0d9488', borderRadius: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0d9488', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, flexShrink: 0 }}>✓</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0a0f1a', marginBottom: '2px' }}>{file.name}</div>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>Ready — AI will read this when you generate</div>
      </div>
      <button onClick={() => onFile(null)} style={{ fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
    </div>
  )
  return (
    <div onClick={() => ref.current?.click()}
      style={{ border: '2px dashed #cbd5e1', borderRadius: '14px', padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#0d9488'; el.style.background = '#f0fdf9' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#cbd5e1'; el.style.background = '#f8fafc' }}
    >
      <div style={{ fontSize: '28px', marginBottom: '10px', color: '#94a3b8' }}>↑</div>
      <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#0a0f1a', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 300 }}>{hint}</div>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }} />
    </div>
  )
}
