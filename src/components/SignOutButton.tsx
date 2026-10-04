'use client'

import { useRouter } from 'next/navigation'

const link = { background: 'none', border: 'none', color: '#0a8a3f', cursor: 'pointer', padding: '8px 0', fontSize: '13px' }

export default function SignOutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      style={link}
      onClick={() => {
        void fetch('/api/customer-access/session', { method: 'DELETE' }).then(() => router.push('/my-cvs'))
      }}
    >
      Sign out
    </button>
  )
}
