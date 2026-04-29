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
// CV TYPES
// ─────────────────────────────────────────────────────────────
const CV_TYPES: { id: CVType; num: string; name: string; desc: string; best: string; time: string }[] = [
  { id: 'professional', num: '01', name: 'Professional CV',  desc: 'A complete CV for any employer and any job. Built to impress and pass ATS screening on the first pass.', best: 'Anyone looking for a job or updating their CV.', time: '~ 20 seconds' },
  { id: 'targeted',     num: '02', name: 'Targeted CV',      desc: 'A CV tailored for one specific job. Our AI reads the job posting and writes your CV to match it exactly.', best: 'Applying for a specific role you really want.', time: '~ 25 seconds' },
  { id: 'academic',     num: '03', name: 'Academic CV',      desc: 'Highlights your academic journey, research, publications, and teaching experience.', best: 'Postgraduate applicants, lecturers, researchers.', time: '~ 20 seconds' },
  { id: 'cover_letter', num: '04', name: 'Cover Letter',     desc: 'A strong, personalised letter that introduces you and makes the case for why you are the right person.', best: 'Anyone who wants an application letter that stands out.', time: '~ 15 seconds' },
]

export default function BuildPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [cvType, setCvType] = useState<CVType>('professional')
  const [inputMethod, setInputMethod] = useState<'form' | 'paste' | null>(null)
  const [pasteMethod, setPasteMethod] = useState<'paste' | 'upload'>('paste')
  const [jdMethod, setJdMethod] = useState<'paste' | 'upload'>('paste')
  const [jd3Method, setJd3Method] = useState<'paste' | 'upload'>('paste')
  const [uploadedCV, setUploadedCV] = useState<File | null>(null)
  const [uploadedJD, setUploadedJD] = useState<File | null>(null)
  const [uploadedJD3, setUploadedJD3] = useState<File | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<{ title: string; msg: string; type: 'payment' | 'input' | 'server' | 'network' } | null>(null)

  // Loading animation state
  const [loadingPct, setLoadingPct] = useState(0)
  const [loadingStep, setLoadingStep] = useState(0)
  const [didYouKnowIdx, setDidYouKnowIdx] = useState(0)
  const [didYouKnowFade, setDidYouKnowFade] = useState(true)

  const needsJD = cvType === 'targeted' || cvType === 'cover_letter'

  const refs = {
    paste: useRef<HTMLTextAreaElement>(null),
    clarify: useRef<HTMLTextAreaElement>(null),
    jdPaste: useRef<HTMLTextAreaElement>(null),
    jd3Paste: useRef<HTMLTextAreaElement>(null),
    fullName: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    location: useRef<HTMLInputElement>(null),
    nationality: useRef<HTMLInputElement>(null),
    dob: useRef<HTMLInputElement>(null),
    linkedin: useRef<HTMLInputElement>(null),
    languages: useRef<HTMLInputElement>(null),
    education: useRef<HTMLTextAreaElement>(null),
    experience: useRef<HTMLTextAreaElement>(null),
    additionalInfo: useRef<HTMLTextAreaElement>(null),
    specialRequests: useRef<HTMLTextAreaElement>(null),
  }

  // URL param: pre-select CV type from landing page CTAs
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type') as CVType
    if (t && ['professional','targeted','academic','cover_letter'].includes(t)) setCvType(t)
  }, [])

  // ── Loading bar animation ─────────────────────
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

    // Rotate did you knows every 5s
    const dyk = setInterval(() => {
      setDidYouKnowFade(false)
      setTimeout(() => {
        setDidYouKnowIdx(i => (i + 1) % DID_YOU_KNOWS.length)
        setDidYouKnowFade(true)
      }, 400)
    }, 5000)

    return () => { clearInterval(interval); clearInterval(dyk) }
  }, [isGenerating])

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
    if (inputMethod === 'paste' && pasteMethod === 'paste' && !refs.paste.current?.value.trim()) return 'content'
    if (inputMethod === 'paste' && pasteMethod === 'upload' && !uploadedCV) return 'file'
    if (inputMethod === 'form') {
      if (!refs.fullName.current?.value.trim()) return 'name'
      if (!refs.email.current?.value.trim()) return 'email'
      if (!refs.location.current?.value.trim()) return 'location'
    }
    if (needsJD) {
      const hasPasteContent = (inputMethod === 'paste' ? jdMethod : jd3Method) === 'paste'
        ? (inputMethod === 'paste' ? refs.jdPaste : refs.jd3Paste).current?.value.trim()
        : (inputMethod === 'paste' ? uploadedJD : uploadedJD3)
      if (!hasPasteContent) return 'jd'
    }
    return null
  }

  // ── Generate ──────────────────────────────────
  async function handleGenerate() {
    setError(null)
    const validErr = validate()
    if (validErr) {
      const msgs: Record<string, {title:string;msg:string;type:any}> = {
        phone:   { title: 'Phone number required', msg: 'Please enter your phone number so we can link your credit to the right account.', type: 'input' },
        content: { title: 'No CV content', msg: 'Please paste your CV or notes before generating.', type: 'input' },
        file:    { title: 'No file uploaded', msg: 'Please upload your CV file before generating.', type: 'input' },
        name:    { title: 'Name required', msg: 'Please enter your full name in Section 1.', type: 'input' },
        email:   { title: 'Email required', msg: 'Please enter your email address in Section 1.', type: 'input' },
        location:{ title: 'Location required', msg: 'Please enter your location (e.g. Accra, Ghana) in Section 1.', type: 'input' },
        jd:      { title: 'Job description required', msg: 'This CV type needs a job description. Please paste or upload one.', type: 'input' },
      }
      setError(msgs[validErr] || { title: 'Something missing', msg: 'Please check your details and try again.', type: 'input' })
      return
    }

    setIsGenerating(true)
    try {
      // Check credits first
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
    } catch (err: any) {
      setIsGenerating(false)
      setError({ title: 'Connection error', msg: 'Could not connect to the server. Please check your internet and try again.', type: 'network' })
    }
  }

  async function doGenerate(normalizedPhone: string) {
    try {
      let rawContent = ''
      let jobDescription = ''

      if (inputMethod === 'paste') {
        rawContent = pasteMethod === 'upload' && uploadedCV
          ? await extractFile(uploadedCV)
          : refs.paste.current?.value || ''
        const clarify = refs.clarify.current?.value?.trim()
        if (clarify) rawContent += '\n\nADDITIONAL NOTES:\n' + clarify
        if (needsJD) {
          jobDescription = jdMethod === 'upload' && uploadedJD
            ? await extractFile(uploadedJD)
            : refs.jdPaste.current?.value || ''
        }
      }

      if (inputMethod === 'form') {
        const parts: string[] = []
        const r = refs
        if (r.fullName.current?.value) parts.push(`FULL NAME: ${r.fullName.current.value}`)
        if (r.phone.current?.value) parts.push(`PHONE: ${r.phone.current.value}`)
        if (r.email.current?.value) parts.push(`EMAIL: ${r.email.current.value}`)
        if (r.location.current?.value) parts.push(`LOCATION: ${r.location.current.value}`)
        if (r.nationality.current?.value) parts.push(`NATIONALITY: ${r.nationality.current.value}`)
        if (r.dob.current?.value) parts.push(`DATE OF BIRTH: ${r.dob.current.value}`)
        if (r.linkedin.current?.value) parts.push(`LINKEDIN: ${r.linkedin.current.value}`)
        if (r.languages.current?.value) parts.push(`LANGUAGES: ${r.languages.current.value}`)
        if (r.education.current?.value) parts.push(`\nEDUCATION:\n${r.education.current.value}`)
        if (r.experience.current?.value) parts.push(`\nWORK EXPERIENCE:\n${r.experience.current.value}`)
        if (r.additionalInfo.current?.value) parts.push(`\nADDITIONAL INFO:\n${r.additionalInfo.current.value}`)
        if (r.specialRequests.current?.value) parts.push(`\nSPECIAL REQUESTS:\n${r.specialRequests.current.value}`)
        rawContent = parts.join('\n')
        if (needsJD) {
          jobDescription = jd3Method === 'upload' && uploadedJD3
            ? await extractFile(uploadedJD3)
            : refs.jd3Paste.current?.value || ''
        }
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvType, rawContent, jobDescription: needsJD ? jobDescription : undefined, phoneNumber: normalizedPhone })
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
    } catch (err: any) {
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
        amount: 3000000,
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

  const go = (s: 1|2|3) => { setStep(s); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0fdf9 0%, #f8fafc 40%, #fefdfb 100%)' }}>
      <Nav step={step} />

      {/* ══ STEP 1 — CHOOSE CV TYPE ══════════════════════════ */}
      {step === 1 && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 28px 80px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '2px', background: '#0d9488' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#0d9488' }}>Step 1 of 3</span>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 600, color: '#0a0f1a', marginBottom: '10px', lineHeight: 1.05, letterSpacing: '-0.5px' }}>
            What do you need today?
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '48px', fontWeight: 300, lineHeight: 1.7 }}>
            Choose the document type below. One click and we guide you through the rest.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '36px' }}>
            {CV_TYPES.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => { setCvType(t.id); go(2) }}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '28px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = 'translateY(-3px)'
                  el.style.boxShadow = '0 12px 40px rgba(13,148,136,0.15)'
                  el.style.borderColor = '#0d9488'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = 'translateY(0)'
                  el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'
                  el.style.borderColor = '#e2e8f0'
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${['#0d9488','#1a56c4','#6b21a8','#b45309'][idx]}, transparent)` }} />
                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#cbd5e1', marginBottom: '18px' }}>{t.num}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.55rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '10px', lineHeight: 1.15 }}>{t.name}</div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7, fontWeight: 300, marginBottom: '20px' }}>{t.desc}</div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
                    <span style={{ fontWeight: 500, color: '#475569' }}>Best for: </span>{t.best}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: 500 }}>⚡ {t.time}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0d9488', background: '#f0fdf9', padding: '7px 16px', borderRadius: '50px', border: '1.5px solid #0d9488' }}>Choose →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', background: '#f0fdf9', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0d9488', flexShrink: 0, marginTop: '5px' }} />
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.65, fontWeight: 300 }}>
              <strong style={{ fontWeight: 600, color: '#0a0f1a' }}>Not sure which to pick?</strong> Choose Professional CV — it works for most job applications and can be used anywhere.
            </p>
          </div>
        </div>
      )}

      {/* ══ STEP 2 — INPUT METHOD ══════════════════════════ */}
      {step === 2 && (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '64px 28px 80px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '2px', background: '#0d9488' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#0d9488' }}>Step 2 of 3</span>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 600, color: '#0a0f1a', marginBottom: '10px', lineHeight: 1.05 }}>
            How would you like to share your details?
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '48px', fontWeight: 300, lineHeight: 1.7 }}>
            Both options give the exact same quality result. Choose whatever is easier for you.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {[
              { method: 'paste' as const, icon: '📋', title: 'Paste my old CV', desc: 'Copy and paste your existing CV, rough notes, or anything you have. Our AI reads and rebuilds everything.', time: '⚡ Under 1 minute', sub: 'Fastest option' },
              { method: 'form' as const,  icon: '📝', title: 'Fill a guided form', desc: 'We walk you through each section with clear instructions and examples. Great if you\'re starting from scratch.', time: '⚡ Under 3 minutes', sub: 'Great if no old CV' },
            ].map(opt => (
              <div
                key={opt.method}
                onClick={() => { setInputMethod(opt.method); go(3) }}
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '32px 28px', cursor: 'pointer', transition: 'all 0.25s', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 12px 40px rgba(13,148,136,0.15)'; el.style.borderColor = '#0d9488' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; el.style.borderColor = '#e2e8f0' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{opt.icon}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.55rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '12px' }}>{opt.title}</div>
                <div style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.7, fontWeight: 300, marginBottom: '24px' }}>{opt.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: 500 }}>{opt.time}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{opt.sub}</div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0d9488', background: '#f0fdf9', padding: '7px 16px', borderRadius: '50px', border: '1.5px solid #0d9488' }}>Choose →</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => go(1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 22px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '50px', fontSize: '13.5px', fontWeight: 500, color: '#475569', cursor: 'pointer' }}>← Back</button>
        </div>
      )}

      {/* ══ STEP 3A — PASTE PATH ══════════════════════════ */}
      {step === 3 && inputMethod === 'paste' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '64px 28px 80px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '2px', background: '#0d9488' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#0d9488' }}>Step 3 of 3</span>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 600, color: '#0a0f1a', marginBottom: '10px', lineHeight: 1.05 }}>Share your existing CV</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '36px', fontWeight: 300, lineHeight: 1.7 }}>
            Paste text or upload a file. The messier the better — our AI organises everything.
          </p>

          {/* Toggle paste/upload */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[{id:'paste',label:'✎ Paste text'},{id:'upload',label:'↑ Upload file'}].map(opt => (
              <button key={opt.id} onClick={() => setPasteMethod(opt.id as any)} style={{ padding: '14px', border: `2px solid ${pasteMethod === opt.id ? '#0d9488' : '#e2e8f0'}`, borderRadius: '14px', background: pasteMethod === opt.id ? '#f0fdf9' : 'white', color: pasteMethod === opt.id ? '#0f766e' : '#64748b', fontWeight: pasteMethod === opt.id ? 700 : 500, fontSize: '13.5px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif" }}>
                {opt.label} {pasteMethod === opt.id ? '✓' : ''}
              </button>
            ))}
          </div>

          {pasteMethod === 'paste' ? (
            <Card title="Paste your CV, notes, or anything you have" desc="Copy from Word, PDF, WhatsApp, email — any format is fine." tip="💡 Don't worry about formatting. Rough notes work perfectly.">
              <textarea ref={refs.paste} style={TA(200)} rows={10} placeholder={`Paste your CV content here...\n\nExample:\nKwame Mensah\nIT Officer at MTN Ghana 2019–present\nBefore that Vodafone IT support 2017–2019\nBSc Computer Science, KNUST 2016\nAccra, Ghana | kwame@email.com | 0551234567`} />
            </Card>
          ) : (
            <Card title="Upload your CV file" desc="We accept PDF, Word documents, images, and screenshots.">
              <UploadZone label="Drop your CV here or click to browse" hint="PDF · Word (.docx) · Image (JPG, PNG, screenshot)" onFile={setUploadedCV} file={uploadedCV} />
            </Card>
          )}

          <Card title="Anything to add or clarify?" desc="Updates, corrections, or things to emphasise." opt>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#cbd5e1', marginBottom: '6px' }}>Example</div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginBottom: '12px', border: '1px solid #f1f5f9', lineHeight: 1.8 }}>{`"I was promoted to Senior Manager in 2023"\n"Please emphasise my leadership experience"`}</div>
            <textarea ref={refs.clarify} style={TA(80)} rows={3} placeholder="Type any updates or special requests — or leave blank..." />
          </Card>

          {needsJD && <JDSection method={jdMethod} setMethod={setJdMethod} pasteRef={refs.jdPaste} uploadedFile={uploadedJD} setUploadedFile={setUploadedJD} cvType={cvType} />}

          <PhoneAndPrice phone={phoneNumber} setPhone={setPhoneNumber} />
          <ErrorDisplay error={error} onRetry={handleGenerate} onDismiss={() => setError(null)} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => go(2)} style={btnBack}>← Back</button>
            <button onClick={handleGenerate} disabled={isGenerating} style={{ ...btnPrimary, opacity: isGenerating ? 0.6 : 1 }}>
              {isGenerating ? 'Generating...' : `Generate my ${cvType === 'cover_letter' ? 'cover letter' : 'CV'} →`}
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 3B — FORM PATH ══════════════════════════ */}
      {step === 3 && inputMethod === 'form' && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 28px 80px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '2px', background: '#0d9488' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#0d9488' }}>Step 3 of 3 — Fill a Form</span>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 600, color: '#0a0f1a', marginBottom: '10px', lineHeight: 1.05 }}>Tell us about yourself</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '40px', fontWeight: 300, lineHeight: 1.7 }}>Fill in each section below. Write naturally — no perfect format needed. Optional sections can be skipped.</p>

          {/* Section 1 */}
          <SectionCard num="Section 1 of 5" title="Basic Details" desc="Fields marked * are required. The rest are optional.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '12px' }}>
              <Field label="Full Name *" ref={refs.fullName} placeholder="e.g. Kwame Mensah" />
              <Field label="Phone Number *" ref={refs.phone} placeholder="e.g. 0551234567" />
              <Field label="Email Address *" ref={refs.email} placeholder="e.g. kwame@gmail.com" />
              <Field label="Location *" ref={refs.location} placeholder="e.g. Accra, Ghana" />
            </div>
            <Divider label="Optional" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <Field label="Nationality" ref={refs.nationality} placeholder="e.g. Ghanaian" />
              <Field label="Date of Birth" ref={refs.dob} placeholder="e.g. 14 March 1995" />
              <Field label="LinkedIn URL" ref={refs.linkedin} placeholder="e.g. linkedin.com/in/kwame" />
              <Field label="Languages Spoken" ref={refs.languages} placeholder="e.g. English, Twi" />
            </div>
          </SectionCard>

          {/* Section 2 */}
          <SectionCard num="Section 2 of 5" title="Education" desc="Your academic background — from SHS to your highest qualification.">
            <Tip text="💡 List as shown in the example. Any order is fine — our AI organises it properly." />
            <ExBox text={`University of Cape Coast – MSc Agriculture – 2022-2024\nUniversity of Ghana – BSc Computer Science – 2018-2022\nSt Thomas Aquinas SHS – WASSCE (General Arts) – 2013-2016`} />
            <textarea ref={refs.education} style={TA(110)} rows={5} placeholder="Write your education history here..." />
          </SectionCard>

          {/* Section 3 */}
          <SectionCard num="Section 3 of 5" title="Work Experience" desc="All the places you have worked — including internships, national service, and volunteer roles.">
            <Tip text="💡 No need to list duties — our AI generates achievement-focused bullet points automatically." />
            <ExBox text={`Staff Nurse – Ridge Hospital – 2019-Present\nIT Officer – MTN Ghana – 2017-2019\nNational Service – GRA, Kumasi – 2016-2017\nAccounts Intern – Ecobank Ghana – 2015`} />
            <textarea ref={refs.experience} style={TA(110)} rows={5} placeholder="Write your work experience here..." />
          </SectionCard>

          {/* Section 4 */}
          <SectionCard num="Section 4 of 5" title="Additional Information" desc="Awards, certifications, memberships, licenses, short courses, leadership roles." opt>
            <Tip text="💡 Skip this section if nothing applies to you." />
            <ExBox text={`President – Student Council, KNUST – 2022\nGoogle Analytics Certified – 2023\nMember – Ghana Institute of Engineers – 2021`} />
            <textarea ref={refs.additionalInfo} style={TA(90)} rows={4} placeholder="Write any additional information — or leave blank to skip..." />
          </SectionCard>

          {/* Section 5 */}
          <SectionCard num="Section 5 of 5" title="Help us get it right" desc="Any corrections, updates, or things you want our AI to emphasise or remove." opt>
            <ExBox text={`"I was promoted to Senior Manager in 2022 – please add this"\n"Please emphasise my leadership experience"\n"Remove my national service — too old"`} />
            <textarea ref={refs.specialRequests} style={TA(90)} rows={4} placeholder="Type any special requests — or leave blank to skip..." />
          </SectionCard>

          {needsJD && <JDSection method={jd3Method} setMethod={setJd3Method} pasteRef={refs.jd3Paste} uploadedFile={uploadedJD3} setUploadedFile={setUploadedJD3} cvType={cvType} />}

          <PhoneAndPrice phone={phoneNumber} setPhone={setPhoneNumber} />
          <ErrorDisplay error={error} onRetry={handleGenerate} onDismiss={() => setError(null)} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => go(2)} style={btnBack}>← Back</button>
            <button onClick={handleGenerate} disabled={isGenerating} style={{ ...btnPrimary, opacity: isGenerating ? 0.6 : 1 }}>
              {isGenerating ? 'Generating...' : `Generate my ${cvType === 'cover_letter' ? 'cover letter' : 'CV'} →`}
            </button>
          </div>
        </div>
      )}

      {/* ══ LOADING OVERLAY ══════════════════════════════════ */}
      {isGenerating && (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0f1a', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '32px' }}>

          {/* Glow effect */}
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ width: '100%', maxWidth: '540px', textAlign: 'center' }}>

            {/* Animated ring */}
            <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 32px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke="url(#tealGrad)" strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - loadingPct / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
                <defs>
                  <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#5eead4" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '22px', fontWeight: 700, color: 'white', lineHeight: 1 }}>{loadingPct}</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>%</span>
              </div>
            </div>

            {/* Step message */}
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', color: 'white', fontWeight: 500, marginBottom: '8px', lineHeight: 1.2 }}>
              {LOADING_STEPS[loadingStep]?.msg || 'Building your CV...'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '32px', letterSpacing: '0.2px' }}>
              {LOADING_STEPS[loadingStep]?.detail || 'Please wait...'}
            </p>

            {/* Progress bar */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden', marginBottom: '40px' }}>
              <div style={{ height: '100%', width: `${loadingPct}%`, background: 'linear-gradient(90deg, #0d9488, #5eead4)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
            </div>

            {/* Did you know */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px 24px', textAlign: 'left', opacity: didYouKnowFade ? 1 : 0, transition: 'opacity 0.4s ease' }}>
              <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2px', color: '#5eead4', marginBottom: '8px' }}>DID YOU KNOW?</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: '10px', fontWeight: 400 }}>
                {DID_YOU_KNOWS[didYouKnowIdx].fact}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                💡 {DID_YOU_KNOWS[didYouKnowIdx].tip}
              </div>
            </div>

            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)', marginTop: '24px' }}>Please do not close this page</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SHARED STYLE CONSTANTS
// ─────────────────────────────────────────────────────────────
const TA = (minH: number): React.CSSProperties => ({
  width: '100%', padding: '14px 16px', border: '1.5px solid #e2e8f0', borderRadius: '12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: '#0a0f1a',
  resize: 'none', lineHeight: 1.65, minHeight: `${minH}px`, transition: 'border-color 0.2s'
})
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '10px',
  padding: '15px 40px', background: 'linear-gradient(135deg, #0d9488, #0f766e)',
  border: 'none', borderRadius: '50px', fontSize: '14.5px', fontWeight: 600,
  color: 'white', cursor: 'pointer', letterSpacing: '0.3px',
  boxShadow: '0 8px 28px rgba(13,148,136,0.35)', transition: 'all 0.2s'
}
const btnBack: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '14px 24px', background: 'white', border: '1px solid #e2e8f0',
  borderRadius: '50px', fontSize: '13.5px', fontWeight: 500, color: '#475569', cursor: 'pointer'
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────
function Card({ title, desc, tip, opt, children }: { title: string; desc?: string; tip?: string; opt?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px 24px 20px', marginBottom: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, color: '#0a0f1a' }}>{title}</div>
        {opt && <span style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8', background: '#f1f5f9', padding: '3px 10px', borderRadius: '20px' }}>Optional</span>}
      </div>
      {desc && <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', fontWeight: 300, lineHeight: 1.65 }}>{desc}</p>}
      {tip && <Tip text={tip} />}
      {children}
    </div>
  )
}

function SectionCard({ num, title, desc, opt, children }: { num: string; title: string; desc?: string; opt?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '28px', marginBottom: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#0d9488', background: '#f0fdf9', padding: '3px 10px', borderRadius: '20px' }}>{num}</span>
        {opt && <span style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8', background: '#f1f5f9', padding: '3px 10px', borderRadius: '20px' }}>Optional</span>}
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '6px' }}>{title}</div>
      {desc && <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', fontWeight: 300, lineHeight: 1.65 }}>{desc}</p>}
      {children}
    </div>
  )
}

function Tip({ text }: { text: string }) {
  return <div style={{ background: '#f0fdf9', borderLeft: '3px solid #0d9488', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: '12.5px', color: '#475569', lineHeight: 1.65, marginBottom: '12px', fontWeight: 300 }}>{text}</div>
}

function ExBox({ text }: { text: string }) {
  return (
    <>
      <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#cbd5e1', marginBottom: '6px' }}>Example</div>
      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#64748b', lineHeight: 1.85, fontStyle: 'italic', marginBottom: '14px', border: '1px solid #f1f5f9', whiteSpace: 'pre-line' }}>{text}</div>
    </>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 14px', fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      <span>{label}</span>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
    </div>
  )
}

const Field = ({ label, placeholder, ref: fieldRef }: { label: string; placeholder: string; ref: React.RefObject<HTMLInputElement> }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <label style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155' }}>{label}</label>
    <input ref={fieldRef} placeholder={placeholder} style={{ padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: '#0a0f1a', transition: 'border-color 0.2s' }} />
  </div>
)

function JDSection({ method, setMethod, pasteRef, uploadedFile, setUploadedFile, cvType }: any) {
  const label = cvType === 'cover_letter' ? 'Cover Letter' : 'Targeted CV'
  return (
    <div style={{ background: '#fffbf5', border: '2px dashed #f59e0b', borderRadius: '18px', padding: '24px', marginBottom: '16px' }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        🎯 Job Description
        <span style={{ fontSize: '10px', fontWeight: 600, background: '#fef9c3', color: '#854d0e', padding: '3px 10px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif" }}>Required for {label}</span>
      </div>
      <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.65, marginBottom: '14px', fontWeight: 300 }}>
        Paste the job posting so we can tailor your {cvType === 'cover_letter' ? 'letter' : 'CV'} to match exactly what the employer wants.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        {[{id:'paste',label:'✎ Paste text'},{id:'upload',label:'↑ Upload file'}].map(opt => (
          <button key={opt.id} onClick={() => setMethod(opt.id)} style={{ padding: '12px', border: `2px solid ${method === opt.id ? '#0d9488' : '#e2e8f0'}`, borderRadius: '12px', background: method === opt.id ? '#f0fdf9' : 'white', color: method === opt.id ? '#0f766e' : '#64748b', fontWeight: method === opt.id ? 700 : 500, fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {opt.label} {method === opt.id ? '✓' : ''}
          </button>
        ))}
      </div>
      {method === 'paste' ? (
        <textarea ref={pasteRef} style={TA(110)} rows={5} placeholder="Paste job posting or describe the role here..." />
      ) : (
        <UploadZone label="Upload the job posting" hint="PDF · Word · Image (screenshot, WhatsApp forward)" onFile={setUploadedFile} file={uploadedFile} />
      )}
    </div>
  )
}

function PhoneAndPrice({ phone, setPhone }: { phone: string; setPhone: (v: string) => void }) {
  return (
    <>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '6px' }}>Your Phone Number</div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', fontWeight: 300, lineHeight: 1.65 }}>Your credits are linked to your phone number. Returning users with credits skip payment automatically.</p>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0551234567  or  +233551234567" style={{ ...TA(0), minHeight: '0', padding: '13px 16px', borderRadius: '12px', display: 'block' }} />
      </div>
      <div style={{ background: 'linear-gradient(135deg, #f0fdf9, #ecfdf5)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '18px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0a0f1a' }}>GH₵ 30 <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>/ $5 USD</span></div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>One-time payment · No subscription</div>
        </div>
        <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>✓ Full editing access · ✓ 8 premium templates<br/>✓ Word + PDF download · ✓ Unlimited downloads</div>
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
  const bg = bgColors[error.type] || '#fef2f2'
  return (
    <div style={{ background: bg, border: `1px solid ${c}30`, borderRadius: '16px', padding: '20px', marginBottom: '16px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icons[error.type] || '❌'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111', marginBottom: '4px' }}>{error.title}</div>
          <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '14px' }}>{error.msg}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={onRetry} style={{ padding: '8px 18px', background: c, color: 'white', border: 'none', borderRadius: '50px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>Try Again</button>
            <button onClick={onDismiss} style={{ padding: '8px 18px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '50px', fontSize: '12.5px', fontWeight: 500, color: '#64748b', cursor: 'pointer' }}>Dismiss</button>
            <a href="https://wa.me/233559519783?text=Hi,%20I%20need%20help%20with%20SwiftCVPro" target="_blank" rel="noopener noreferrer" style={{ padding: '8px 18px', background: '#dcfce7', color: '#166534', borderRadius: '50px', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none', border: 'none' }}>💬 WhatsApp Support</a>
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
    <div onClick={() => ref.current?.click()} style={{ border: '2px dashed #cbd5e1', borderRadius: '14px', padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s' }}
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
