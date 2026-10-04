import { redirect } from 'next/navigation'
import { currentAccess } from '@/lib/customerAuth'
import { getCredits, getCoverLetterCredits } from '@/lib/credits'
import AccountHistory from '@/components/AccountHistory'
import SignOutButton from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const access = await currentAccess()
  if (!access) redirect('/my-cvs')

  const [credits, coverLetterCredits] = await Promise.all([
    getCredits(access.id),
    getCoverLetterCredits(access.id),
  ])

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f0', padding: '40px 20px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', margin: 0 }}>My account</h1>
          <SignOutButton />
        </div>
        <p style={{ color: '#64748b', overflowWrap: 'anywhere' }}>{access.email}</p>

        <div style={{ display: 'flex', gap: '16px', margin: '20px 0' }}>
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>CV credits</p>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: 0 }}>{credits}</p>
          </div>
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Cover letter credits</p>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: 0 }}>{coverLetterCredits}</p>
          </div>
        </div>

        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px' }}>My CVs</h2>
        <AccountHistory email={access.email} />
      </div>
    </div>
  )
}
