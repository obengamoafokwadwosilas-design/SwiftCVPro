'use client'

import { useState } from 'react'
import { accessCodeProblem } from '@/lib/accessCodeRules'

// Shown once, right after a pack is paid for, when the account has no access
// code yet. Optional on purpose (owner's call): checkout stays fast, and the
// moment they have just paid is when protecting the credits makes most sense.
// Either button carries on with what the payment was for (build or download).
export default function AccessCodePrompt({ continueLabel, onDone }: { continueLabel: string; onDone: (saved: boolean) => void }) {
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!/^\d{4}$/.test(code)) { setError('Enter 4 digits, or tap “Skip for now”.'); return }
    const problem = accessCodeProblem(code)
    if (problem) { setError(problem); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/cv-pin/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Could not save your code. Try again, or skip for now.'); return }
      onDone(true)
    } catch {
      setError('Could not connect. Try again, or skip for now.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,13,24,0.6)', backdropFilter: 'blur(4px)', zIndex: 450, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="code-prompt-title" style={{ background: 'white', borderRadius: '22px', width: '100%', maxWidth: '400px', padding: '28px 24px 22px', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600, color: '#166534', marginBottom: '14px' }}>
          <span aria-hidden="true" style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </span>
          Payment successful
        </div>
        <div id="code-prompt-title" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.55rem', fontWeight: 600, color: '#0a0f1a', lineHeight: 1.15 }}>Protect your privacy</div>
        <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '6px 0 16px' }}>
          Set a 4-digit access code to protect your CVs and credits. With it you can open My CVs on any phone or computer — no email link needed.
        </p>
        <div style={{ position: 'relative' }}>
          <input aria-label="4-digit access code" value={code} inputMode="numeric" autoComplete="off" maxLength={4} type={show ? 'text' : 'password'} autoFocus
            aria-invalid={!!error} aria-describedby={error ? 'code-prompt-error' : undefined}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') void save() }}
            placeholder="••••"
            style={{ width: '100%', boxSizing: 'border-box', padding: '13px 46px 13px 16px', fontSize: '20px', letterSpacing: '8px', textAlign: 'center', border: `1.5px solid ${error ? '#dc2626' : '#cbd5e1'}`, borderRadius: '12px', fontFamily: "'DM Sans', sans-serif" }} />
          <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide code' : 'Show code'}
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{show ? <path d="M17.9 17.9A10 10 0 0112 20C5 20 1 12 1 12a18 18 0 015.1-5.9M9.9 4.2A9 9 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.2 3.2M1 1l22 22"/> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg>
          </button>
        </div>
        {error && <div id="code-prompt-error" role="alert" style={{ fontSize: '13px', color: '#b91c1c', marginTop: '8px' }}>{error}</div>}
        <button type="button" onClick={() => void save()} disabled={saving}
          style={{ width: '100%', marginTop: '16px', padding: '15px', background: '#15803d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15.5px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
          {saving ? 'Saving…' : `Save code & ${continueLabel}`}
        </button>
        <button type="button" onClick={() => onDone(false)} disabled={saving}
          style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: '8px', fontFamily: "'DM Sans', sans-serif" }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}
