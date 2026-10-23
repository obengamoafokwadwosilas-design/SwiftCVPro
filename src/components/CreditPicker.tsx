'use client'

import { useState } from 'react'
import type { Package } from '@/lib/packages'

// Paystack Ghana takes all of these; listing them answers "can I pay with my
// MoMo?" before anyone has to ask.
const PAY_WITH = ['MTN MoMo', 'Telecel', 'AirtelTigo', 'Visa', 'Mastercard']

// The package list in both pricing modals (build page and preview unlock).
// Pick one, then pay — the button states the amount, so nobody reaches
// Paystack surprised by the total. The badged package starts selected (or the
// one picked on the landing page, `initialId`). No access code here on
// purpose: pack buyers are offered one right after paying (AccessCodePrompt).
export default function CreditPicker({ packages, onContinue, initialId }: {
  packages: Package[]; onContinue: (pkg: Package) => void; initialId?: string
}) {
  const [pickedId, setPickedId] = useState(() => (packages.find(p => p.id === initialId) ?? packages.find(p => p.badge) ?? packages[0])?.id)
  const picked = packages.find(p => p.id === pickedId) ?? packages[0]
  if (!picked) return null

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

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#64748b', marginRight: '2px' }}>PAY WITH</span>
        {PAY_WITH.map(m => (
          <span key={m} style={{ fontSize: '12px', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '99px', padding: '3px 10px', whiteSpace: 'nowrap' }}>{m}</span>
        ))}
      </div>

      <button type="button" onClick={() => onContinue(picked)}
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
