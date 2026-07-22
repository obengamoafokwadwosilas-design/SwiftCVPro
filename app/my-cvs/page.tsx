'use client'

import { useState } from 'react'
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0fdf9 0%, #f8fafc 40%, #fefdfb 100%)' }}>
      <CVHistoryModal
        open={open}
        onClose={() => { setOpen(false); router.push('/build') }}
      />
    </div>
  )
}
