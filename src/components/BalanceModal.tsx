'use client'

import { useState } from 'react'

const font = "'DM Sans', sans-serif"
const serif = "'Cormorant Garamond', serif"

// Standalone way to answer "how many credits do I have left" without having
// to start building something first — previously the only place a balance
// ever showed up was mid-way through the builder, once a phone number had
// already been entered there. No PIN gate here (unlike CVHistoryModal): a
// credit count isn't the sensitive thing a saved CV's personal details are,
// so keeping this to one field keeps it genuinely quick to check.
export default function BalanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ credits: number; coverLetterCredits: number } | null>(null)

  if (!open) return null

  function reset() {
    setPhone(''); setError(''); setResult(null)
  }

  async function checkBalance() {
    if (!phone.trim()) { setError('Enter your phone number.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/check-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not check your balance.'); return }
      setResult({ credits: data.credits || 0, coverLetterCredits: data.coverLetterCredits || 0 })
    } catch {
      setError('Could not connect. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasAny = !!result && (result.credits > 0 || result.coverLetterCredits > 0)

  return (
    <div onClick={() => { onClose(); reset() }} style={{ position: 'fixed', inset: 0, background: 'rgba(8,13,24,0.6)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '28px 26px', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', fontFamily: font }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ fontFamily: serif, fontSize: '1.4rem', fontWeight: 600, color: '#0a0f1a' }}>Check my balance</div>
          <button onClick={() => { onClose(); reset() }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', marginBottom: '14px' }}>{error}</div>}

        {!result ? (
          <>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>Enter the phone number you used to buy credits.</p>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') checkBalance() }}
              placeholder="e.g. 0551234567"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: font, fontSize: '13.5px', color: '#0a0f1a', boxSizing: 'border-box' as const }}
            />
            <button onClick={checkBalance} disabled={loading} style={{ padding: '12px 20px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '50px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: font, width: '100%', marginTop: '14px', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Checking…' : 'Check Balance'}
            </button>
          </>
        ) : (
          <>
            {hasAny ? (
              <div style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
                {result.credits > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #f0fdf9, #ecfdf5)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: '12px', padding: '13px 16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0f1a' }}>{result.credits} CV{result.credits === 1 ? '' : 's'} remaining</div>
                  </div>
                )}
                {result.coverLetterCredits > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #f0fdf9, #ecfdf5)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: '12px', padding: '13px 16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0f1a' }}>{result.coverLetterCredits} Cover Letter{result.coverLetterCredits === 1 ? '' : 's'} remaining</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center' as const, padding: '10px 0 18px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0a0f1a', marginBottom: '4px' }}>No credits on this number yet</div>
                <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.6 }}>You can still generate a preview for free — payment is only needed when you download.</div>
              </div>
            )}
            <button onClick={reset} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '50px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: font, width: '100%', padding: '11px 20px' }}>
              Check another number
            </button>
          </>
        )}
      </div>
    </div>
  )
}
