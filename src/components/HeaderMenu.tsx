'use client'

import { useEffect, useRef, useState } from 'react'

export interface HeaderMenuItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
}

// A single hamburger-style dropdown for secondary header actions — used
// instead of a growing row of separate buttons, which reads as cluttered.
// The header's ONE primary action (e.g. Download) stays outside this menu,
// front and centre; everything else (My CVs, + New CV, Cover Letter, …)
// lives behind this one consistent control.
export default function HeaderMenu({ items }: { items: HeaderMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menu"
        aria-expanded={open}
        style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 12px 30px -6px rgba(10,15,26,0.2)', overflow: 'hidden', minWidth: '190px', zIndex: 60 }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { setOpen(false); item.onClick() }}
              style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', textAlign: 'left' as const, padding: '12px 16px', background: 'white', border: 'none', borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '13px', fontWeight: 600, color: '#0a0f1a', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
