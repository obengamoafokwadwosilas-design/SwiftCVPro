'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateId, GeneratedCV } from '@/types'
import { saveBuildSeed, BuildSeed, clearPreviousCoverLetter } from '@/lib/buildSeed'
import { accessCodeProblem } from '@/lib/accessCodeRules'

interface HistoryItem {
  id: number; cv_type: string; template_id: TemplateId; accent_color: string | null
  label: string | null; generated_cv: GeneratedCV; raw_input: BuildSeed; created_at: string
  download_paid?: boolean
}
const TYPE_NAMES: Record<string, string> = { professional: 'Professional CV', targeted: 'Targeted CV', academic: 'Academic CV', cover_letter: 'Cover letter' }
// A name people recognise: their own label, else the role the CV is aimed at
// ("Banking Officer CV"), else the kind of document.
function titleOf(item: HistoryItem) {
  if (item.label?.trim()) return item.label.trim()
  const role = item.cv_type !== 'cover_letter' ? item.generated_cv?.jobTitle?.trim() : ''
  return role ? `${role} CV` : TYPE_NAMES[item.cv_type] || 'CV'
}
function whenOf(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`
}
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
type Step = 'email' | 'pin' | 'list' | 'setPin'
const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px' }
const primary = { padding: '12px 18px', background: '#0a8a3f', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }
const link = { background: 'none', border: 'none', color: '#0a8a3f', cursor: 'pointer', padding: '8px 0', fontSize: '13px' }

export default function CVHistoryModal({ open, onClose, initialEmail, autoSetPin, notice }: {
  open: boolean; onClose: () => void; initialEmail?: string; autoSetPin?: boolean; notice?: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(initialEmail || '')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [remember, setRemember] = useState(false)
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  // null until known; false shows the "protect your privacy" prompt on the list.
  const [hasCode, setHasCode] = useState<boolean | null>(null)
  // A browser guest has no sign-in to keep, so "Keep me signed in" is for members only.
  const [guest, setGuest] = useState(true)
  const [credits, setCredits] = useState<{ cv: number; cl: number } | null>(null)
  const [renaming, setRenaming] = useState<number | null>(null)
  useEffect(() => {
    if (step !== 'list') return
    fetch('/api/cv-pin/status', { method: 'POST', cache: 'no-store' }).then(r => r.json()).then(d => setHasCode(!!d?.pin_set)).catch(() => {})
    fetch('/api/check-credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => r.json()).then(d => { if (!d.error) setCredits({ cv: d.credits || 0, cl: d.coverLetterCredits || 0 }) }).catch(() => {})
  }, [step])
  const initialized = useRef(false)
  useEffect(() => { if (notice) setError(notice) }, [notice])

  async function request(path: string, body: unknown) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Please try again.')
    return data
  }
  async function loadHistory(setup = false) {
    const data = await request('/api/cv-history/list', {})
    setEmail(data.email)
    setGuest(!!data.guest)
    setItems(data.history || [])
    setStep(setup ? 'setPin' : 'list')
    setMessage('')
  }
  async function run(action: () => Promise<void>) {
    setLoading(true); setError('')
    try { await action() } catch (err) { setError(err instanceof Error ? err.message : 'Could not connect. Please try again.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    if (!open) { initialized.current = false; return }
    if (initialized.current) return
    initialized.current = true
    setStep('email'); setItems([]); setPin(''); setConfirmPin(''); setRemember(false); setError(''); setMessage('')
    const token = new URLSearchParams(window.location.hash.slice(1)).get('access')
    if (token) {
      // Remove the bearer secret before any navigation or external link is followed.
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      void run(async () => {
        await request('/api/customer-access/consume', { token })
        await loadHistory(!!autoSetPin)
      })
    } else {
      // Runs in the background without run(): on a slow mobile line this check
      // can take seconds, and it used to disable the main button ("Please
      // wait…") and show "Could not connect" if it failed — before the visitor
      // had typed anything. Someone not signed in can start typing at once.
      void fetch('/api/customer-access/session', { cache: 'no-store' })
        .then(res => res.json())
        .then(session => {
          if (session.persistent) {
            setRemember(true)
            return run(() => loadHistory(!!autoSetPin))
          }
          // Someone who built or paid in this browser without signing in (a guest
          // that left a receipt address) owns those CVs by browser: show them
          // rather than a sign-in form. A visitor with nothing yet still sees the form.
          if (session.contactEmail) {
            return fetch('/api/cv-history/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
              .then(r => r.json())
              .then(data => {
                if (!data.success || !(data.history || []).length) return
                setEmail(session.contactEmail)
                setGuest(true)
                setItems(data.history)
                setStep('list')
              })
          }
        })
        .catch(() => {})
    }
    // The link is redeemed once, rather than on every state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => { if (initialEmail) setEmail(initialEmail) }, [initialEmail])

  async function emailLink() {
    await run(async () => {
      const data = await request('/api/customer-access/request', { email })
      setMessage(data.message)
    })
  }
  async function signOut() {
    await run(async () => {
      await fetch('/api/customer-access/session', { method: 'DELETE' })
      sessionStorage.removeItem('swiftcv_cv')
      sessionStorage.removeItem('swiftcv_email')
      sessionStorage.removeItem('swiftcv_history_id')
      clearPreviousCoverLetter()
      setItems([]); setStep('email'); setPin(''); setRemember(false)
      setMessage('Signed out of this device.')
    })
  }
  // The builder only reads its seed / ?again= when it loads, so from the
  // builder itself this has to be a real page load, not a client-side push.
  function goBuild(url: string) {
    onClose()
    if (window.location.pathname === '/build') window.location.assign(url)
    else router.push(url)
  }
  // `then`: what the preview does on arrival — open the PDF/Word choice, or
  // unlock (with a credit already held, else "Choose your credits").
  function openCv(item: HistoryItem, rewrite = false, then?: 'download' | 'unlock') {
    if (rewrite) {
      // A CV goes straight to its job step with everything filled in.
      if (item.cv_type !== 'cover_letter') { goBuild(`/build?again=${item.id}`); return }
      const seed = { ...item.raw_input, email, landingScreen: 'type' as const }
      delete seed.jobDescription; delete seed.whyRole
      if (seed.form) seed.form = { ...seed.form, jobTitle: undefined, company: undefined }
      saveBuildSeed(seed)
      goBuild('/build'); return
    }
    if (then) sessionStorage.setItem('swiftcv_on_open', then)
    sessionStorage.setItem('swiftcv_cv', JSON.stringify(item.generated_cv))
    sessionStorage.setItem('swiftcv_type', item.cv_type)
    sessionStorage.setItem('swiftcv_email', email)
    sessionStorage.setItem('swiftcv_history_id', String(item.id))
    sessionStorage.setItem('swiftcv_template', item.template_id)
    sessionStorage.setItem('swiftcv_accent', item.accent_color || '')
    clearPreviousCoverLetter()
    if (window.location.pathname === '/preview') { window.location.reload(); return }
    onClose()
    router.push('/preview')
  }
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,13,24,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 500 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="history-title" style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '540px', padding: '28px', maxHeight: '88vh', overflowY: 'auto', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="history-title" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', margin: '0 0 12px' }}>{step === 'email' ? 'Sign in' : 'My CVs'}</h2>
          <button onClick={onClose} aria-label="Close My CVs" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', margin: '-6px -6px 6px 0', display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        {message && <p role="status" style={{ color: '#0a5d55', lineHeight: 1.6 }}>{message}</p>}
        {/* Google sign-in is hidden for now, not removed: with the browser as the
            account, signing in is only for reaching CVs on another device, and
            the email link does that everywhere (Google refuses WhatsApp/Instagram
            browsers). The routes and Vercel/Google Cloud settings are untouched —
            to bring it back, re-import GoogleSignInButton and render it here
            above an "or" divider. */}
        {(step === 'email' || step === 'pin') && (
          <>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Enter the email you used to save your CVs.</p>
            <input type="email" aria-label="Email address" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" style={inputStyle} />
            {step === 'pin' && <input type="password" inputMode="numeric" aria-label="4-digit access code" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4-digit access code" style={{ ...inputStyle, marginTop: '12px' }} />}
            {step === 'pin' && <label style={{ display: 'block', margin: '14px 0', fontSize: '13px' }}><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Keep me signed in on this device</label>}
            <button disabled={loading} style={{ ...primary, width: '100%', marginTop: '16px' }} onClick={() => step === 'email' ? void emailLink() : void run(async () => {
              await request('/api/cv-pin/verify', { email, pin, remember })
              await loadHistory()
            })}>{loading ? 'Please wait…' : step === 'email' ? 'Email me a secure access link' : 'Open My CVs'}</button>
            <button disabled={loading} style={link} onClick={() => { setStep(step === 'email' ? 'pin' : 'email'); setError(''); setMessage('') }}>{step === 'email' ? 'Use your access code' : 'Use an email link / Forgot your code'}</button>
          </>
        )}
        {step === 'list' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <span style={{ color: '#64748b', fontSize: '14px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email || 'Saved on this device'}</span>
              <button style={{ ...link, color: '#475569', padding: '4px 0', flexShrink: 0 }} onClick={() => void signOut()}>Sign out</button>
            </div>
            {credits && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 16px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0a0f1a' }}>{credits.cv || credits.cl ? `${plural(credits.cv, 'CV credit')} left` : 'No credits yet'}</div>
                  {credits.cl > 0 && <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '1px' }}>{plural(credits.cl, 'cover letter credit')}</div>}
                </div>
                <a href="/#pricing" style={{ color: '#0a8a3f', fontWeight: 700, fontSize: '14px', textDecoration: 'none', flexShrink: 0 }}>{credits.cv || credits.cl ? 'Buy more' : 'Buy credits'}</a>
              </div>
            )}
            {hasCode !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px' }}>
                <span style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.4 }}>{hasCode ? 'Your CVs are protected with an access code' : 'Protect your CVs with a 4-digit code'}</span>
                <button style={{ ...link, fontWeight: 700, fontSize: '14px', padding: '4px 0', flexShrink: 0 }} onClick={() => { setStep('setPin'); setPin(''); setConfirmPin(''); setError('') }}>{hasCode ? 'Change' : 'Set code'}</button>
              </div>
            )}
            {items.length === 0 && <p style={{ color: '#64748b' }}>No saved CVs yet.</p>}
            {items.map(item => {
              const paid = !!item.download_paid
              return (
                <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px 16px', marginTop: '10px' }}>
                  {renaming === item.id ? (
                    <input aria-label="Name this CV" autoFocus defaultValue={titleOf(item)} maxLength={80} style={{ ...inputStyle, fontWeight: 600, padding: '8px 10px' }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null) }}
                      onBlur={e => {
                        const label = e.target.value.trim()
                        setRenaming(null)
                        if (!label || label === titleOf(item)) return
                        setItems(list => list.map(x => x.id === item.id ? { ...x, label } : x))
                        void run(async () => { await request('/api/cv-history/label', { id: item.id, label }) })
                      }} />
                  ) : (
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0a0f1a', overflowWrap: 'anywhere' }}>{titleOf(item)}</div>
                  )}
                  <div style={{ color: '#64748b', fontSize: '12.5px', margin: '2px 0 12px' }}>
                    {whenOf(item.created_at)}{!paid && <span style={{ marginLeft: '8px', color: '#92400e', background: '#fef3c7', borderRadius: '99px', padding: '1px 8px', fontSize: '11.5px', fontWeight: 600 }}>Preview</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button style={{ ...primary, padding: '10px 18px', fontWeight: 700 }} onClick={() => openCv(item, false, paid ? 'download' : 'unlock')}>{paid ? 'Download' : 'Unlock'}</button>
                    <button style={{ ...link, fontWeight: 600, fontSize: '14px' }} onClick={() => openCv(item, true)}>{item.cv_type === 'cover_letter' ? 'Write another' : 'Tailor for a job'}</button>
                    <button aria-label={`Rename ${titleOf(item)}`} title="Rename" onClick={() => setRenaming(item.id)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', display: 'flex', borderRadius: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
                    </button>
                  </div>
                </div>
              )
            })}
            {!guest && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginTop: '16px' }}>
                <input type="checkbox" checked={remember} disabled={loading} onChange={e => {
                  const choice = e.target.checked
                  void run(async () => { await request('/api/customer-access/session', { remember: choice }); setRemember(choice) })
                }} /> Keep me signed in on this device
              </label>
            )}
          </>
        )}
        {step === 'setPin' && (
          <>
            <p style={{ lineHeight: 1.6 }}><strong>Protect your privacy.</strong> Set a 4-digit access code to protect your CVs and credits. Next time, open My CVs with your email and this code. Your email link always works if you forget it.</p>
            <input type="password" inputMode="numeric" aria-label="New access code" placeholder="New 4-digit code" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={inputStyle} />
            <input type="password" inputMode="numeric" aria-label="Confirm access code" placeholder="Type it again" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={{ ...inputStyle, marginTop: '12px' }} />
            <button style={{ ...primary, width: '100%', marginTop: '16px' }} disabled={loading} onClick={() => void run(async () => {
              const problem = accessCodeProblem(pin)
              if (problem) throw new Error(problem)
              if (pin !== confirmPin) throw new Error('The two codes do not match.')
              await request('/api/cv-pin/set', { code: pin })
              setStep('list'); setMessage('Access code saved.')
            })}>{loading ? 'Saving…' : 'Save code'}</button>
            <button style={link} onClick={() => { setStep('list'); setError('') }}>Back to My CVs</button>
            <button style={{ ...link, display: 'block' }} onClick={() => void emailLink()}>Forgot your code? Email me a link to set a new one</button>
          </>
        )}
      </div>
    </div>
  )
}
