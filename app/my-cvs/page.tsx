'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CVHistoryModal from '@/components/CVHistoryModal'

export default function MyCvsPage() {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  return <div style={{ minHeight: '100vh', background: '#f8f6f0' }}>
    <CVHistoryModal open={open} onClose={() => { setOpen(false); router.push('/build') }} />
  </div>
}
