'use client'

import { useEffect, useState } from 'react'

// Separate operator console — gated by ADMIN_SECRET (entered here, sent as the
// x-admin-key header, verified server-side). Not linked from anywhere public.
// Look up a phone number, see its balances / history / payments, and add or set
// credits. Every request goes through /api/admin/* which fails closed.

interface Lookup {
  phoneNumber: string
  credits: number
  coverLetterCredits: number
  historyCount: number
  payments: { package_id: string; amount: number; cv_credits: number; cl_credits: number; created_at: string }[]
}

const wrap: React.CSSProperties = { minHeight: '100vh', background: '#0a0f1a', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '32px 20px' }
const card: React.CSSProperties = { background: '#111826', border: '1px solid #1e293b', borderRadius: '16px', padding: '22px', maxWidth: '620px', margin: '0 auto 18px' }
const label: React.CSSProperties = { fontSize: '12px', color: '#94a3b8', marginBottom: '6px', display: 'block', fontWeight: 500 }
const input: React.CSSProperties = { width: '100%', padding: '12px 14px', background: '#0a0f1a', border: '1px solid #334155', borderRadius: '10px', color: 'white', fontSize: '14px', fontFamily: 'inherit' }
const btn: React.CSSProperties = { padding: '12px 18px', background: '#0d9488', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnGhost: React.CSSProperties = { ...btn, background: 'transparent', border: '1px solid #334155', color: '#cbd5e1' }

export default function AdminPage() {
  const [key, setKey] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [busy, setBusy] = useState(false)

  // Remember the key for this tab only (sessionStorage) so a refresh doesn't
  // force re-entry, but it never persists to disk across sessions.
  useEffect(() => {
    const saved = sessionStorage.getItem('swiftcv_admin_key')
    if (saved) { setKey(saved); verify(saved) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verify(k: string) {
    setBusy(true); setAuthErr('')
    try {
      const res = await fetch('/api/admin/ping', { method: 'POST', headers: { 'x-admin-key': k } })
      if (res.ok) { setUnlocked(true); sessionStorage.setItem('swiftcv_admin_key', k) }
      else { setUnlocked(false); sessionStorage.removeItem('swiftcv_admin_key'); setAuthErr('Wrong key.') }
    } catch { setAuthErr('Connection error.') }
    setBusy(false)
  }

  function lock() {
    sessionStorage.removeItem('swiftcv_admin_key')
    setUnlocked(false); setKey('')
  }

  if (!unlocked) {
    return (
      <div style={wrap}>
        <div style={{ ...card, maxWidth: '400px', marginTop: '12vh' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 600, marginBottom: '4px', color: 'white' }}>Admin console</div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '18px' }}>Enter the admin key to continue.</p>
          <label style={label}>Admin key</label>
          <input type="password" value={key} onChange={e => setKey(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && key) verify(key) }}
            placeholder="ADMIN_SECRET" style={input} autoFocus />
          {authErr && <div style={{ color: '#f87171', fontSize: '12.5px', marginTop: '10px' }}>{authErr}</div>}
          <button onClick={() => verify(key)} disabled={!key || busy} style={{ ...btn, width: '100%', marginTop: '16px', opacity: (!key || busy) ? 0.6 : 1 }}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      </div>
    )
  }

  return <Console adminKey={key} onLock={lock} />
}

function Console({ adminKey, onLock }: { adminKey: string; onLock: () => void }) {
  const [phone, setPhone] = useState('')
  const [data, setData] = useState<Lookup | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [addCv, setAddCv] = useState('')
  const [addCl, setAddCl] = useState('')

  const H = { 'Content-Type': 'application/json', 'x-admin-key': adminKey }

  async function lookup() {
    if (!phone.trim()) return
    setBusy(true); setErr(''); setMsg('')
    try {
      const res = await fetch('/api/admin/lookup', { method: 'POST', headers: H, body: JSON.stringify({ phoneNumber: phone }) })
      const d = await res.json()
      if (!res.ok) { setErr(d.error || 'Lookup failed'); setData(null) }
      else setData(d)
    } catch { setErr('Connection error') }
    setBusy(false)
  }

  async function adjust(mode: 'add' | 'set', payload: Record<string, unknown>) {
    setBusy(true); setErr(''); setMsg('')
    try {
      const res = await fetch('/api/admin/adjust', { method: 'POST', headers: H, body: JSON.stringify({ phoneNumber: phone, mode, ...payload }) })
      const d = await res.json()
      if (!res.ok) { setErr(d.error || 'Update failed') }
      else {
        setMsg('Updated.')
        setData(prev => prev ? { ...prev, credits: d.credits, coverLetterCredits: d.coverLetterCredits } : prev)
        setAddCv(''); setAddCl('')
      }
    } catch { setErr('Connection error') }
    setBusy(false)
  }

  return (
    <div style={wrap}>
      <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 600, color: 'white' }}>Admin console</div>
        <button onClick={onLock} style={{ ...btnGhost, padding: '8px 14px', fontSize: '12.5px' }}>Lock</button>
      </div>

      <div style={card}>
        <label style={label}>Phone number</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') lookup() }}
            placeholder="0244000111 or +233244000111" style={input} />
          <button onClick={lookup} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap' }}>Look up</button>
        </div>
        {err && <div style={{ color: '#f87171', fontSize: '12.5px', marginTop: '10px' }}>{err}</div>}
        {msg && <div style={{ color: '#34d399', fontSize: '12.5px', marginTop: '10px' }}>{msg}</div>}
      </div>

      {data && (
        <>
          <div style={card}>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>{data.phoneNumber}</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Stat label="CV credits" value={data.credits} />
              <Stat label="Cover-letter credits" value={data.coverLetterCredits} />
              <Stat label="CVs generated" value={data.historyCount} />
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'white', marginBottom: '14px' }}>Adjust balances</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={label}>CV credits</label>
                <input value={addCv} onChange={e => setAddCv(e.target.value)} placeholder="e.g. 1" style={input} inputMode="numeric" />
              </div>
              <div>
                <label style={label}>Cover-letter credits</label>
                <input value={addCl} onChange={e => setAddCl(e.target.value)} placeholder="e.g. 1" style={input} inputMode="numeric" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => adjust('add', { addCv: addCv || 0, addCl: addCl || 0 })} disabled={busy || (!addCv && !addCl)} style={{ ...btn, opacity: (busy || (!addCv && !addCl)) ? 0.5 : 1 }}>Add to balance</button>
              <button onClick={() => adjust('set', { setCv: addCv, setCl: addCl })} disabled={busy || (!addCv && !addCl)} style={{ ...btnGhost, opacity: (busy || (!addCv && !addCl)) ? 0.5 : 1 }}>Set exact value</button>
            </div>
            <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '12px', lineHeight: 1.6 }}>
              <strong style={{ color: '#94a3b8' }}>Add</strong> increases the current balance by the number(s) above (negative allowed for corrections).
              <strong style={{ color: '#94a3b8' }}> Set</strong> overwrites to exactly the number(s) above. Blank field = unchanged.
            </p>
          </div>

          <div style={card}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Recent payments</div>
            {data.payments.length === 0
              ? <div style={{ fontSize: '13px', color: '#64748b' }}>No payments recorded.</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.payments.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', padding: '8px 0', borderBottom: i < data.payments.length - 1 ? '1px solid #1e293b' : 'none' }}>
                      <span style={{ color: '#cbd5e1' }}>{p.package_id} · GH₵{(p.amount / 100).toFixed(0)}</span>
                      <span style={{ color: '#64748b' }}>+{p.cv_credits}CV / +{p.cl_credits}CL · {new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ flex: '1 1 120px', background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px 16px' }}>
      <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#5eead4', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '5px' }}>{label}</div>
    </div>
  )
}
