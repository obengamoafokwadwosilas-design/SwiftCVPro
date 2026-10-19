'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const font = "'DM Sans', sans-serif"
const serif = "'Cormorant Garamond', serif"

// The credits held by this browser, or by the account the customer is signed in
// to. There is no email box on purpose: the balance is looked up from the
// browser's own signed identity, so typing someone's address reveals nothing
// about them — and nobody has to type anything to see their own.
export default function BalanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ credits: number; coverLetterCredits: number } | null>(null)

  useEffect(() => {
    if (!open) { setResult(null); setError(''); return }
    let cancelled = false
    setLoading(true); setError('')
    fetch('/api/check-credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(res => res.json())
      .then(d => {
        if (cancelled) return
        if (d.error) { setError(d.error); return }
        setResult({ credits: d.credits || 0, coverLetterCredits: d.coverLetterCredits || 0 })
      })
      .catch(() => { if (!cancelled) setError('Could not connect. Please check your internet and try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

  if (!open) return null

  const hasAny = !!result && (result.credits > 0 || result.coverLetterCredits > 0)
  const row = (text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #f0fdf9, #ecfdf5)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: '12px', padding: '13px 16px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0f1a' }}>{text}</div>
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,13,24,0.6)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '28px 26px', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', fontFamily: font }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ fontFamily: serif, fontSize: '1.4rem', fontWeight: 600, color: '#0a0f1a' }}>Your credits</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', marginBottom: '14px' }}>{error}</div>}

        {loading && !result && <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 18px' }}>Checking…</p>}

        {result && (hasAny ? (
          <div style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
            {result.credits > 0 && row(`${result.credits} CV${result.credits === 1 ? '' : 's'} remaining`)}
            {result.coverLetterCredits > 0 && row(`${result.coverLetterCredits} Cover Letter${result.coverLetterCredits === 1 ? '' : 's'} remaining`)}
          </div>
        ) : (
          <div style={{ textAlign: 'center' as const, padding: '10px 0 18px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0a0f1a', marginBottom: '4px' }}>No credits on this device yet</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.6 }}>You can still build a free preview — payment is only needed to unlock the finished CV.</div>
          </div>
        ))}

        <button onClick={() => { onClose(); router.push('/my-cvs') }} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '50px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: font, width: '100%', padding: '11px 20px' }}>
          Bought credits on another device? Sign in
        </button>
      </div>
    </div>
  )
}
