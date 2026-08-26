'use client'

import { useCallback, useEffect, useState } from 'react'

// Separate operator console — gated by ADMIN_SECRET (entered here, sent as the
// x-admin-key header, verified server-side). Not linked from anywhere public.
// Dashboard overview + tabs for payments, customers, generations and PIN
// resets, plus give/reset credit controls. Every request goes through
// /api/admin/* which fails closed.

interface Customer { phone_number: string; email: string | null; credits: number; cover_letter_credits: number; total_purchased: number; created_at: string }
interface Payment { phone_number: string; amount: number; package_id: string; paystack_reference: string; created_at: string }
interface Generation { phone_number: string; cv_type: string; template_id: string; label: string | null; created_at: string }
interface PinReset { phone_number: string; used: boolean; expires_at: string; created_at: string }
interface Dashboard {
  stats: { revenue: number; payments: number; customers: number; cvsGenerated: number }
  recentPayments: Payment[]
  customers: Customer[]
  generations: Generation[]
  pinResets: PinReset[]
}

const ACCENT = '#0d9488'
const wrap: React.CSSProperties = { minHeight: '100vh', background: '#f6f8fb', color: '#0f172a', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '28px 22px 60px' }
const container: React.CSSProperties = { maxWidth: '1120px', margin: '0 auto' }
const card: React.CSSProperties = { background: 'white', border: '1px solid #e6eaf0', borderRadius: '16px', padding: '22px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
const input: React.CSSProperties = { width: '100%', padding: '11px 13px', background: 'white', border: '1px solid #d5dce6', borderRadius: '10px', color: '#0f172a', fontSize: '13.5px', fontFamily: 'inherit' }
const label: React.CSSProperties = { fontSize: '11.5px', color: '#64748b', marginBottom: '6px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }
const btn: React.CSSProperties = { padding: '11px 16px', background: ACCENT, border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnGhost: React.CSSProperties = { ...btn, background: 'white', border: '1px solid #d5dce6', color: '#334155' }
const btnDanger: React.CSSProperties = { ...btn, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }
const th: React.CSSProperties = { textAlign: 'left', fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 12px 12px' }
const td: React.CSSProperties = { fontSize: '13px', color: '#334155', padding: '12px', borderTop: '1px solid #eef2f7' }

export default function AdminPage() {
  const [key, setKey] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [busy, setBusy] = useState(false)

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

  function lock() { sessionStorage.removeItem('swiftcv_admin_key'); setUnlocked(false); setKey('') }

  if (!unlocked) {
    return (
      <div style={wrap}>
        <div style={{ ...card, maxWidth: '380px', margin: '14vh auto 0' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', fontWeight: 600, marginBottom: '4px' }}>Remarkable CV Admin</div>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>Enter the admin key to continue.</p>
          <label style={label}>Admin key</label>
          <input type="password" value={key} onChange={e => setKey(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && key) verify(key) }}
            placeholder="ADMIN_SECRET" style={input} autoFocus />
          {authErr && <div style={{ color: '#dc2626', fontSize: '12.5px', marginTop: '10px' }}>{authErr}</div>}
          <button onClick={() => verify(key)} disabled={!key || busy} style={{ ...btn, width: '100%', marginTop: '16px', opacity: (!key || busy) ? 0.6 : 1 }}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      </div>
    )
  }

  return <Dashboard adminKey={key} onLock={lock} />
}

type Tab = 'overview' | 'payments' | 'customers' | 'generations' | 'pinResets'

function Dashboard({ adminKey, onLock }: { adminKey: string; onLock: () => void }) {
  const [data, setData] = useState<Dashboard | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')

  const H = { 'Content-Type': 'application/json', 'x-admin-key': adminKey }

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/admin/dashboard', { method: 'POST', headers: H })
      const d = await res.json()
      if (!res.ok) setErr(d.error || 'Failed to load')
      else setData(d)
    } catch { setErr('Connection error') }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey])

  useEffect(() => { load() }, [load])

  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2600) }

  async function adjust(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/adjust', { method: 'POST', headers: H, body: JSON.stringify(payload) })
      const d = await res.json()
      if (!res.ok) { flash(d.error || 'Update failed'); return false }
      flash('Done.'); await load(); return true
    } catch { flash('Connection error'); return false }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'payments', label: 'Payments' },
    { id: 'customers', label: 'Customers' },
    { id: 'generations', label: 'Generations' },
    { id: 'pinResets', label: 'PIN Resets' },
  ]

  return (
    <div style={wrap}>
      <div style={container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.9rem', fontWeight: 600, lineHeight: 1.1 }}>Remarkable CV Admin</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Dashboard overview</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={load} style={btnGhost}>↻ Refresh</button>
            <button onClick={onLock} style={btnGhost}>Lock</button>
          </div>
        </div>

        {/* stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
          <StatCard label="Total Revenue" value={data ? `GH₵${data.stats.revenue.toFixed(2)}` : '—'} accent />
          <StatCard label="Payments" value={data ? String(data.stats.payments) : '—'} />
          <StatCard label="Customers" value={data ? String(data.stats.customers) : '—'} />
          <StatCard label="CVs Generated" value={data ? String(data.stats.cvsGenerated) : '—'} />
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ ...btnGhost, ...(tab === t.id ? { background: ACCENT, color: 'white', borderColor: ACCENT } : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {err && <div style={{ ...card, color: '#dc2626', marginBottom: '16px' }}>{err}</div>}
        {loading && !data ? <div style={{ ...card, color: '#64748b' }}>Loading…</div> : null}

        {data && (
          <>
            {tab === 'overview' && <PaymentsTable payments={data.recentPayments} title="Recent payments" />}
            {tab === 'payments' && <PaymentsTable payments={data.recentPayments} title="Payments" />}
            {tab === 'customers' && <CustomersPanel customers={data.customers} adjust={adjust} />}
            {tab === 'generations' && <GenerationsTable rows={data.generations} />}
            {tab === 'pinResets' && <PinResetsTable rows={data.pinResets} />}
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: 'white', padding: '11px 20px', borderRadius: '10px', fontSize: '13px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 100 }}>{toast}</div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={card}>
      <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '10px' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: accent ? ACCENT : '#0f172a', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function PaymentsTable({ payments, title }: { payments: Payment[]; title: string }) {
  return (
    <div style={card}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, marginBottom: '14px' }}>{title}</div>
      {payments.length === 0 ? <Empty text="No payments yet." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
            <thead><tr><th style={th}>Phone</th><th style={th}>Amount</th><th style={th}>Plan</th><th style={th}>Reference</th><th style={th}>Date</th></tr></thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i}>
                  <td style={td}>{p.phone_number}</td>
                  <td style={{ ...td, fontWeight: 600 }}>GH₵{(p.amount / 100).toFixed(2)}</td>
                  <td style={td}>{p.package_id}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '11.5px', color: '#94a3b8' }}>{p.paystack_reference}</td>
                  <td style={{ ...td, color: '#64748b' }}>{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CustomersPanel({ customers, adjust }: { customers: Customer[]; adjust: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [search, setSearch] = useState('')
  const [gPhone, setGPhone] = useState('')
  const [gCredits, setGCredits] = useState('')
  const [gReason, setGReason] = useState('')
  const [resetType, setResetType] = useState('credits')
  const [resetConfirm, setResetConfirm] = useState('')

  const filtered = customers.filter(c => c.phone_number.includes(search.trim()) || (c.email || '').toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Give credits + reset */}
      <div style={card}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Give credits · Reset</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          <div><label style={label}>Phone</label><input value={gPhone} onChange={e => setGPhone(e.target.value)} placeholder="e.g. 0559519783" style={input} /></div>
          <div><label style={label}>CV credits</label><input value={gCredits} onChange={e => setGCredits(e.target.value)} placeholder="e.g. 3" style={input} inputMode="numeric" /></div>
          <div><label style={label}>Reason (optional)</label><input value={gReason} onChange={e => setGReason(e.target.value)} placeholder="manual top-up" style={input} /></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
          <button style={btn} disabled={!gPhone || !gCredits}
            onClick={async () => { if (await adjust({ phoneNumber: gPhone, mode: 'add', addCv: Number(gCredits), reason: gReason })) { setGPhone(''); setGCredits(''); setGReason('') } }}>
            ＋ Give credits
          </button>
        </div>
        <div style={{ borderTop: '1px solid #eef2f7', paddingTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={resetType} onChange={e => setResetType(e.target.value)} style={{ ...input, width: 'auto' }}>
            <option value="credits">Reset CV credits only</option>
            <option value="coverLetters">Reset cover-letter credits</option>
            <option value="both">Reset both</option>
          </select>
          <input value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} placeholder="Type RESET" style={{ ...input, width: '140px' }} />
          <button style={{ ...btnDanger, opacity: (!gPhone || resetConfirm !== 'RESET') ? 0.5 : 1 }} disabled={!gPhone || resetConfirm !== 'RESET'}
            onClick={async () => { if (await adjust({ phoneNumber: gPhone, mode: 'reset', resetType, confirm: 'RESET' })) setResetConfirm('') }}>
            ⟳ Reset
          </button>
          <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Reset applies to the Phone entered above.</span>
        </div>
      </div>

      {/* Customer table */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600 }}>Customers ({customers.length})</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search phone or email…" style={{ ...input, maxWidth: '260px' }} />
        </div>
        {filtered.length === 0 ? <Empty text="No customers match." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead><tr><th style={th}>Phone</th><th style={th}>Email</th><th style={th}>CV credits</th><th style={th}>Cover-letter</th><th style={th}>Purchased</th><th style={th}>Joined</th><th style={th}>Quick action</th></tr></thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 600 }}>{c.phone_number}</td>
                    <td style={{ ...td, color: '#64748b' }}>{c.email || '—'}</td>
                    <td style={td}><Pill n={c.credits} /></td>
                    <td style={td}><Pill n={c.cover_letter_credits} /></td>
                    <td style={{ ...td, color: '#64748b' }}>{c.total_purchased}</td>
                    <td style={{ ...td, color: '#64748b' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                    <td style={td}>
                      <button style={{ ...btnGhost, padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => adjust({ phoneNumber: c.phone_number, mode: 'add', addCv: 1, reason: 'quick +1' })}>+1 credit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function GenerationsTable({ rows }: { rows: Generation[] }) {
  return (
    <div style={card}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, marginBottom: '14px' }}>Recent generations</div>
      {rows.length === 0 ? <Empty text="No CVs generated yet." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
            <thead><tr><th style={th}>Phone</th><th style={th}>Type</th><th style={th}>Template</th><th style={th}>Label</th><th style={th}>Date</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 600 }}>{r.phone_number}</td>
                  <td style={td}>{r.cv_type}</td>
                  <td style={td}>{r.template_id}</td>
                  <td style={{ ...td, color: '#64748b' }}>{r.label || '—'}</td>
                  <td style={{ ...td, color: '#64748b' }}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PinResetsTable({ rows }: { rows: PinReset[] }) {
  return (
    <div style={card}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, marginBottom: '14px' }}>PIN reset requests</div>
      {rows.length === 0 ? <Empty text="No PIN resets requested." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
            <thead><tr><th style={th}>Phone</th><th style={th}>Status</th><th style={th}>Requested</th><th style={th}>Expires</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 600 }}>{r.phone_number}</td>
                  <td style={td}>{r.used ? <span style={{ color: '#16a34a' }}>Used</span> : new Date(r.expires_at) < new Date() ? <span style={{ color: '#94a3b8' }}>Expired</span> : <span style={{ color: ACCENT }}>Pending</span>}</td>
                  <td style={{ ...td, color: '#64748b' }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ ...td, color: '#64748b' }}>{new Date(r.expires_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Pill({ n }: { n: number }) {
  return <span style={{ display: 'inline-block', minWidth: '26px', textAlign: 'center', padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: n > 0 ? '#ecfdf5' : '#f1f5f9', color: n > 0 ? '#059669' : '#94a3b8' }}>{n}</span>
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: '13px', color: '#94a3b8', padding: '10px 0' }}>{text}</div>
}
