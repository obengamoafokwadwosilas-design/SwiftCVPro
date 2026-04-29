'use client'

interface NavProps {
  step?: 1 | 2 | 3
  rightSlot?: React.ReactNode
}

export default function Nav({ step, rightSlot }: NavProps) {
  return (
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
      <div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.4rem',
          fontWeight: 600,
          color: 'white',
          letterSpacing: '0.3px'
        }}>
          Swift<span style={{ color: '#5eead4' }}>CV</span>Pro
        </div>
        <div style={{
          fontSize: '9px',
          fontWeight: 300,
          color: 'rgba(255,255,255,0.28)',
          letterSpacing: '1.8px',
          textTransform: 'uppercase'
        }}>
          Expertly Crafted. Instantly Delivered.
        </div>
      </div>

      {step && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              height: '3px',
              width: s === step ? '40px' : '24px',
              borderRadius: '2px',
              background: s === step ? '#14b8a6' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>
      )}

      {rightSlot || (
        <div style={{
          fontSize: '11px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          fontWeight: 500
        }}>
          {step ? `Step ${step} of 3` : ''}
        </div>
      )}
    </nav>
  )
}
