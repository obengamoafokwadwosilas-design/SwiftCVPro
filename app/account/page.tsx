import { redirect } from 'next/navigation'
import { currentMember } from '@/lib/customerAuth'
import { getCredits, getCoverLetterCredits } from '@/lib/credits'
import AccountHistory from '@/components/AccountHistory'
import SignOutButton from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'My account — Remarkable CV' }

const card = { flex: '1 1 240px', background: 'white', border: '1px solid #e7e2d8', borderRadius: '14px', padding: '20px' } as const
const cardLabel = { color: '#64748b', fontSize: '13px', margin: 0 } as const
const cardNumber = { fontSize: '34px', fontWeight: 600, color: '#07182C', margin: '4px 0 2px', lineHeight: 1.1 } as const
const cardNote = { color: '#64748b', fontSize: '13px', margin: 0 } as const
const sectionTitle = { fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '26px', fontWeight: 600, color: '#07182C', margin: '0 0 4px' } as const

export default async function AccountPage() {
  const access = await currentMember()
  // An account opened with an access code but no proved email isn't an email
  // account; My CVs is where its CVs and credits are.
  if (!access || access.guest) redirect('/my-cvs')

  const [credits, coverLetterCredits] = await Promise.all([
    getCredits(access.id),
    getCoverLetterCredits(access.id),
  ])
  const noCredits = credits === 0 && coverLetterCredits === 0

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f0', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#171310' }}>
      <header style={{ background: '#07182C', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 20px', height: '66px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/remarkable-cv-mark-128.png" alt="" aria-hidden="true" style={{ height: '38px', width: '34px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F6F6F3' }}>
              Remarkable<span style={{ color: '#42e45f' }}>CV</span>
            </span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <a href="/build" style={{ background: '#0a8a3f', color: 'white', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
              Create a CV
            </a>
            <SignOutButton style={{ color: 'rgba(255,255,255,0.75)' }} />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '36px 20px 64px' }}>
        <h1 style={{ ...sectionTitle, fontSize: '36px' }}>My account</h1>
        <p style={{ color: '#64748b', margin: '0 0 28px', overflowWrap: 'anywhere' }}>Signed in as {access.email}</p>

        <h2 style={sectionTitle}>Your credits</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 14px' }}>
          {noCredits
            ? 'You have no credits yet. Previews are free, and you only pay when you download.'
            : 'Credits never expire. Use them whenever you are ready.'}
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={card}>
            <p style={cardLabel}>CV credits</p>
            <p style={cardNumber}>{credits}</p>
            <p style={cardNote}>1 credit = 1 finished CV</p>
          </div>
          <div style={card}>
            <p style={cardLabel}>Cover letter credits</p>
            <p style={cardNumber}>{coverLetterCredits}</p>
            <p style={cardNote}>1 credit = 1 finished cover letter</p>
          </div>
        </div>
        <p style={{ margin: '14px 0 0' }}>
          <a href="/#pricing" style={{ color: '#0a8a3f', fontWeight: 600, fontSize: '14px' }}>Buy more credits →</a>
        </p>

        <h2 style={{ ...sectionTitle, marginTop: '40px' }}>Saved documents</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 6px' }}>
          Every CV and cover letter you generate is saved here. Paid documents can be downloaded again for free.
        </p>
        <AccountHistory email={access.email} />
      </main>
    </div>
  )
}
