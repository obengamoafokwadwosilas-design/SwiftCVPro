'use client'

import { useState } from 'react'
import CVHistoryModal from './CVHistoryModal'
import BalanceModal from './BalanceModal'
import HeaderMenu from './HeaderMenu'

interface NavProps {
  step?: 1 | 2 | 3
  rightSlot?: React.ReactNode
}

export default function Nav({ step, rightSlot }: NavProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  return (
    <>
    <nav style={{
      background: '#0a0f1a',
      padding: '16px 48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: '1px solid rgba(255,255,255,0.06)'
    }}>
      <a href="/" title="Back to home" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.4rem',
          fontWeight: 600,
          color: 'white',
          letterSpacing: '0.3px'
        }}>
          Swift<span style={{ color: '#5eead4' }}>CV</span>Pro
        </div>
        {/* Secondary text on the dark bar was at 0.28 opacity and 9px, which
            was effectively unreadable. Lifted for legibility while staying
            clearly secondary to the wordmark. */}
        <div style={{
          fontSize: '9.5px',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '1.8px',
          textTransform: 'uppercase'
        }}>
          CV Writing, Simplified.
        </div>
      </a>

      {step && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              height: '3px',
              width: s === step ? '40px' : '24px',
              borderRadius: '2px',
              background: s === step ? '#14b8a6' : 'rgba(255,255,255,0.22)',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <HeaderMenu items={[
          { label: 'My CVs', onClick: () => setShowHistory(true), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
          { label: 'Check my balance', onClick: () => setShowBalance(true), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14.5" r="1" fill="currentColor" stroke="none"/></svg> },
        ]} />
        {rightSlot || (
          <div style={{
            fontSize: '11px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.62)',
            fontWeight: 500
          }}>
            {step ? `Step ${step} of 3` : ''}
          </div>
        )}
      </div>
    </nav>
    <CVHistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
    <BalanceModal open={showBalance} onClose={() => setShowBalance(false)} />
    </>
  )
}
