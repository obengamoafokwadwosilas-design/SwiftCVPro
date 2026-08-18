'use client'

import { useState } from 'react'
import CVHistoryModal from './CVHistoryModal'
import BalanceModal from './BalanceModal'
import HeaderMenu from './HeaderMenu'

// Named for what is being decided in each phase. Phase 3 spans every form
// screen, so it is Details — not Review, which would be a lie for the four or
// five screens of typing that sit inside it.
const PHASES = ['Document', 'Method', 'Details'] as const

interface NavProps {
  /** Which of the three phases the user is in. */
  step?: 1 | 2 | 3
  /**
   * How far through the CURRENT phase, 0–1. The Details phase spans four to
   * five screens, so without this the bar would sit full and motionless for
   * most of the flow while the screen's own "Step 3 of 5" said otherwise.
   * One progress story, told once.
   */
  subProgress?: number
  rightSlot?: React.ReactNode
}

export default function Nav({ step, subProgress = 1, rightSlot }: NavProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [showBalance, setShowBalance] = useState(false)

  const fillFor = (seg: number) => {
    if (!step) return 0
    if (seg < step) return 1
    if (seg > step) return 0
    return Math.min(1, Math.max(0.06, subProgress))
  }

  return (
    <>
    <nav style={{
      background: '#0B1017',
      padding: '0 clamp(20px, 4vw, 44px)',
      height: '66px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: '1px solid rgba(255,255,255,0.07)'
    }}>
      <a href="/" title="Back to home" style={{ textDecoration: 'none', display: 'block', flexShrink: 0 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.5rem',
          fontWeight: 400,
          color: '#F6F6F3',
          letterSpacing: '0.005em',
          lineHeight: 1.05
        }}>
          Extraordinary <span style={{ color: 'var(--teal-on-dark)' }}>CV</span>
        </div>
        <div className="xcv-mono xcv-tagline" style={{
          fontSize: '9px',
          color: 'rgba(255,255,255,0.5)',
          marginTop: '3px'
        }}>
          Every job deserves its own
        </div>
      </a>

      {/* Phase indicator. The name carries the meaning; the rule carries the
          distance. No number, so it can never contradict the step count the
          screen itself shows. */}
      {step && (
        <div className="xcv-phase" style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
          <span className="xcv-mono" style={{ color: 'rgba(255,255,255,0.72)', fontSize: '9.5px' }}>
            {PHASES[step - 1]}
          </span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[1, 2, 3].map(seg => (
              <div key={seg} style={{
                height: '2px',
                width: '30px',
                borderRadius: '1px',
                background: 'rgba(255,255,255,0.16)',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${fillFor(seg) * 100}%`,
                  background: 'var(--teal-on-dark)',
                  borderRadius: '1px',
                  transition: 'width .45s cubic-bezier(.2,.7,.3,1)'
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <HeaderMenu items={[
          { label: 'My CVs', onClick: () => setShowHistory(true), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
          { label: 'Check my balance', onClick: () => setShowBalance(true), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14.5" r="1" fill="currentColor" stroke="none"/></svg> },
        ]} />
        {rightSlot}
      </div>
    </nav>
    <CVHistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
    <BalanceModal open={showBalance} onClose={() => setShowBalance(false)} />
    </>
  )
}
