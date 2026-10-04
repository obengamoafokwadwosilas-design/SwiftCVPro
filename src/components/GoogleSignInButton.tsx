'use client'

import { supabaseBrowser } from '@/lib/supabaseBrowser'

const primary = { padding: '12px 18px', background: '#0a8a3f', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }

export default function GoogleSignInButton() {
  return (
    <button
      type="button"
      style={{ ...primary, width: '100%' }}
      onClick={() => {
        void supabaseBrowser().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/api/auth/google/callback` },
        })
      }}
    >
      Continue with Google
    </button>
  )
}
