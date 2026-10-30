const h2 = { fontSize: '1.25rem', margin: '32px 0 8px' } as const
const ul = { paddingLeft: '22px', margin: '8px 0', listStyleType: 'disc' } as const

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
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Refund Policy</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>Last updated: 30 October 2026</p>
      <p>
        Previews are free, so you can see your CV before you pay. Once you have paid and received your
        document, the sale is final, except when something on our side went wrong. This is what we do
        in each case.
      </p>

      <h2 style={h2}>When you get your money back</h2>
      <ul style={ul}>
        <li>You paid but the credit never appeared, or the payment was taken twice.</li>
        <li>A technical fault stopped your CV or letter from being written or downloaded, and we could not fix it for you.</li>
        <li>You paid GH₵5 for AI edits and they were not added to your CV.</li>
      </ul>
      <p>
        We will first try to put things right (finish your document, add the missing credit or edits).
        If we cannot, we refund you in full to the same Paystack payment method.
      </p>

      <h2 style={h2}>When we cannot refund</h2>
      <ul style={ul}>
        <li>You have already downloaded your finished document, unless there was a verified technical fault.</li>
        <li>You changed your mind, or the document did not get you an interview or a job.</li>
        <li>An AI edit was refused because it asked for something an edit cannot do, such as a different name or a CV for another job. That edit is not counted against you, and you can ask for something else.</li>
        <li>Details you typed were wrong. You can correct them yourself for free, or use an AI edit.</li>
      </ul>

      <h2 style={h2}>Unused credits</h2>
      <p>
        Credits do not expire, so an unused credit stays yours to spend whenever you are ready.
      </p>

      <h2 style={h2}>How to ask</h2>
      <p>
        Contact us within 24 hours of the problem, through our <a href="/support" style={{ color: '#0a8a3f' }}>Support page</a> or
        by WhatsApp at{' '}
        <a href="https://wa.me/233559519783" style={{ color: '#0a8a3f' }}>+233 55 951 9783</a>. Please
        send the email or phone you paid with, the time of the payment, and the Paystack reference if you
        have it. We reply as quickly as we can, and approved refunds are sent back through Paystack. Your
        bank or mobile money provider may take a few working days to show it.
      </p>
    </main>
  )
}
