'use client'

import { useEffect, useRef, useState } from 'react'

export interface HeaderMenuItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
}

// Support line, shown at the foot of every menu (see the anchor below).
const WHATSAPP_HREF = 'https://wa.me/233559519783?text=' + encodeURIComponent('Hi, I need help with Extraordinary CV')

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
      {/* Labelled, not a bare icon: a lone hamburger is easy to miss for users
          who don't live in SaaS apps, and this hides core actions (My CVs,
          New CV, …). The word "Menu" + chevron makes it obviously a menu. */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="xcv-menubtn"
        style={{ height: '34px', display: 'flex', alignItems: 'center', gap: '7px', padding: '0 13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
      >
        <span style={{ fontSize: '12.5px', fontWeight: 400, color: 'rgba(255,255,255,0.86)', letterSpacing: '.01em' }}>Menu</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 9px)', right: 0, background: 'var(--sheet)', borderRadius: '6px', border: '1px solid var(--rule)', boxShadow: '0 14px 34px -10px rgba(11,16,23,0.28)', overflow: 'hidden', minWidth: '196px', zIndex: 60 }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { setOpen(false); item.onClick() }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left' as const, padding: '12px 15px', background: 'var(--sheet)', border: 'none', borderBottom: '1px solid var(--rule-soft)', fontSize: '13px', fontWeight: 400, color: 'var(--ink)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              {item.icon}{item.label}
            </button>
          ))}
          {/* Built in rather than passed by each caller, so help is reachable
              from every menu in the app without anyone remembering to add it. */}
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', background: 'var(--teal-tint)', fontSize: '13px', fontWeight: 500, color: 'var(--teal)', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"/><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5.05-1.32A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.18-1.15l-.3-.18-3 .78.8-2.92-.19-.3A8.2 8.2 0 1112 20.2z"/></svg>
            WhatsApp support
          </a>
        </div>
      )}
    </div>
  )
}
