'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Landing page for Paystack's hosted checkout redirect — reached only by the
// in-app-browser fallback path (see triggerPaystack in app/build/page.tsx),
// where a real page navigation away from the builder was unavoidable. The
// builder's own state was already saved to sessionStorage before the
// redirect; this page just confirms the payment, then sends the user back
// to /build, whose mount effect restores that seed automatically.
export default function PaymentReturnPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'failed'>('checking')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('reference') || params.get('trxref')
    if (!reference) {
      setStatus('failed')
      setMessage('No payment reference was found.')
      return
    }
    fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          router.replace('/build')
        } else {
          setStatus('failed')
          setMessage(data.error || 'Payment could not be confirmed.')
        }
      })
      .catch(() => {
        setStatus('failed')
        setMessage('Could not reach the server to confirm payment.')
      })
  }, [router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #f0fdf9 0%, #f8fafc 40%, #fefdfb 100%)', padding: '24px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: 'white', borderRadius: '18px', padding: '36px 32px', maxWidth: '380px', width: '100%', textAlign: 'center' as const, boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        {status === 'checking' ? (
          <>
            <div style={{ width: '38px', height: '38px', border: '3px solid rgba(13,148,136,0.2)', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }} />
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '6px' }}>Confirming your payment…</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>This only takes a moment.</div>
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 600, color: '#0a0f1a', marginBottom: '6px' }}>We couldn&apos;t confirm that payment</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>{message} If you completed payment, your details are still saved — just go back and try again.</div>
            <button onClick={() => router.replace('/build')} style={{ padding: '12px 26px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '50px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Back to CV builder</button>
          </>
        )}
      </div>
    </div>
  )
}
