'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateId, GeneratedCV } from '@/types'
import { saveBuildSeed, BuildSeed, clearPreviousCoverLetter } from '@/lib/buildSeed'

interface HistoryItem {
  id: number; cv_type: string; template_id: TemplateId; accent_color: string | null
  label: string | null; generated_cv: GeneratedCV; raw_input: BuildSeed; created_at: string
}

const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px' }
const primary = { padding: '12px 18px', background: '#0a8a3f', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }
const link = { background: 'none', border: 'none', color: '#0a8a3f', cursor: 'pointer', padding: '8px 0', fontSize: '13px' }

// Same /api/cv-history/list call and openCv() behaviour as CVHistoryModal — a
// document row must behave identically whether opened from /my-cvs or here.
export default function AccountHistory({ email }: { email: string }) {
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/cv-history/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not load your CVs.')
        setItems(data.history || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not connect. Please try again.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function openCv(item: HistoryItem, rewrite = false) {
    if (rewrite) {
      const seed = { ...item.raw_input, email, landingScreen: 'type' as const }
      delete seed.jobDescription; delete seed.whyRole
      if (seed.form) seed.form = { ...seed.form, jobTitle: undefined, company: undefined }
      saveBuildSeed(seed)
      router.push('/build'); return
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

  if (loading) return <p style={{ color: '#64748b' }}>Loading your CVs…</p>
  if (error) return <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>
  if (items.length === 0) return <p>No saved CVs yet.</p>

  return (
    <div>
      {items.map(item => (
        <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
          <input aria-label="CV label" defaultValue={item.label || item.cv_type.replace('_', ' ')} style={{ ...inputStyle, fontWeight: 600 }} onBlur={e => {
            const label = e.target.value
            if (label !== item.label) void fetch('/api/cv-history/label', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, label }) })
          }} />
          <p style={{ color: '#64748b', fontSize: '12px' }}>{new Date(item.created_at).toLocaleDateString('en-GB')}</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button style={primary} onClick={() => openCv(item)}>Preview / Download</button>
            <button style={link} onClick={() => openCv(item, true)}>Tailor for another job</button>
          </div>
        </div>
      ))}
    </div>
  )
}
