import Link from 'next/link'

// Plain, fast wrapper for the written guides: a slim header with the logo and a
// way to start a CV, the article column, and the same footer links as the home page.
export default function GuideShell({ children }: { children: React.ReactNode }) {
  const link = { color: '#475569', textDecoration: 'none', fontSize: '13.5px' } as const
  return (
    <div style={{ background: '#fbf8f2', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <header style={{ background: '#07182c' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: '1.05rem' }}>
            Remarkable<span style={{ color: '#42e45f' }}>CV</span>
          </Link>
          <Link href="/build" style={{ background: '#0aa447', color: '#fff', padding: '9px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none' }}>Build my CV</Link>
        </div>
      </header>
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px 64px' }}>{children}</main>
      <footer style={{ borderTop: '1px solid #e5e0d6', padding: '24px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link href="/guides" style={link}>Guides</Link>
          <Link href="/terms" style={link}>Terms</Link>
          <Link href="/privacy" style={link}>Privacy</Link>
          <Link href="/refund-policy" style={link}>Refund Policy</Link>
          <Link href="/support" style={link}>Support</Link>
        </div>
      </footer>
    </div>
  )
}
