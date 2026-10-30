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
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Terms of Service</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>Last updated: 30 October 2026</p>
      <p>
        These terms cover your use of Remarkable CV (remarkablecv.com). By using the service you agree
        to them. If you do not agree, please do not use it.
      </p>

      <h2 style={h2}>What the service does</h2>
      <p>
        We write CVs and cover letters from the information you give us, using AI, and let you edit,
        preview and download them. Writing a document does not guarantee an interview or a job.
      </p>

      <h2 style={h2}>Your information and your document</h2>
      <ul style={ul}>
        <li>Give us true information about yourself. Do not use the service to describe someone else as if it were you, or to claim qualifications, jobs or results you do not have.</li>
        <li>We write only from what you provide and we do not invent numbers or raise your role. Even so, read your finished document before you send it. You are responsible for what you submit to employers.</li>
        <li>You own your document and may use it however you like. You allow us to process what you give us, including sending it to the AI and PDF providers listed in our <a href="/privacy" style={{ color: '#0a8a3f' }}>Privacy Policy</a>, so we can produce it.</li>
      </ul>

      <h2 style={h2}>Prices, credits and payment</h2>
      <ul style={ul}>
        <li>Prices are in Ghana cedis (GH₵) and shown before you pay. Payments are taken by Paystack by card or mobile money. We never see your card or mobile money details.</li>
        <li>A CV Credit or Cover Letter Credit pays for one finished document, with its Word and PDF downloads. Credits do not expire. You can spend them later, on this browser or after opening My CVs with your email link.</li>
        <li>Previews are free but watermarked and cannot be downloaded. Editing your details before you pay is free.</li>
        <li>Credits belong to the browser or account that bought them and cannot be sold or transferred.</li>
      </ul>

      <h2 style={h2}>Edit with RemarkableCV (AI edits)</h2>
      <ul style={ul}>
        <li>Every saved CV comes with 1 free AI edit. After that, GH₵5 buys 2 more edits for that CV. &ldquo;Edit it myself&rdquo; is always free and unlimited.</li>
        <li>An AI edit changes the details and wording of the CV you already have. It cannot change the name on the CV, aim the CV at a different job, or turn it into someone else&rsquo;s CV or into another type of document. Those need a new CV. If a request cannot be done, we tell you so in the notes shown after the edit.</li>
        <li>If an AI edit fails because of a fault on our side, the edit is given back to you automatically.</li>
        <li>Edits bought for one CV stay with that CV. There are no AI edits for cover letters.</li>
      </ul>

      <h2 style={h2}>Fair use</h2>
      <p>
        Do not misuse the service: no automated or bulk use, no attempts to get around watermarks,
        limits or payment, no attempts to break or overload it, and nothing unlawful or abusive. We may
        limit or block use that harms the service or other people.
      </p>

      <h2 style={h2}>Access codes and links</h2>
      <p>
        Your documents are tied to your browser and, if you choose, protected by a 4-digit access code
        and an emailed link. Keep them private. We are not responsible for documents opened by someone
        you gave your code or link to.
      </p>

      <h2 style={h2}>Our responsibility</h2>
      <p>
        We work hard to keep the service running and your documents correct, but it is provided
        &ldquo;as is&rdquo;. We cannot promise it will always be available or error-free. To the extent
        the law allows, our responsibility for any problem with the service is limited to the amount
        you paid us for it. See our <a href="/refund-policy" style={{ color: '#0a8a3f' }}>Refund Policy</a> for
        when you get your money back.
      </p>

      <h2 style={h2}>Changes and the law</h2>
      <p>
        We may update these terms and will change the date above when we do. Using the service after a
        change means you accept it. These terms are governed by the laws of Ghana.
      </p>

      <h2 style={h2}>Questions</h2>
      <p>
        See our <a href="/support" style={{ color: '#0a8a3f' }}>Support page</a> or message us on WhatsApp at{' '}
        <a href="https://wa.me/233559519783" style={{ color: '#0a8a3f' }}>+233 55 951 9783</a>.
      </p>
    </main>
  )
}
