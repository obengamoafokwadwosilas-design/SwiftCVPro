'use client'

import { useState } from 'react'
import type { Package } from '@/lib/packages'
import { accessCodeProblem } from '@/lib/accessCodeRules'

// Paystack Ghana takes all of these; listing them answers "can I pay with my
// MoMo?" before anyone has to ask.
const PAY_WITH = ['MTN MoMo', 'Telecel', 'AirtelTigo', 'Visa', 'Mastercard']

// The package list in both pricing modals (build page and preview unlock).
// Pick one, then pay — the button states the amount, so nobody reaches
// Paystack surprised by the total. The badged package starts selected (or the
// one picked on the landing page, `initialId`).
//
// A pack (more than one CV credit) needs a 4-digit access code before payment,
// unless this browser's account already has one (`hasCode`): its credits sit
// unused for weeks, and the code is what protects them and the CVs. A single
// CV is spent at once, so it stays a straight path to payment.
export default function CreditPicker({ packages, onContinue, hasCode, initialId }: {
  packages: Package[]; onContinue: (pkg: Package, accessCode?: string) => void; hasCode: boolean; initialId?: string
}) {
  const [pickedId, setPickedId] = useState(() => (packages.find(p => p.id === initialId) ?? packages.find(p => p.badge) ?? packages[0])?.id)
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [codeError, setCodeError] = useState('')
  const picked = packages.find(p => p.id === pickedId) ?? packages[0]
  if (!picked) return null
  const needsCode = picked.cv > 1 && !hasCode

  function cont() {
    if (needsCode) {
      if (!/^\d{4}$/.test(code)) { setCodeError('Choose a 4-digit code to protect your credits.'); return }
      const problem = accessCodeProblem(code)
      if (problem) { setCodeError(problem); return }
    }
    onContinue(picked, needsCode ? code : undefined)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div role="radiogroup" aria-label="Credits" style={{ display: 'grid', gap: '10px' }}>
        {packages.map(pkg => {
          const on = pkg.id === picked.id
          return (
            <button key={pkg.id} type="button" role="radio" aria-checked={on} onClick={() => setPickedId(pkg.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left', cursor: 'pointer',
                background: on ? '#f0fdf4' : '#fff', border: on ? '2px solid #15803d' : '1px solid #e5e7eb',
                borderRadius: '14px', padding: on ? '13px 15px' : '14px 16px', fontFamily: "'DM Sans', sans-serif" }}>
              <span aria-hidden="true" style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? '#15803d' : 'transparent', border: on ? 'none' : '1.5px solid #94a3b8' }}>
                {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#0a0f1a' }}>{pkg.name}</span>
                <span style={{ display: 'block', fontSize: '13px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>{pkg.blurb}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                {pkg.badge && <span style={{ fontSize: '11px', fontWeight: 700, color: '#854d0e', background: '#fef3c7', borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap' }}>{pkg.badge}</span>}
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.45rem', fontWeight: 700, color: '#0a0f1a', whiteSpace: 'nowrap', lineHeight: 1 }}>GH₵{pkg.price}</span>
              </span>
            </button>
          )
        })}
      </div>

      {needsCode && (
        <div style={{ marginTop: '12px', background: '#f8fafc', border: `1px solid ${codeError ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 170px', minWidth: 0 }}>
            <label htmlFor="pack-access-code" style={{ display: 'block', fontSize: '14.5px', fontWeight: 700, color: '#0a0f1a' }}>Protect your CV credits</label>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px', lineHeight: 1.45 }}>Choose a 4-digit code. Already have a code? Enter it.</div>
          </div>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <input id="pack-access-code" value={code} inputMode="numeric" autoComplete="off" maxLength={4} type={showCode ? 'text' : 'password'}
              aria-invalid={!!codeError} aria-describedby={codeError ? 'pack-access-code-error' : undefined}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setCodeError('') }}
              placeholder="••••"
              style={{ width: '128px', padding: '11px 40px 11px 14px', fontSize: '18px', letterSpacing: '6px', border: `1.5px solid ${codeError ? '#dc2626' : '#cbd5e1'}`, borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowCode(v => !v)} aria-label={showCode ? 'Hide code' : 'Show code'}
              style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', display: 'flex' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{showCode ? <><path d="M17.9 17.9A10 10 0 0112 20C5 20 1 12 1 12a18 18 0 015.1-5.9M9.9 4.2A9 9 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.2 3.2M1 1l22 22"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg>
            </button>
          </div>
          {codeError && <div id="pack-access-code-error" role="alert" style={{ flexBasis: '100%', fontSize: '13px', color: '#b91c1c' }}>{codeError}</div>}
        </div>
      )}
      {picked.cv > 1 && hasCode && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#166534' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
          Your credits are protected by your access code.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#64748b', marginRight: '2px' }}>PAY WITH</span>
        {PAY_WITH.map(m => (
          <span key={m} style={{ fontSize: '12px', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '99px', padding: '3px 10px', whiteSpace: 'nowrap' }}>{m}</span>
        ))}
      </div>

      <button type="button" onClick={cont}
        style={{ width: '100%', marginTop: '16px', padding: '15px', background: '#15803d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15.5px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        Continue to payment · GH₵{picked.price}
      </button>
      <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#64748b', margin: '10px 0 0' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
        Secure payment via Paystack
      </p>
    </div>
  )
}
