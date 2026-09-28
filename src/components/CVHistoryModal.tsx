'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateId, GeneratedCV } from '@/types'
import { saveBuildSeed, BuildSeed, clearPreviousCoverLetter } from '@/lib/buildSeed'

interface HistoryItem {
  id: number; cv_type: string; template_id: TemplateId; accent_color: string | null
  label: string | null; generated_cv: GeneratedCV; raw_input: BuildSeed; created_at: string
}
type Step = 'email' | 'pin' | 'list' | 'setPin'
const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px' }
const primary = { padding: '12px 18px', background: '#0a8a3f', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }
const link = { background: 'none', border: 'none', color: '#0a8a3f', cursor: 'pointer', padding: '8px 0', fontSize: '13px' }

export default function CVHistoryModal({ open, onClose, initialEmail, autoSetPin }: {
  open: boolean; onClose: () => void; initialEmail?: string; autoSetPin?: boolean
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
  const initialized = useRef(false)

  async function request(path: string, body: unknown) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Please try again.')
    return data
  }
  async function loadHistory(setup = false) {
    const data = await request('/api/cv-history/list', {})
    setEmail(data.email)
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
      void run(async () => {
        const res = await fetch('/api/customer-access/session', { cache: 'no-store' })
        const session = await res.json()
        if (session.persistent) { setRemember(true); await loadHistory(!!autoSetPin) }
      })
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
  function openCv(item: HistoryItem, rewrite = false) {
    if (rewrite) {
      const seed = { ...item.raw_input, email, landingScreen: 'type' as const }
      delete seed.jobDescription; delete seed.whyRole
      if (seed.form) seed.form = { ...seed.form, jobTitle: undefined, company: undefined }
      saveBuildSeed(seed)
      onClose(); router.push('/build'); return
    }
    sessionStorage.setItem('swiftcv_cv', JSON.stringify(item.generated_cv))
    sessionStorage.setItem('swiftcv_type', item.cv_type)
    sessionStorage.setItem('swiftcv_email', email)
    sessionStorage.setItem('swiftcv_history_id', String(item.id))
    sessionStorage.setItem('swiftcv_template', item.template_id)
    sessionStorage.setItem('swiftcv_accent', item.accent_color || '')
    clearPreviousCoverLetter()
    router.push('/preview')
  }
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,13,24,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 500 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="history-title" style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '540px', padding: '28px', maxHeight: '88vh', overflowY: 'auto', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="history-title" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', margin: '0 0 12px' }}>My CVs</h2>
          <button onClick={onClose} aria-label="Close My CVs" style={link}>Close</button>
        </div>
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        {message && <p role="status" style={{ color: '#0a5d55', lineHeight: 1.6 }}>{message}</p>}
        {(step === 'email' || step === 'pin') && (
          <>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Enter the email you used to save your CVs.</p>
            <input type="email" aria-label="Email address" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" style={inputStyle} />
            {step === 'pin' && <input type="password" inputMode="numeric" aria-label="4-digit PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4-digit PIN" style={{ ...inputStyle, marginTop: '12px' }} />}
            {step === 'pin' && <label style={{ display: 'block', margin: '14px 0', fontSize: '13px' }}><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Keep me signed in on this device</label>}
            <button disabled={loading} style={{ ...primary, width: '100%', marginTop: '16px' }} onClick={() => step === 'email' ? void emailLink() : void run(async () => {
              await request('/api/cv-pin/verify', { email, pin, remember })
              await loadHistory()
            })}>{loading ? 'Please wait…' : step === 'email' ? 'Email me a secure access link' : 'Open My CVs'}</button>
            <button disabled={loading} style={link} onClick={() => { setStep(step === 'email' ? 'pin' : 'email'); setError(''); setMessage('') }}>{step === 'email' ? 'Use a PIN instead' : 'Use an email link / Forgot PIN'}</button>
          </>
        )}
        {step === 'list' && (
          <>
            <p style={{ color: '#64748b', overflowWrap: 'anywhere' }}>{email}</p>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '10px' }}>
              <input type="checkbox" checked={remember} disabled={loading} onChange={e => {
                const choice = e.target.checked
                void run(async () => { await request('/api/customer-access/session', { remember: choice }); setRemember(choice) })
              }} /> Keep me signed in on this device
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button style={link} onClick={() => { setStep('setPin'); setPin(''); setConfirmPin(''); setError('') }}>Set or change a PIN</button>
              <button style={link} onClick={() => void signOut()}>Sign out</button>
            </div>
            {items.length === 0 && <p>No saved CVs yet.</p>}
            {items.map(item => (
              <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
                <input aria-label="CV label" defaultValue={item.label || item.cv_type.replace('_', ' ')} style={{ ...inputStyle, fontWeight: 600 }} onBlur={e => {
                  const label = e.target.value
                  if (label !== item.label) void run(async () => { await request('/api/cv-history/label', { id: item.id, label }) })
                }} />
                <p style={{ color: '#64748b', fontSize: '12px' }}>{new Date(item.created_at).toLocaleDateString('en-GB')}</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button style={primary} onClick={() => openCv(item)}>Preview / Download</button>
                  <button style={link} onClick={() => openCv(item, true)}>Tailor for another job</button>
                </div>
              </div>
            ))}
          </>
        )}
        {step === 'setPin' && (
          <>
            <p>Set a PIN for faster access next time. Your email link will always work if you forget it.</p>
            <input type="password" inputMode="numeric" aria-label="New PIN" placeholder="New 4-digit PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={inputStyle} />
            <input type="password" inputMode="numeric" aria-label="Confirm PIN" placeholder="Confirm PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={{ ...inputStyle, marginTop: '12px' }} />
            <button style={{ ...primary, width: '100%', marginTop: '16px' }} disabled={loading} onClick={() => void run(async () => {
              if (pin !== confirmPin) throw new Error('PINs do not match.')
              await request('/api/cv-pin/set', { pin })
              setStep('list'); setMessage('PIN saved.')
            })}>{loading ? 'Saving…' : 'Save PIN'}</button>
            <button style={link} onClick={() => { setStep('list'); setError('') }}>Back to My CVs</button>
            <button style={{ ...link, display: 'block' }} onClick={() => void emailLink()}>Email me a fresh link to set my PIN</button>
          </>
        )}
      </div>
    </div>
  )
}
