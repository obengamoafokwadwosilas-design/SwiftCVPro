'use client'

import type { CSSProperties } from 'react'

const link: CSSProperties = { background: 'none', border: 'none', color: '#0a8a3f', cursor: 'pointer', padding: '8px 0', fontSize: '13px' }

export default function SignOutButton({ style }: { style?: CSSProperties }) {
  return (
    <button
      type="button"
      style={{ ...link, ...style }}
      onClick={() => {
        void fetch('/api/customer-access/session', { method: 'DELETE' }).then(() => { window.location.href = '/' })
      }}
    >
      Sign out
    </button>
  )
}
