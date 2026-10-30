import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support | Remarkable CV',
  description: 'Get help with your CV, payment, downloads or data.',
}

const h2 = { fontSize: '1.25rem', margin: '32px 0 8px' } as const
const ul = { paddingLeft: '22px', margin: '8px 0', listStyleType: 'disc' } as const
const link = { color: '#0a8a3f' } as const

export default function Page() {
  return (
    <main
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '64px 24px',
        fontFamily: 'Arial, sans-serif',
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Support</h1>
      <p style={{ marginTop: 0 }}>
        Stuck on something? Message us on WhatsApp and a real person will help.
      </p>
      <p>
        <a
          href="https://wa.me/233559519783?text=Hi,%20I%20need%20help%20with%20Remarkable%20CV"
          style={{ display: 'inline-block', background: '#0a8a3f', color: '#fff', padding: '12px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 600 }}
        >
          WhatsApp +233 55 951 9783
        </a>
      </p>

      <h2 style={h2}>What to send us</h2>
      <ul style={ul}>
        <li>What went wrong, in a sentence or two.</li>
        <li>The email or phone number you used, and the time you paid if it is about a payment.</li>
        <li>A screenshot, if you can.</li>
      </ul>

      <h2 style={h2}>Quick answers</h2>
      <ul style={ul}>
        <li><strong>I paid but my CV is still locked.</strong> Refresh the page and open My CVs from the menu. If it is still locked after a minute, message us with your payment time.</li>
        <li><strong>I cannot find my CVs.</strong> Use the same browser you made them in, or open My CVs and ask for your email link. Credits and CVs follow your email once you open them from that link.</li>
        <li><strong>I forgot my access code.</strong> Ask for your email link from My CVs and you can set a new one.</li>
        <li><strong>My download looks wrong.</strong> Tell us which design and which device, and we will fix it.</li>
        <li><strong>I want my money back.</strong> See our <a href="/refund-policy" style={link}>Refund Policy</a>.</li>
      </ul>

      <h2 style={h2}>Delete my data</h2>
      <p>
        You can ask us to delete your saved CVs, letters and details at any time. Message us on
        WhatsApp from the phone or email you used with us and say &ldquo;delete my data&rdquo;. We
        confirm it is you, delete it, and tell you when it is done. We keep only the payment records the
        law and our accounts require. More in our <a href="/privacy" style={link}>Privacy Policy</a>.
      </p>

      <p style={{ marginTop: '32px', color: '#64748b', fontSize: '14px' }}>
        <a href="/terms" style={link}>Terms</a> · <a href="/privacy" style={link}>Privacy</a> · <a href="/refund-policy" style={link}>Refund Policy</a>
      </p>
    </main>
  )
}
