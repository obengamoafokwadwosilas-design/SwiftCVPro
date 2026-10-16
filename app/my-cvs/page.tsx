'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CVHistoryModal from '@/components/CVHistoryModal'

export default function MyCvsPage() {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'google') {
      setNotice("Google sign-in didn't complete. Please try again, or use the email link below.")
    }
  }, [])
  return <div style={{ minHeight: '100vh', background: '#f8f6f0' }}>
    <CVHistoryModal open={open} notice={notice} onClose={() => { setOpen(false); router.push('/build') }} />
  </div>
}
