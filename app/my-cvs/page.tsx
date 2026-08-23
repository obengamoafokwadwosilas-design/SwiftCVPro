'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CVHistoryModal from '@/components/CVHistoryModal'

// Dedicated entry point so the static landing page (public/landing.html,
// plain HTML/JS — it can't render the React history modal directly) has a
// real URL to link to. Opens the same modal used everywhere else in the
// app; closing it goes to the builder, since there's nothing else on this
// page to land on.
export default function MyCvsPage() {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  // ?phone= and ?setpin=1 let a caller that already knows the number (e.g.
  // "Set a PIN" right after a purchase) skip straight past the phone-entry
  // step instead of making the user retype what was just collected. Read
  // after mount, not during render, so this matches the server-rendered
  // markup and doesn't trip a hydration mismatch.
  const [initialPhone, setInitialPhone] = useState<string | undefined>(undefined)
  const [autoSetPin, setAutoSetPin] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setInitialPhone(params.get('phone') || undefined)
    setAutoSetPin(params.get('setpin') === '1')
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0fdf9 0%, #f8fafc 40%, #fefdfb 100%)' }}>
      <CVHistoryModal
        open={open}
        onClose={() => { setOpen(false); router.push('/build') }}
        initialPhone={initialPhone}
        autoSetPin={autoSetPin}
      />
    </div>
  )
}
