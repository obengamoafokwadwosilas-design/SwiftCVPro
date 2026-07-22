'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateId, GeneratedCV } from '@/types'
import { saveBuildSeed, BuildSeed } from '@/lib/buildSeed'

interface HistoryItem {
  id: number
  cv_type: string
  template_id: TemplateId
  accent_color: string | null
  label: string | null
  generated_cv: GeneratedCV
  raw_input: BuildSeed
  created_at: string
}

type Step = 'phone' | 'pin' | 'list' | 'setPin' | 'forgotPin'

const font = "'DM Sans', sans-serif"
const serif = "'Cormorant Garamond', serif"

export default function CVHistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [pinAlreadySet, setPinAlreadySet] = useState(false)
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [labelDraft, setLabelDraft] = useState('')

  // Set/change PIN fields
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [oldPin, setOldPin] = useState('')
  const [pinEmail, setPinEmail] = useState('')

  // Forgot-PIN fields
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [resetNewPin, setResetNewPin] = useState('')

  if (!open) return null

  function reset() {
    setStep('phone'); setPhone(''); setPin(''); setItems([]); setError('')
    setEditingId(null); setLabelDraft(''); setNewPin(''); setConfirmPin(''); setOldPin(''); setPinEmail('')
    setOtpSent(false); setOtp(''); setResetNewPin('')
  }

  async function loadHistory(withPin?: string) {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/cv-history/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, pin: withPin }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.error || 'Could not load your CVs.'); return }
      setItems(data.history || [])
      setStep('list')
    } catch {
      setError('Could not connect. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhoneSubmit() {
    if (!phone.trim()) { setError('Enter your phone number.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/cv-pin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      })
      const data = await res.json()
      setPinAlreadySet(!!data.pin_set)
      if (data.pin_set) { setStep('pin'); setLoading(false) }
      else await loadHistory()
    } catch {
      setError('Could not connect. Please check your internet and try again.')
      setLoading(false)
    }
  }

  async function handlePinSubmit() {
    if (!/^\d{4}$/.test(pin)) { setError('Enter your 4-digit code.'); return }
    await loadHistory(pin)
  }

  async function handleOpen(item: HistoryItem, mode: 'preview' | 'duplicate') {
    if (mode === 'preview') {
      sessionStorage.setItem('swiftcv_cv', JSON.stringify(item.generated_cv))
      sessionStorage.setItem('swiftcv_type', item.cv_type)
      sessionStorage.setItem('swiftcv_phone', phone)
      sessionStorage.setItem('swiftcv_history_id', String(item.id))
      onClose()
      router.push('/preview')
      return
    }
    // Duplicate: seed the builder from the ORIGINAL input, not the generated
    // output, so the user reviews/adjusts and a fresh generation is written
    // (spending one credit) rather than editing the old result in place.
    saveBuildSeed({ ...item.raw_input, landingScreen: 'type' })
    onClose()
    router.push('/build')
  }

  async function saveLabel(id: number) {
    try {
      await fetch('/api/cv-history/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, pin: pinAlreadySet ? pin : undefined, id, label: labelDraft }),
      })
      setItems(items.map(it => it.id === id ? { ...it, label: labelDraft.trim() || null } : it))
    } catch { /* non-fatal — the label just won't have saved this time */ }
    setEditingId(null)
  }

  async function handleSetPin() {
    setError('')
    if (!/^\d{4}$/.test(newPin)) { setError('New PIN must be 4 digits.'); return }
    if (newPin !== confirmPin) { setError('PINs do not match.'); return }
    if (pinAlreadySet && !/^\d{4}$/.test(oldPin)) { setError('Enter your current PIN.'); return }
    if (!pinEmail.trim() || !pinEmail.includes('@')) { setError('A valid email is required, so your PIN can be recovered if forgotten.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/cv-pin/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, pin: newPin, oldPin: pinAlreadySet ? oldPin : undefined, email: pinEmail }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setError(data.error || 'Could not save PIN.'); return }
      setPin(newPin); setPinAlreadySet(true)
      await loadHistory(newPin)
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestReset() {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/cv-pin/reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setError(data.error || 'Could not send reset code.'); return }
      setOtpSent(true)
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmReset() {
    setError('')
    if (!/^\d{6}$/.test(otp)) { setError('Enter the 6-digit code from your email.'); return }
    if (!/^\d{4}$/.test(resetNewPin)) { setError('New PIN must be 4 digits.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/cv-pin/reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp, newPin: resetNewPin }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setError(data.error || 'Could not reset PIN.'); return }
      setPin(resetNewPin)
      await loadHistory(resetNewPin)
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={() => { onClose(); reset() }} style={{ position: 'fixed', inset: 0, background: 'rgba(8,13,24,0.6)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: step === 'list' ? '560px' : '420px', maxHeight: '88vh', overflowY: 'auto', padding: '28px 26px', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', fontFamily: font }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ fontFamily: serif, fontSize: '1.4rem', fontWeight: 600, color: '#0a0f1a' }}>My CVs</div>
          <button onClick={() => { onClose(); reset() }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', marginBottom: '14px' }}>{error}</div>}

        {step === 'phone' && (
          <>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>Enter the phone number you used to generate your CVs.</p>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0551234567" style={inputStyle} />
            <button onClick={handlePhoneSubmit} disabled={loading} style={{ ...btnPrimary, width: '100%', marginTop: '14px', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Checking…' : 'View My CVs'}
            </button>
          </>
        )}

        {step === 'pin' && (
          <>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>This number is protected by a 4-digit code.</p>
            <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" inputMode="numeric" style={{ ...inputStyle, textAlign: 'center' as const, letterSpacing: '8px', fontSize: '20px' }} />
            <button onClick={handlePinSubmit} disabled={loading} style={{ ...btnPrimary, width: '100%', marginTop: '14px', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Checking…' : 'Unlock'}
            </button>
            <button onClick={() => { setStep('forgotPin'); setError('') }} style={{ ...linkBtn, marginTop: '10px', width: '100%', textAlign: 'center' as const }}>Forgot your code?</button>
          </>
        )}

        {step === 'forgotPin' && (
          <>
            {!otpSent ? (
              <>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>We&apos;ll email a reset code to the address on file for this number.</p>
                <button onClick={handleRequestReset} disabled={loading} style={{ ...btnPrimary, width: '100%', opacity: loading ? 0.6 : 1 }}>{loading ? 'Sending…' : 'Send reset code'}</button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', lineHeight: 1.6 }}>Enter the 6-digit code we emailed you, and choose a new PIN.</p>
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" style={{ ...inputStyle, marginBottom: '10px' }} />
                <input value={resetNewPin} onChange={e => setResetNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="New 4-digit PIN" inputMode="numeric" style={inputStyle} />
                <button onClick={handleConfirmReset} disabled={loading} style={{ ...btnPrimary, width: '100%', marginTop: '14px', opacity: loading ? 0.6 : 1 }}>{loading ? 'Saving…' : 'Set new PIN'}</button>
              </>
            )}
            <button onClick={() => { setStep('pin'); setError(''); setOtpSent(false) }} style={{ ...linkBtn, marginTop: '10px', width: '100%', textAlign: 'center' as const }}>Back</button>
          </>
        )}

        {step === 'setPin' && (
          <>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', lineHeight: 1.6 }}>
              {pinAlreadySet ? 'Change your PIN.' : 'Add a 4-digit code so only you can view this history.'}
              {' '}There is no way to recover a PIN without a recovery email — keep it somewhere safe.
            </p>
            {pinAlreadySet && <input value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Current PIN" inputMode="numeric" style={{ ...inputStyle, marginBottom: '10px' }} />}
            <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="New 4-digit PIN" inputMode="numeric" style={{ ...inputStyle, marginBottom: '10px' }} />
            <input value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Confirm new PIN" inputMode="numeric" style={{ ...inputStyle, marginBottom: '10px' }} />
            <input value={pinEmail} onChange={e => setPinEmail(e.target.value)} placeholder="Recovery email" type="email" style={inputStyle} />
            <button onClick={handleSetPin} disabled={loading} style={{ ...btnPrimary, width: '100%', marginTop: '14px', opacity: loading ? 0.6 : 1 }}>{loading ? 'Saving…' : 'Save PIN'}</button>
            <button onClick={() => { setStep('list'); setError('') }} style={{ ...linkBtn, marginTop: '10px', width: '100%', textAlign: 'center' as const }}>Cancel</button>
          </>
        )}

        {step === 'list' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button onClick={() => { setStep('setPin'); setError('') }} style={linkBtn}>{pinAlreadySet ? 'Change PIN' : 'Protect with a PIN'}</button>
            </div>
            {items.length === 0 ? (
              <p style={{ fontSize: '13.5px', color: '#64748b', textAlign: 'center' as const, padding: '30px 0' }}>No CVs generated yet with this number.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {items.map(item => (
                  <div key={item.id} style={{ border: '1px solid #e7ebf0', borderRadius: '14px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingId === item.id ? (
                          <input
                            value={labelDraft}
                            onChange={e => setLabelDraft(e.target.value)}
                            onBlur={() => saveLabel(item.id)}
                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                            autoFocus
                            placeholder="e.g. Marketing Manager @ MTN"
                            style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px' }}
                          />
                        ) : (
                          <button onClick={() => { setEditingId(item.id); setLabelDraft(item.label || '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const, padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a0f1a' }}>{item.label || CV_TYPE_LABEL[item.cv_type] || 'CV'}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M14.5 4.5l5 5M4 20l1.2-4.2L15.3 5.7a1.7 1.7 0 012.4 0l.6.6a1.7 1.7 0 010 2.4L8.2 18.8 4 20z"/></svg>
                          </button>
                        )}
                        <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                          {CV_TYPE_LABEL[item.cv_type] || item.cv_type} · {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                      <button onClick={() => handleOpen(item, 'preview')} style={smallBtnPrimary}>Preview / Download</button>
                      <button onClick={() => handleOpen(item, 'duplicate')} style={smallBtnSecondary}>Duplicate</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const CV_TYPE_LABEL: Record<string, string> = {
  professional: 'Professional CV',
  targeted: 'Targeted CV',
  academic: 'Academic CV',
  cover_letter: 'Cover Letter',
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: font, fontSize: '13.5px', color: '#0a0f1a', boxSizing: 'border-box' as const }
const btnPrimary: React.CSSProperties = { padding: '12px 20px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '50px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: font }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#0d9488', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: font }
const smallBtnPrimary: React.CSSProperties = { padding: '8px 14px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '50px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: font }
const smallBtnSecondary: React.CSSProperties = { padding: '8px 14px', background: 'white', color: '#0a0f1a', border: '1px solid #e2e8f0', borderRadius: '50px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: font }
