'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { CVType } from '@/types'
import { PACKAGES, packagesForDoc } from '@/lib/packages'
import { BuildSeed, saveBuildSeed, loadBuildSeed, clearBuildSeed } from '@/lib/buildSeed'

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
  cover_letter: { label: 'Cover Letter',    shortLabel: 'Cover Letter',    hasJobStep: true,  totalFormSteps: 3 },
}

// A cover letter is not a CV, so it doesn't walk the CV-shaped path. It needs
// four things — who you are, your background, the role, and why you want it —
// which is three screens, not five. Education and Skills are skipped: a
// ~300-word letter draws on a summary of your background, not a full breakdown.
const COVER_LETTER_PATH: Screen[] = ['form-1', 'form-3', 'form-5']


export default function BuildPage() {
  const router = useRouter()

  // ── Screen state ──────────────────────────────
  // Type first: knowing the document up front lets the rest of the flow adapt —
  // academic extras only for academics, job details only where relevant, and a
  // cover-letter user never wades through CV-only fields.
  const [screen, setScreen] = useState<Screen>('type')
  // Professional CV is the common case, so it's selected by default — the user
  // can switch, but never has to make a choice just to move forward.
  const [typeChosen, setTypeChosen] = useState(true)
  // Phone + credit balance are collected up front (on the type screen) now.
  // creditBalance is null until we've checked; once known, the info screens
  // show a "what you have left" badge when there's anything to show.
  const [typeErr, setTypeErr] = useState('')
  const [creditBalance, setCreditBalance] = useState<{ cv: number; cl: number } | null>(null)
  const [cvType, setCvType] = useState<CVType>('professional')
  const [inputMethod, setInputMethod] = useState<'paste' | 'form'>('paste')
  // Default to upload: this screen is reached from "I already have a CV", so a
  // file is the expected input. Pasting is one tap away.
  const [pasteInputMode, setPasteInputMode] = useState<'paste' | 'upload'>('upload')
  const [uploadedCV, setUploadedCV] = useState<File | null>(null)
  // Pricing modal: shown when the user has no credits and must buy a package.
  const [showPricing, setShowPricing] = useState(false)
  const [payPhone, setPayPhone] = useState('')
  // Set only on the "popup blocked, opened a new tab instead" fallback path —
  // shows a manual "Verify Payment" prompt until the user confirms they paid.
  const [paymentPending, setPaymentPending] = useState<{ reference: string } | null>(null)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [uploadedJD, setUploadedJD] = useState<File | null>(null)
  const [jdInputMode, setJdInputMode] = useState<'paste' | 'upload'>('paste')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  // Separate from isGenerating: the quick pre-flight credit check. Kept apart so
  // the full-screen "generating" animation never shows before we've confirmed
  // the user actually has credits (otherwise a no-credit user briefly sees a
  // generation screen, which reads as "it generated for free").
  const [checkingCredits, setCheckingCredits] = useState(false)
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

  const isCoverLetter = cvType === 'cover_letter'
  // Display step number: cover letters follow COVER_LETTER_PATH, so form-3 is
  // "Step 2" for them and "Step 3" for everyone else.
  const stepNo = (s: Screen) => isCoverLetter ? COVER_LETTER_PATH.indexOf(s) + 1 : Number(s.split('-')[1])
  // Where "Next" goes from a given step, honouring the shorter letter path.
  const nextAfter = (s: Screen): Screen =>
    isCoverLetter
      ? COVER_LETTER_PATH[COVER_LETTER_PATH.indexOf(s) + 1] || 'summary'
      : (s === 'form-1' ? 'form-2' : s === 'form-2' ? 'form-3' : s === 'form-3' ? 'form-4' : 'form-5')

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
    addressee: useRef<HTMLInputElement>(null),
    companyAddress: useRef<HTMLInputElement>(null),
    // "Tailor my CV for…" — for people with no specific advert who still know
    // the job and/or industry they want. Separate refs per screen because both
    // screens stay mounted (display:none), so one ref can't serve both.
    tailorJobPaste: useRef<HTMLInputElement>(null),
    tailorIndustryPaste: useRef<HTMLInputElement>(null),
    tailorIndustryForm: useRef<HTMLInputElement>(null),
  }

  // ── URL param pre-select ──────────────────────
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type') as CVType
    if (t && ['professional','targeted','academic','cover_letter'].includes(t)) setCvType(t)
  }, [])

  // ── Restore a build seed, if one is waiting ───────────────────
  // Two unrelated flows leave this page and come back with a seed saved in
  // sessionStorage (see lib/buildSeed.ts): an in-app-browser Paystack
  // checkout round trip (via /payment-return), and "Duplicate" from CV
  // history. Both are handled by this one check — restore whatever is
  // there, then clear it so a stale seed can't reapply on a later visit.
  useEffect(() => {
    const seed = loadBuildSeed()
    if (seed) { applyBuildSeed(seed); clearBuildSeed() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // One consistent Back, top-left (the pattern Resume Now and BetterCV use).
  // Keeping it in a single place means the bottom row holds only the primary
  // action, so there is no duplicated control competing for attention.
  const backTargets: Partial<Record<Screen, Screen>> = {
    method: 'type',
    paste: 'method',
    'form-1': 'method',
    'form-2': 'form-1',
    'form-3': isCoverLetter ? 'form-1' : 'form-2',
    'form-4': 'form-3',
    'form-5': isCoverLetter ? 'form-3' : 'form-4',
    summary: meta.hasJobStep ? 'form-5' : 'form-4',
  }
  const backTo = backTargets[screen]

  // The document type is step 1, so choosing it leads into how to share info.
  function goAfterType() {
    setTypeErr('')
    if (!typeChosen) { setTypeErr('Please choose what to create.'); return }
    const digits = phoneNumber.replace(/\D/g, '')
    if (!phoneNumber.trim()) { setTypeErr('Please enter your phone number.'); return }
    if (digits.length < 9) { setTypeErr('Please enter a valid phone number.'); return }
    // Advance instantly — no waiting, no "checking" state. The balance is
    // fetched in the background purely so the info screens can show what's
    // left; if it's slow or fails, the user never notices (Generate re-checks
    // authoritatively anyway).
    go('method')
    fetch('/api/check-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, cvType }),
    })
      .then(res => res.json())
      .then(d => setCreditBalance({ cv: d.credits || 0, cl: d.coverLetterCredits || 0 }))
      .catch(() => setCreditBalance(null))
  }

  // ── Build seed: capture / restore ──────────────────────────────
  // Snapshot everything currently typed. Used right before an in-app-browser
  // Paystack redirect (see triggerPaystack) and — later — by "Duplicate" in
  // CV history. Uploaded FILES (a paste-path CV, or a JD upload) cannot be
  // serialised into sessionStorage; if the current content came from an
  // uploaded file rather than pasted text, this captures nothing for that
  // field and the restored screen will simply ask for it again — validate()
  // already handles that case correctly, so no extra UI is needed for it.
  function captureBuildSeed(landingScreen: 'summary' | 'type'): BuildSeed {
    return {
      cvType,
      inputMethod,
      phoneNumber,
      pasteContent: inputMethod === 'paste' && pasteInputMode === 'paste' ? (refs.paste.current?.value || undefined) : undefined,
      clarifyNotes: inputMethod === 'paste' ? (refs.clarify.current?.value || undefined) : undefined,
      form: inputMethod === 'form' ? {
        fullName: refs.fullName.current?.value || undefined,
        phone: refs.phone.current?.value || undefined,
        email: refs.email.current?.value || undefined,
        location: refs.location.current?.value || undefined,
        dob: refs.dob.current?.value || undefined,
        nationality: refs.nationality.current?.value || undefined,
        linkedin: refs.linkedin.current?.value || undefined,
        education: refs.education.current?.value || undefined,
        gpa: refs.gpa.current?.value || undefined,
        thesis: refs.thesis.current?.value || undefined,
        research: refs.research.current?.value || undefined,
        experience: refs.experience.current?.value || undefined,
        publications: refs.publications.current?.value || undefined,
        teaching: refs.teaching.current?.value || undefined,
        conferences: refs.conferences.current?.value || undefined,
        extras: refs.extras.current?.value || undefined,
        grants: refs.grants.current?.value || undefined,
        supervision: refs.supervision.current?.value || undefined,
        orcid: refs.orcid.current?.value || undefined,
        jobTitle: refs.jobTitle.current?.value || undefined,
        company: refs.company.current?.value || undefined,
      } : undefined,
      jobDescription: needsJD
        ? (inputMethod === 'paste' ? (refs.jdPaste.current?.value || undefined) : (refs.jobDesc.current?.value || undefined))
        : undefined,
      whyRole: cvType === 'cover_letter' ? (refs.whyRole.current?.value || undefined) : undefined,
      landingScreen,
    }
  }

  function applyBuildSeed(seed: BuildSeed) {
    setCvType(seed.cvType)
    setInputMethod(seed.inputMethod)
    if (seed.phoneNumber) setPhoneNumber(seed.phoneNumber)
    // All screens are always mounted (hidden via display:none — see the data-
    // loss fix elsewhere in this file), so refs already exist; still defer one
    // frame so the state updates above have applied before we touch inputs.
    requestAnimationFrame(() => {
      const setVal = (ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>, v?: string) => {
        if (v !== undefined && ref.current) ref.current.value = v
      }
      if (seed.pasteContent) { setPasteInputMode('paste'); setVal(refs.paste, seed.pasteContent) }
      setVal(refs.clarify, seed.clarifyNotes)
      if (seed.form) {
        const f = seed.form
        setVal(refs.fullName, f.fullName); setVal(refs.phone, f.phone); setVal(refs.email, f.email); setVal(refs.location, f.location)
        setVal(refs.dob, f.dob); setVal(refs.nationality, f.nationality); setVal(refs.linkedin, f.linkedin)
        setVal(refs.education, f.education); setVal(refs.gpa, f.gpa); setVal(refs.thesis, f.thesis); setVal(refs.research, f.research)
        setVal(refs.experience, f.experience); setVal(refs.publications, f.publications); setVal(refs.teaching, f.teaching); setVal(refs.conferences, f.conferences)
        setVal(refs.extras, f.extras); setVal(refs.grants, f.grants); setVal(refs.supervision, f.supervision); setVal(refs.orcid, f.orcid)
        setVal(refs.jobTitle, f.jobTitle); setVal(refs.company, f.company)
      }
      if (seed.jobDescription) { setJdInputMode('paste'); setVal(refs.jdPaste, seed.jobDescription); setVal(refs.jobDesc, seed.jobDescription) }
      setVal(refs.whyRole, seed.whyRole)
    })
    go(seed.landingScreen)
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
    setCheckingCredits(true)
    try {
      const creditRes = await fetch('/api/check-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, cvType })
      })
      const creditData = await creditRes.json()
      setCheckingCredits(false)
      if (!creditData.hasCredits) {
        // No credits → let them choose a package before paying. We deliberately
        // never showed the generating animation, so this goes straight to the
        // pricing modal with nothing misleading in between.
        setPayPhone(creditData.phoneNumber || phoneNumber)
        setShowPricing(true)
        return
      }
      // Credits confirmed — only now start the generation animation.
      setIsGenerating(true)
      await doGenerate(creditData.phoneNumber)
    } catch {
      setCheckingCredits(false)
      setError({ title: 'Connection error', msg: 'Could not connect to the server. Please check your internet and try again.', type: 'network' })
    }
  }

  async function doGenerate(normalizedPhone: string) {
    try {
      let rawContent = ''
      let jobDescription = ''

      if (inputMethod === 'paste') {
        const fromUpload = pasteInputMode === 'upload' && !!uploadedCV
        rawContent = fromUpload
          ? await extractFile(uploadedCV as File)
          : refs.paste.current?.value || ''

        // A CV that yields almost no text is either an unreadable scan, a
        // wrong/blank file, or a few stray words pasted in. Generating from
        // that produces a useless CV, so stop here and say what to do.
        if (rawContent.replace(/\s+/g, ' ').trim().length < 80) {
          setIsGenerating(false)
          setError(fromUpload
            ? { title: 'We couldn’t read enough from that file', msg: 'It may be a scanned image, password-protected, or not a CV. Try a clearer photo, a text-based PDF or Word file — or paste your details in instead.', type: 'input' }
            : { title: 'Not enough detail yet', msg: 'Add more about your education, work experience and skills so we have something to build from.', type: 'input' })
          return
        }

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
        // The guided path now uses the same JD component as the paste path, so
        // read it the same way — including extracting an uploaded posting.
        if (needsJD) {
          jobDescription = jdInputMode === 'upload' && uploadedJD
            ? await extractFile(uploadedJD)
            : refs.jdPaste.current?.value || ''
        }
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
          targetIndustry: r.tailorIndustryForm.current?.value || undefined,
          jobDescription: needsJD ? (jobDescription || undefined) : undefined,
          whyRole: cvType === 'cover_letter' ? (r.whyRole.current?.value || undefined) : undefined,
          // Cover-letter recipient (formal Ghanaian address block)
          addressee: cvType === 'cover_letter' ? (r.addressee.current?.value || undefined) : undefined,
          companyAddress: cvType === 'cover_letter' ? (r.companyAddress.current?.value || undefined) : undefined,
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
        if (data.historyId) sessionStorage.setItem('swiftcv_history_id', String(data.historyId))
        else sessionStorage.removeItem('swiftcv_history_id')
        router.push('/preview')
        return
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvType, rawContent,
          jobDescription: needsJD ? (jobDescription || undefined) : undefined,
          // "Tailor my CV for…" — used when no advert was given
          jobTitle: needsJD ? (refs.tailorJobPaste.current?.value || undefined) : undefined,
          targetIndustry: needsJD ? (refs.tailorIndustryPaste.current?.value || undefined) : undefined,
          phoneNumber: normalizedPhone,
        })
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
      if (data.historyId) sessionStorage.setItem('swiftcv_history_id', String(data.historyId))
      else sessionStorage.removeItem('swiftcv_history_id')
      router.push('/preview')
    } catch {
      setIsGenerating(false)
      setError({ title: 'Network error', msg: 'Lost connection mid-generation. Please check your internet and try again.', type: 'network' })
    }
  }

  // In-app browsers (WhatsApp/Facebook/Instagram/etc.'s built-in webview) are
  // known to break iframe-based popups — they get sent to Paystack's real
  // hosted checkout page instead, and back to /payment-return afterwards.
  function isInAppBrowser(): boolean {
    if (typeof navigator === 'undefined') return false
    return /FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|MicroMessenger/i.test(navigator.userAgent || '')
  }

  async function confirmPayment(reference: string): Promise<boolean> {
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })
      const data = await res.json()
      if (!data.success) {
        setError({ title: 'Payment not confirmed', msg: data.error || 'We could not confirm your payment. If you completed it, wait a moment and try "Verify Payment" again.', type: 'payment' })
        return false
      }
      return true
    } catch {
      setError({ title: 'Connection error', msg: 'Could not verify your payment. Please check your internet and try again.', type: 'network' })
      return false
    }
  }

  // Popup blocked (or PaystackPop itself failed to load) → open the real
  // hosted page in a new tab and let the user come back and click Verify,
  // rather than failing the purchase outright.
  function openHostedFallback(authorizationUrl: string, reference: string) {
    const popup = window.open(authorizationUrl, '_blank', 'width=500,height=700')
    if (!popup) {
      // Even a new tab was blocked — this browser leaves us no choice but to
      // navigate the current tab away, so persist state first, same as the
      // in-app-browser path.
      saveBuildSeed(captureBuildSeed('summary'))
      window.location.assign(authorizationUrl)
      return
    }
    setPaymentPending({ reference })
  }

  async function triggerPaystack(normalizedPhone: string, pkg: typeof PACKAGES[number]) {
    setError(null)
    try {
      const res = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhone, packageId: pkg.id }),
      })
      const data = await res.json()
      if (!data.success) {
        setError({ title: 'Could not start payment', msg: data.error || 'Please try again.', type: 'payment' })
        return
      }

      if (isInAppBrowser()) {
        saveBuildSeed(captureBuildSeed('summary'))
        window.location.assign(data.authorization_url)
        return
      }

      const openPopup = () => {
        const PaystackPop = (window as any).PaystackPop
        if (!PaystackPop) { openHostedFallback(data.authorization_url, data.reference); return }
        try {
          const instance = new PaystackPop()
          instance.resumeTransaction(data.access_code, {
            onSuccess: async () => {
              setIsGenerating(true)
              const ok = await confirmPayment(data.reference)
              if (ok) await doGenerate(normalizedPhone)
              else setIsGenerating(false)
            },
            onCancel: () => setError({ title: 'Payment cancelled', msg: 'Payment was not completed. Your CV has not been generated. Try again whenever you are ready.', type: 'payment' }),
            onError: () => openHostedFallback(data.authorization_url, data.reference),
          })
        } catch {
          openHostedFallback(data.authorization_url, data.reference)
        }
      }

      if ((window as any).PaystackPop) {
        openPopup()
      } else {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v2/inline.js'
        script.onload = openPopup
        script.onerror = () => openHostedFallback(data.authorization_url, data.reference)
        document.body.appendChild(script)
      }
    } catch {
      setError({ title: 'Connection error', msg: 'Could not start payment. Please check your internet and try again.', type: 'network' })
    }
  }

  async function handleManualVerify() {
    if (!paymentPending) return
    setVerifyingPayment(true)
    const ok = await confirmPayment(paymentPending.reference)
    setVerifyingPayment(false)
    if (ok) {
      setPaymentPending(null)
      setIsGenerating(true)
      await doGenerate(phoneNumber)
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0fdf9 0%, #f8fafc 40%, #fefdfb 100%)' }}>
      {/* Choose the document (1), how to share info (2), fill in & generate (3) */}
      <Nav step={screen === 'type' ? 1 : screen === 'method' ? 2 : 3} />

      {/* Back — moves one screen back within the flow, or out to the home
          page from the very first (type) screen so it's never a dead end. */}
      {(backTo || screen === 'type') && (
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '22px 24px 0' }}>
          <button onClick={() => backTo ? go(backTo) : router.push('/')} style={btnBackTop}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
        </div>
      )}

      {/* Credit balance — shown on the info screens once we know it, and only
          when there's something to show (no clutter for no-credit users). */}
      {/* Shown from the method screen onwards — the balance is known as soon as
          Continue is pressed, and seeing "no payment needed" BEFORE putting in
          the work is the reassuring moment. Hidden only on the type screen,
          where we haven't looked it up yet. */}
      {screen !== 'type' && creditBalance && (creditBalance.cv > 0 || creditBalance.cl > 0) && (
        <div style={{ maxWidth: '640px', margin: '22px auto 0', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #f0fdf9, #ecfdf5)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: '12px', padding: '11px 16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: 500 }}>
              You have {creditBalance.cv} CV credit{creditBalance.cv === 1 ? '' : 's'}
              {creditBalance.cl > 0 ? ` and ${creditBalance.cl} cover-letter credit${creditBalance.cl === 1 ? '' : 's'}` : ''} left — no payment needed.
            </span>
          </div>
        </div>
      )}

      {/* ══ SCREEN: CHOOSE DOCUMENT ══════════════════════════════════ */}
      {screen === 'type' && (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: '#0a0f1a', marginBottom: '8px', lineHeight: 1.15 }}>
            What should we <span style={{ color: '#0d9488' }}>create?</span>
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px', fontWeight: 300, lineHeight: 1.7 }}>Choose the document you need — we’ll tailor everything to it.</p>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '28px' }}>
            {([
              { id: 'professional' as CVType, name: 'Professional CV', desc: 'For most job applications, any industry.',
                icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><path d="M2 12h20"/></svg> },
              { id: 'academic' as CVType, name: 'Academic CV', desc: 'For research roles, postgraduate applications and lecturing.',
                icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
              { id: 'cover_letter' as CVType, name: 'Cover Letter', desc: 'A tailored letter that explains why you’re the right candidate for the job.',
                icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
            ] as any[]).map((card: any) => {
              const selected = typeChosen && cvType === card.id
              return (
                <button
                  key={card.id}
                  onClick={() => { setCvType(card.id); setTypeChosen(true) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '15px', width: '100%', textAlign: 'left' as const,
                    background: selected ? '#f6fdfb' : 'white', cursor: 'pointer',
                    border: selected ? '2px solid #0d9488' : '1px solid #e7ebf0',
                    borderRadius: '16px', padding: selected ? '17px 19px' : '18px 20px',
                    fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <span style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? '#0d9488' : '#f1f5f9', color: selected ? '#fff' : '#64748b' }}>{card.icon}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.18rem', fontWeight: 600, color: '#0a0f1a' }}>{card.name}</span>
                    <span style={{ display: 'block', fontSize: '12.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.5, fontWeight: 300 }}>{card.desc}</span>
                  </span>
                  <span style={{ width: '21px', height: '21px', flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? '#0d9488' : 'transparent', border: selected ? 'none' : '1.5px solid #e2e8f0' }}>
                    {selected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Phone — collected up front (credits are linked to it) but kept
              deliberately understated so it never competes with the choice
              above. A single slim field, small label, no card, no blurb. */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>Enter your phone number</label>
            <input
              value={phoneNumber}
              onChange={e => { setPhoneNumber(e.target.value); if (typeErr) setTypeErr('') }}
              onKeyDown={e => { if (e.key === 'Enter') goAfterType() }}
              placeholder="e.g. 0551234567  or  +233551234567"
              style={{ width: '100%', padding: '12px 15px', border: `1px solid ${typeErr ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '12px', background: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: '#0a0f1a', display: 'block' }}
            />
            {typeErr
              ? <div style={{ fontSize: '12.5px', color: '#dc2626', marginTop: '8px', fontWeight: 500 }}>{typeErr}</div>
              : <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', fontWeight: 300 }}>Your account is linked to this phone number.</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={goAfterType}
              disabled={!typeChosen}
              style={{ ...btnPrimary, opacity: !typeChosen ? 0.45 : 1, cursor: !typeChosen ? 'not-allowed' : 'pointer' }}
            >
              Continue →
            </button>
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
              { id: 'paste' as const, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, iconBg: '#e1f5ee', title: 'I already have a CV', desc: 'Upload your existing CV or paste it in — we’ll rebuild it.' },
              { id: 'form' as const,  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>, iconBg: '#e6f1fb', title: 'Start from scratch', desc: 'Our AI will guide you through creating a perfect CV.' },
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

        </div>
      )}

      {/* ══ SCREEN: PASTE PATH ══════════════════════════════════ */}
        <div style={{ display: screen === 'paste' ? 'block' : 'none', maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <StepLabel label="Step 1 of 1" />
          <h1 style={h1Style}>Share Your CV Content</h1>
          {/* Name the document they'll get, so there's no doubt what this input
              is being turned into. */}
          <p style={subStyle}>Upload your CV or paste it in as text — we&apos;ll create your {meta.label}.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {([
              { id: 'upload', label: 'Upload a file', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
              { id: 'paste', label: 'Paste text', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14.5 4.5l5 5M4 20l1.2-4.2L15.3 5.7a1.7 1.7 0 012.4 0l.6.6a1.7 1.7 0 010 2.4L8.2 18.8 4 20z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"/></svg> },
            ] as any[]).map((opt: any) => {
              const on = pasteInputMode === opt.id
              return (
                <button key={opt.id} onClick={() => setPasteInputMode(opt.id as any)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: `1.5px solid ${on ? '#0d9488' : '#e7ebf0'}`, borderRadius: '12px', background: on ? '#f0fdf9' : 'white', color: on ? '#0f766e' : '#64748b', fontWeight: on ? 600 : 500, fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s, background 0.15s' }}>
                  {opt.icon}{opt.label}
                </button>
              )
            })}
          </div>

          {pasteInputMode === 'paste' ? (
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Paste your CV here</div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', fontWeight: 300 }}>Any format is fine — Word, PDF copy, WhatsApp, rough notes.</p>
              <textarea ref={refs.paste} style={TA(180)} rows={8} placeholder="Paste your CV content here — any format is fine..." />
            </div>
          ) : (
            <UploadZone label="Drop your CV here, or click to browse" hint="PDF · Word (.docx) · Text (.txt) · or a photo of your CV" onFile={setUploadedCV} file={uploadedCV} />
          )}

          {/* The prompt for extra detail is worded for the document being made —
              a letter wants strengths and motivation, an academic CV wants
              research and teaching, a CV wants corrections and emphasis. */}
          <Collapsible
            title="Anything to add or clarify?"
            hint={isCoverLetter
              ? 'Add achievements, strengths, or details you want highlighted — e.g. “I led the team that cut waiting times by half”.'
              : cvType === 'academic'
                ? 'Research, teaching or publications to emphasise — e.g. “Highlight my work on climate adaptation”.'
                : 'Corrections or emphasis — e.g. “I was promoted in 2023”.'}
            badge="Optional"
          >
            <textarea ref={refs.clarify} style={TA(70)} rows={3} placeholder={isCoverLetter ? 'What should the letter emphasise? — or leave blank...' : 'Type any special requests — or leave blank...'} />
          </Collapsible>

          {needsJD && <JDSection method={jdInputMode} setMethod={setJdInputMode} pasteRef={refs.jdPaste} uploadedFile={uploadedJD} setUploadedFile={setUploadedJD} cvType={cvType} />}

          {/* No advert? Aim it anyway. Very common here — people apply broadly
              ("anything in banking") without a specific posting to paste. */}
          {needsJD && (
            <Collapsible
              title="No advert? Tell us what you're aiming for"
              hint="We'll angle your CV towards this — even without a job posting."
              badge="Optional"
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="Job you want" placeholder="e.g. Banking Officer" fieldRef={refs.tailorJobPaste} />
                <Field label="Industry" placeholder="e.g. Banking & Finance" fieldRef={refs.tailorIndustryPaste} />
              </div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '9px', lineHeight: 1.6 }}>
                We only shift the emphasis of what you&apos;ve actually done — we never claim experience you don&apos;t have.
              </div>
            </Collapsible>
          )}

          <ErrorDisplay error={error} onRetry={handleGenerate} onDismiss={() => setError(null)} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '24px', gap: '12px', flexWrap: 'wrap' as const }}>
            <button onClick={handleGenerate} disabled={isGenerating || checkingCredits} style={{ ...btnPrimary, opacity: (isGenerating || checkingCredits) ? 0.6 : 1 }}>
              {checkingCredits ? 'Checking…' : isGenerating ? 'Generating…' : `Generate my ${cvType === 'cover_letter' ? 'cover letter' : 'CV'} →`}
            </button>
          </div>
        </div>

      {/* ══ SCREEN: FORM STEP 1 — PERSONAL ══════════════════════ */}
        <div style={{ display: screen === 'form-1' ? 'block' : 'none', maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          {/* Swift greeting with typing animation */}
          <SwiftGreeting label={meta.label} />

          <StepLabel label={`Step ${stepNo('form-1')} of ${meta.totalFormSteps}`} />
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h1 style={h1Style}>Personal Details</h1>
          <p style={subStyle}>Your name and contact details — these appear at the top of your CV.</p>

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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => go(nextAfter('form-1'))} style={btnPrimary}>Next →</button>
          </div>
        </div>

      {/* ══ SCREEN: FORM STEP 2 — EDUCATION ══════════════════════ */}
        <div style={{ display: screen === 'form-2' ? 'block' : 'none', maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          {/* Not on the cover-letter path — no step number would make sense. */}
          {!isCoverLetter && <StepLabel label={`Step 2 of ${meta.totalFormSteps}`} />}
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <h1 style={h1Style}>Education & Certifications</h1>
          <p style={subStyle}>Your schools, courses, and professional training.</p>

          <div style={cardStyle}>
            <ExBox text={cvType === 'academic'
              ? 'PhD Development Economics, University of Ghana, 2020–2024\nMPhil Economics, KNUST, 2017–2019\nBA Economics (First Class), University of Cape Coast, 2013–2017'
              : 'BSc Nursing, University of Cape Coast, 2018–2022\nCertificate in Critical Care Nursing, 2024\nWASSCE, St Thomas Aquinas SHS, 2018'} />
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => go('form-3')} style={btnPrimary}>Next →</button>
          </div>
        </div>

      {/* ══ SCREEN: FORM STEP 3 — EXPERIENCE ══════════════════════ */}
        <div style={{ display: screen === 'form-3' ? 'block' : 'none', maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <StepLabel label={`Step ${stepNo('form-3')} of ${meta.totalFormSteps}`} />
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eeedfe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#534ab7" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><path d="M2 12h20"/></svg>
          </div>
          <h1 style={h1Style}>{isCoverLetter ? 'Your Background' : cvType === 'academic' ? 'Academic & Professional Experience' : 'Work Experience'}</h1>
          <p style={subStyle}>{isCoverLetter
            ? 'Your experience, education and achievements — whatever makes your case. A few lines is enough.'
            : cvType === 'academic'
              ? 'Your lecturing, research and other appointments.'
              : 'Your jobs, internships, national service, and volunteer roles.'}</p>

          <div style={cardStyle}>
            <ExBox text={isCoverLetter
              ? 'Staff Nurse – Korle Bu Teaching Hospital – 2022 to Present\nBSc Nursing, University of Cape Coast, 2018–2022\nCut patient handover errors by 30% on my ward'
              : cvType === 'academic'
                ? 'Lecturer – Dept. of Economics, KNUST – 2022 to Present\nGraduate Teaching Assistant – University of Ghana – 2020–2022\nResearch Assistant – ISSER, Legon – 2019–2020'
                : 'Staff Nurse – Korle Bu Teaching Hospital – 2022 to Present\nSales Assistant – Melcom – 2020–2021\nNational Service – GRA Kumasi – 2019–2020'} />

            {/* Collapsible duties tip — CV-specific, so not shown on the
                cover-letter background step. */}
            {!isCoverLetter && (
              <>
                <button onClick={() => setShowDutiesTip(v => !v)} style={{ ...tipToggleStyle, marginBottom: '10px' }}>
                  <span>Want to add job duties? Click to see how →</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showDutiesTip ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showDutiesTip && (
                  <div style={{ background: '#f0fdf9', borderLeft: '3px solid #0d9488', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: '10px', fontSize: '12px', color: '#0f6e56', lineHeight: 1.7 }}>
                    Adding duties is completely optional — our AI will write them for you. If you&apos;d like to add your own, list them under each role:<br/><br/>
                    <em>Staff Nurse – Korle Bu – 2022 to Present<br/>– Administered medication to 30+ patients daily<br/>– Managed ward records and patient handovers</em>
                  </div>
                )}
              </>
            )}

            <textarea ref={refs.experience} style={TA(110)} rows={5} placeholder={isCoverLetter ? 'Write your background here — roles, education, achievements...' : 'Write your work experience here...'} />

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

          <button onClick={() => go(nextAfter('form-3'))} style={btnSkip}>Skip this section →</button>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => go(nextAfter('form-3'))} style={btnPrimary}>Next →</button>
          </div>
        </div>

      {/* ══ SCREEN: FORM STEP 4 — EXTRAS ══════════════════════ */}
        <div style={{ display: screen === 'form-4' ? 'block' : 'none', maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          {!isCoverLetter && <StepLabel label={`Step 4 of ${meta.totalFormSteps}`} />}
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#faeeda', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#854f0b" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <h1 style={h1Style}>Skills & Extra Details</h1>
          <p style={subStyle}>Add anything you'd like included — the AI handles the rest.</p>

          <div style={cardStyle}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#94a3b8', marginBottom: '7px' }}>Example</div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#64748b', lineHeight: 1.9, fontStyle: 'italic' }}>
              {cvType === 'academic' ? (
                <>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Research Skills:</strong> Stata, R, NVivo, survey design<br/>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Languages:</strong> English, Twi, French<br/>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Membership:</strong> Ghana Economic Association, 2021–present<br/>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Award:</strong> Vice-Chancellor&apos;s Award for Research Excellence, 2023<br/>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Referee:</strong> Prof. Ama Boateng, Dept. of Economics, University of Ghana
                </>
              ) : (
                <>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Technical Skills:</strong> AutoCAD, Python, QuickBooks<br/>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Languages:</strong> Twi, French<br/>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Leadership:</strong> SRC President, UPSA, 2015<br/>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Award:</strong> Best Employee, MTN Ghana, 2023<br/>
                  <strong style={{ color: '#475569', fontStyle: 'normal' }}>Reference:</strong> Mr Kwadwo Asante, Manager, Diamond King Ventures, 0256677189
                </>
              )}
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={goFromForm4} style={btnPrimary}>{meta.hasJobStep ? 'Next →' : 'Review Details →'}</button>
          </div>
        </div>

      {/* ══ SCREEN: FORM STEP 5 — JOB DETAILS ══════════════════════ */}
        <div style={{ display: screen === 'form-5' ? 'block' : 'none', maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          {/* Academic has no job step, so this screen is never reached there and
              a step number would be nonsense ("Step 5 of 4"). */}
          {meta.hasJobStep && <StepLabel label={`Step ${stepNo('form-5')} of ${meta.totalFormSteps}`} />}
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: cvType === 'cover_letter' ? '#fbeaf0' : '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            {cvType === 'cover_letter'
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#993556" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            }
          </div>
          <h1 style={h1Style}>{cvType === 'cover_letter' ? 'The Role You\'re Applying For' : 'The Role You\'re Targeting'}</h1>
          <p style={subStyle}>{cvType === 'cover_letter' ? 'Add the role to produce a compelling, tailored letter.' : 'Add the role to tailor your CV to it — the more detail, the sharper the result.'}</p>

          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <Field label={`Job Title${cvType === 'cover_letter' ? ' *' : ''}`} placeholder="e.g. Staff Nurse" fieldRef={refs.jobTitle} />
              <Field label={`${cvType === 'cover_letter' ? 'Employer / Institution' : 'Company Name'}${cvType === 'cover_letter' ? ' *' : ''}`} placeholder="e.g. Korle Bu Hospital" fieldRef={refs.company} />
            </div>
            {/* Industry sits beside the job title so someone with no specific
                advert can still aim the CV at a field. */}
            {cvType !== 'cover_letter' && (
              <div style={{ marginBottom: '12px' }}>
                <Field label="Industry (optional)" placeholder="e.g. Banking & Finance, Health, NGO / Development" fieldRef={refs.tailorIndustryForm} />
              </div>
            )}
            {/* Formal address block for the letter — optional; sensible
                defaults ("The Human Resource Manager", "Dear Sir/Madam,") are
                used when left blank, so there are never empty placeholders. */}
            {cvType === 'cover_letter' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <Field label="Addressed to (optional)" placeholder="e.g. The Human Resource Manager" fieldRef={refs.addressee} />
                <Field label="Employer address (optional)" placeholder="e.g. P. O. Box GP 667, Accra" fieldRef={refs.companyAddress} />
              </div>
            )}
            {/* Same job-posting component as the paste path, so the guided flow
                can upload a PDF/Word/image posting instead of only pasting. */}
            <div style={{ marginBottom: '12px' }}>
              <JDSection method={jdInputMode} setMethod={setJdInputMode} pasteRef={refs.jdPaste} uploadedFile={uploadedJD} setUploadedFile={setUploadedJD} cvType={cvType} />
            </div>
            {cvType === 'cover_letter' && (
              <div>
                <label style={labelStyle}>Why do you want this role? <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>Optional</span></label>
                <textarea ref={refs.whyRole} style={{ ...TA(70), marginTop: '5px' }} rows={3} placeholder="e.g. I have 3 years experience in telecoms and admire this company's values..." />
              </div>
            )}
          </div>

          <button onClick={() => go('summary')} style={btnSkip}>Skip job details →</button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '12px', flexWrap: 'wrap' as const }}>
            <button onClick={() => go('summary')} style={btnPrimary}>Review Details →</button>
          </div>
        </div>

      {/* ══ SCREEN: SUMMARY ══════════════════════════════════ */}
      {screen === 'summary' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '52px 24px 80px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 style={{ ...h1Style, marginBottom: '6px' }}>{isCoverLetter ? 'Ready To Write Your Letter' : 'Ready To Build Your CV'}</h1>
          <p style={{ ...subStyle, marginBottom: '28px' }}>Review your details before we generate.</p>

          {/* Summary blocks — only show sections with content */}
          {[
            { title: 'Document Type', val: meta.label, editScreen: 'type' as Screen, alwaysShow: true },
            { title: 'Personal Details', val: [refs.fullName.current?.value, refs.phone.current?.value, refs.email.current?.value, refs.location.current?.value].filter(Boolean).join(' · '), editScreen: 'form-1' as Screen },
            { title: 'Education', val: refs.education.current?.value || '', editScreen: 'form-2' as Screen },
            { title: isCoverLetter ? 'Your Background' : 'Work Experience', val: refs.experience.current?.value || '', editScreen: 'form-3' as Screen },
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

          <ErrorDisplay error={error} onRetry={handleGenerate} onDismiss={() => setError(null)} />

          {paymentPending && (
            <div style={{ background: '#fffbf5', border: '1.5px solid #f59e0b', borderRadius: '14px', padding: '16px 18px', marginBottom: '14px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0a0f1a', marginBottom: '4px' }}>Complete payment in the window that opened</div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '12px', lineHeight: 1.6 }}>Once you&apos;ve paid, click below to confirm — your CV will generate right after.</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                <button onClick={handleManualVerify} disabled={verifyingPayment} style={{ ...btnPrimary, opacity: verifyingPayment ? 0.6 : 1 }}>
                  {verifyingPayment ? 'Checking…' : 'Verify Payment'}
                </button>
                <button onClick={() => setPaymentPending(null)} style={btnBackTop}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '12px', flexWrap: 'wrap' as const }}>
            <button onClick={handleGenerate} disabled={isGenerating || checkingCredits || !!paymentPending} style={{ ...btnPrimary, opacity: (isGenerating || checkingCredits || paymentPending) ? 0.6 : 1 }}>
              {checkingCredits ? 'Checking…' : isGenerating ? 'Generating...' : `Generate my ${cvType === 'cover_letter' ? 'cover letter' : 'CV'} →`}
            </button>
          </div>
        </div>
      )}

      {/* ══ PRICING MODAL ══════════════════════════════════ */}
      {showPricing && (
        <div onClick={() => setShowPricing(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,13,24,0.6)', backdropFilter: 'blur(4px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '22px', width: '100%', maxWidth: '440px', padding: '28px 26px', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', fontFamily: "'DM Sans', sans-serif", maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 600, color: '#0a0f1a', lineHeight: 1.15 }}>Choose your package</div>
              <button onClick={() => setShowPricing(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', display: 'flex' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '18px', lineHeight: 1.6 }}>One-time payment · no subscription. Credits never expire.</p>

            <div style={{ display: 'grid', gap: '11px' }}>
              {/* Only the packages that grant the credit this document needs. */}
              {packagesForDoc(cvType === 'cover_letter').map(pkg => (
                <button key={pkg.id} onClick={() => { setShowPricing(false); triggerPaystack(payPhone, pkg) }}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px', width: '100%', textAlign: 'left' as const, cursor: 'pointer',
                    background: pkg.recommended ? '#f6fdfb' : 'white', border: pkg.recommended ? '2px solid #0d9488' : '1px solid #e7ebf0',
                    borderRadius: '16px', padding: pkg.recommended ? '15px 17px' : '16px 18px', fontFamily: "'DM Sans', sans-serif" }}>
                  {pkg.recommended && <span style={{ position: 'absolute', top: '-9px', left: '16px', background: '#0d9488', color: 'white', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.5px', padding: '3px 9px', borderRadius: '20px' }}>BEST VALUE</span>}
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{pkg.emoji}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#0a0f1a' }}>{pkg.name}</span>
                    <span style={{ display: 'block', fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>{pkg.blurb}</span>
                  </span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 700, color: pkg.recommended ? '#0d9488' : '#0a0f1a', whiteSpace: 'nowrap' as const }}>GH₵{pkg.price}</span>
                </button>
              ))}
            </div>

            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '16px', textAlign: 'center' as const, lineHeight: 1.5 }}>Secure payment via Paystack · MTN MoMo, Vodafone Cash & card</p>
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
// Calm greeting with a single subtle fade-in. The old version typed itself out
// character by character, which made the reader wait to read — a gimmick that
// costs a second of dead time on every visit. It also introduced a "Swift"
// persona that no longer exists anywhere else in the flow.
function SwiftGreeting({ label }: { label: string }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    setShown(false)
    const t = setTimeout(() => setShown(true), 30)
    return () => clearTimeout(t)
  }, [label])

  return (
    <div style={{
      background: '#f0fdf9', border: '1px solid rgba(13,148,136,0.15)', borderRadius: '14px',
      padding: '15px 18px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '13px',
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : 'translateY(6px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <div style={{ fontSize: '14px', color: '#0a0f1a', lineHeight: 1.6 }}>
        Let&apos;s build your <strong>{label}</strong>. Fill in the details below — we&apos;ll handle the writing and formatting.
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
// Quiet top-left back link — a navigation affordance, not a competing action.
const btnBackTop: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 4px', background: 'none', border: 'none', fontSize: '13.5px', fontWeight: 600, color: '#0d9488', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }

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

// A quiet, collapsed row that opens on click. Optional inputs live in here so
// each screen reads as one clear task, with extras available rather than shouting.
function Collapsible({ title, hint, badge, defaultOpen = false, children }: { title: string; hint?: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1px solid #e7ebf0', borderRadius: '14px', background: 'white', marginBottom: '14px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const, fontFamily: "'DM Sans', sans-serif" }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#0a0f1a' }}>{title}</span>
          {hint && <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginTop: '2px', fontWeight: 300, lineHeight: 1.5 }}>{hint}</span>}
        </span>
        {badge && <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', flexShrink: 0 }}>{badge}</span>}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && <div style={{ padding: '0 18px 18px' }}>{children}</div>}
    </div>
  )
}

function JDSection({ method, setMethod, pasteRef, uploadedFile, setUploadedFile, cvType }: any) {
  const required = cvType === 'cover_letter'
  // "Job advert / vacancy" is the everyday term here — clearer than the
  // American "job posting".
  return (
    <Collapsible
      title={required ? 'Add the job advert or vacancy' : 'Applying for a specific role?'}
      hint={required
        ? 'We’ll tailor your letter to match what the employer is asking for.'
        : 'Paste or upload the job advert and we’ll tailor your CV to it.'}
      badge={required ? 'Recommended' : 'Optional'}
      defaultOpen={required}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        {([
          { id: 'upload', label: 'Upload a file', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
          { id: 'paste', label: 'Paste text', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14.5 4.5l5 5M4 20l1.2-4.2L15.3 5.7a1.7 1.7 0 012.4 0l.6.6a1.7 1.7 0 010 2.4L8.2 18.8 4 20z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"/></svg> },
        ] as any[]).map((opt: any) => {
          const on = method === opt.id
          return (
            <button key={opt.id} onClick={() => setMethod(opt.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: `1.5px solid ${on ? '#0d9488' : '#e7ebf0'}`, borderRadius: '12px', background: on ? '#f0fdf9' : 'white', color: on ? '#0f766e' : '#64748b', fontWeight: on ? 600 : 500, fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s, background 0.15s' }}>
              {opt.icon}{opt.label}
            </button>
          )
        })}
      </div>
      {method === 'paste'
        ? <textarea ref={pasteRef} style={TA(110)} rows={5} placeholder="Paste the job advert or describe the role here..." />
        : <UploadZone label="Drop the job advert here, or click to browse" hint="PDF · Word · Image (screenshot)" onFile={setUploadedFile} file={uploadedFile} />
      }
    </Collapsible>
  )
}

// A restrained inline notice: white card, thin accent rule, line icon, and
// quiet text actions. Deliberately no emoji or coloured pills — those read as
// toyish next to the rest of the page.
function ErrorDisplay({ error, onRetry, onDismiss }: { error: any; onRetry: () => void; onDismiss: () => void }) {
  if (!error) return null
  // Validation ("fix this") is amber; genuine failures are red.
  const c = error.type === 'server' ? '#b91c1c' : error.type === 'network' ? '#b45309' : error.type === 'payment' ? '#b45309' : '#a16207'
  const icon = error.type === 'network'
    ? <path d="M1 1l22 22M16.7 16.7A6 6 0 007.3 7.3M5 12.5a10 10 0 013-2.2M12 20h.01" strokeLinecap="round" />
    : error.type === 'payment'
      ? <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>
      : <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" strokeLinecap="round" /></>

  return (
    <div style={{ background: 'white', border: '1px solid #e7ebf0', borderLeft: `3px solid ${c}`, borderRadius: '12px', padding: '16px 18px', marginBottom: '16px', animation: 'fadeIn 0.25s ease' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" style={{ flexShrink: 0, marginTop: '1px' }}>{icon}</svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0a0f1a', marginBottom: '3px' }}>{error.title}</div>
          <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.65 }}>{error.msg}</div>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' as const, marginTop: '13px' }}>
            <button onClick={onRetry} style={{ padding: '8px 16px', background: '#0a0f1a', color: 'white', border: 'none', borderRadius: '9px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Try again</button>
            <button onClick={onDismiss} style={{ background: 'none', border: 'none', padding: 0, fontSize: '12.5px', fontWeight: 500, color: '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Dismiss</button>
            <a href="https://wa.me/233559519783?text=Hi,%20I%20need%20help%20with%20SwiftCVPro" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12.5px', fontWeight: 500, color: '#94a3b8', textDecoration: 'none', marginLeft: 'auto' }}>Need help?</a>
          </div>
        </div>
      </div>
    </div>
  )
}

const ACCEPTED_EXTS = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp']
const MAX_UPLOAD_MB = 10

// A filename extension is trivially spoofable — renaming song.mp3 to cv.pdf
// passes any extension check. So we also read the file's first bytes and
// confirm they match the format it claims to be. Everything here is a
// well-known file signature ("magic bytes").
const at = (b: Uint8Array, bytes: number[], offset = 0) => bytes.every((v, i) => b[offset + i] === v)

const SIGNATURES: Record<string, { label: string; check: (b: Uint8Array) => boolean }> = {
  pdf:  { label: 'PDF', check: b => at(b, [0x25, 0x50, 0x44, 0x46]) },                              // %PDF
  png:  { label: 'PNG image', check: b => at(b, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) },
  jpg:  { label: 'JPEG image', check: b => at(b, [0xFF, 0xD8, 0xFF]) },
  jpeg: { label: 'JPEG image', check: b => at(b, [0xFF, 0xD8, 0xFF]) },
  webp: { label: 'WebP image', check: b => at(b, [0x52, 0x49, 0x46, 0x46]) && at(b, [0x57, 0x45, 0x42, 0x50], 8) }, // RIFF….WEBP
  // .docx is a ZIP container; accept the three valid ZIP headers.
  docx: { label: 'Word document', check: b => at(b, [0x50, 0x4B, 0x03, 0x04]) || at(b, [0x50, 0x4B, 0x05, 0x06]) || at(b, [0x50, 0x4B, 0x07, 0x08]) },
  // Legacy .doc is an OLE2 compound file; also allow ZIP in case a .docx was
  // saved with a .doc name, which is common and still readable.
  doc:  { label: 'Word document', check: b => at(b, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]) || at(b, [0x50, 0x4B, 0x03, 0x04]) },
  // Plain text has no signature. Accept a Unicode BOM, otherwise just reject
  // anything containing NUL bytes — the clearest sign it's actually binary.
  txt:  { label: 'text file', check: b =>
            at(b, [0xEF, 0xBB, 0xBF]) || at(b, [0xFF, 0xFE]) || at(b, [0xFE, 0xFF]) || !b.includes(0) },
}

function UploadZone({ label, hint, onFile, file }: { label: string; hint: string; onFile: (f: File | null) => void; file: File | null }) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [fileErr, setFileErr] = useState('')

  if (file) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: '#f0fdf9', border: '1.5px solid #0d9488', borderRadius: '14px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0a0f1a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{file.name}</div>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>Ready — we’ll read this when you generate</div>
      </div>
      <button onClick={() => onFile(null)} style={{ fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Remove</button>
    </div>
  )

  // Catch a wrong or unusable file at the moment it's chosen, rather than
  // letting it fail later during extraction.
  const pick = async (f?: File | null) => {
    if (!f) return
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    if (!ACCEPTED_EXTS.includes(ext)) {
      setFileErr(`“${f.name}” isn’t a supported file type. Upload a PDF, Word document, text file, or a photo.`)
      return
    }
    if (f.size === 0) {
      setFileErr('That file is empty. Please check it and try again.')
      return
    }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setFileErr(`That file is ${(f.size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_UPLOAD_MB}MB.`)
      return
    }
    // Verify the contents actually match the extension (see SIGNATURES).
    const sig = SIGNATURES[ext]
    if (sig) {
      try {
        const head = new Uint8Array(await f.slice(0, 16).arrayBuffer())
        if (!sig.check(head)) {
          setFileErr(`This file isn’t a valid ${sig.label}. It may have been renamed or is damaged — please upload the original.`)
          return
        }
      } catch {
        setFileErr('We couldn’t read that file. Please try another one.')
        return
      }
    }
    setFileErr('')
    onFile(f)
  }

  return (
    <>
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); if (!dragging) setDragging(true) }}
      onDragLeave={e => { e.preventDefault(); setDragging(false) }}
      onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]) }}
      style={{
        border: `2px dashed ${dragging ? '#0d9488' : fileErr ? '#fca5a5' : '#dbe2ea'}`, borderRadius: '16px',
        padding: '38px 24px', textAlign: 'center', cursor: 'pointer',
        background: dragging ? '#f0fdf9' : '#fcfdfe', transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: dragging ? '#0d9488' : '#eef4f8', color: dragging ? '#fff' : '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', transition: 'background 0.15s, color 0.15s' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
      </div>
      <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#0a0f1a', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 300, marginBottom: '16px' }}>{hint}</div>
      <span style={{ display: 'inline-block', padding: '10px 26px', background: '#0d9488', color: 'white', borderRadius: '50px', fontSize: '13px', fontWeight: 600 }}>Browse files</span>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
        onChange={e => { const el = e.target; pick(el.files?.[0]).finally(() => { el.value = '' }) }} />
    </div>
    {fileErr && (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '10px' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" strokeLinecap="round" /></svg>
        <span style={{ fontSize: '12.5px', color: '#dc2626', lineHeight: 1.6, fontWeight: 500 }}>{fileErr}</span>
      </div>
    )}
    </>
  )
}
