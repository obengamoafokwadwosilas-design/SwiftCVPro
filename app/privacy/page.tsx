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
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Privacy Policy</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>Last updated: 29 October 2026</p>
      <p>
        Remarkable CV (remarkablecv.com) writes CVs and cover letters for people in Ghana and beyond.
        This page explains what we collect, what we do with it, who helps us do it, and how you can
        have it corrected or deleted. We do not sell your personal information.
      </p>

      <h2 style={h2}>What we collect</h2>
      <ul style={ul}>
        <li>The details you give us: your CV (typed, pasted, or uploaded as a PDF, Word file or photo), job adverts, and anything you write in &ldquo;Anything to add or change?&rdquo;.</li>
        <li>Your email address, which we use for your receipt and your secure link to My CVs.</li>
        <li>The CVs and letters we write for you, which we save so you can open, download and tailor them again later.</li>
        <li>A record of your payments: the reference, amount and package. Your card or mobile money details go straight to Paystack. We never see or store them.</li>
        <li>A small cookie that marks this browser as yours, and your IP address in scrambled form, so your documents stay private to you and so we can stop misuse.</li>
        <li>If you set an access code, we keep it only in scrambled form. We cannot read it.</li>
      </ul>

      <h2 style={h2}>How we use it</h2>
      <ul style={ul}>
        <li>To write your CV or cover letter, show it to you, and let you download it.</li>
        <li>To take payment, apply your credits, and send receipts and access links.</li>
        <li>To keep the service secure and fair, for example by limiting repeated free previews.</li>
        <li>To send job alerts and CV tips, only if you ticked the box asking for them. Tell us and we will stop.</li>
      </ul>

      <h2 style={h2}>AI writes your documents</h2>
      <p>
        To write your CV or letter, the details you provide are sent to Anthropic, whose Claude AI
        does the writing. Photos and scanned CVs are read by AI as well. Anthropic handles that
        information under its own terms and privacy policy. We use it only to produce your document.
        Please do not include details you would not want processed this way, such as national ID or
        bank numbers.
      </p>

      <h2 style={h2}>Who else handles your information</h2>
      <ul style={ul}>
        <li><strong>Paystack</strong> takes your payment.</li>
        <li><strong>Anthropic</strong> provides the AI that writes and reads your documents.</li>
        <li><strong>Api2Pdf</strong> turns your finished CV into a PDF file, so your CV&rsquo;s content is sent to it when you download a PDF.</li>
        <li><strong>Resend</strong> delivers our emails to you.</li>
        <li><strong>Supabase</strong> and <strong>Vercel</strong> store our data and run our website.</li>
        <li><strong>Trustpilot</strong> shows our review score on our website and may set its own cookies.</li>
      </ul>
      <p>These companies receive only what they need to do their part, and are bound by their own privacy terms.</p>

      <h2 style={h2}>How long we keep it</h2>
      <p>
        Your saved documents stay in My CVs until you ask us to delete them, so you can come back and
        download again. Payment records are kept for as long as we need them for accounting and
        resolving disputes.
      </p>

      <h2 style={h2}>Your rights</h2>
      <p>
        Under the Data Protection Act, 2012 (Act 843), you may ask us for a copy of your information,
        ask us to correct it, ask us to delete your saved documents and details, or object to how we
        use it. Message us on WhatsApp at{' '}
        <a href="https://wa.me/233559519783" style={{ color: '#0a8a3f' }}>+233 55 951 9783</a>, from the
        phone or email you used with us, and we will act on your request promptly.
      </p>

      <h2 style={h2}>Keeping your information safe</h2>
      <p>
        Connections to our site are encrypted. Your documents are tied to your browser and, if you
        choose, protected by a 4-digit access code and a secure email link. Unpaid previews are
        watermarked and cannot be downloaded. No online service can promise perfect security, so
        please keep your access code and links private.
      </p>

      <h2 style={h2}>Cookies</h2>
      <p>
        We use only the cookies needed to recognise your browser and keep you signed in to My CVs. We
        do not use advertising cookies.
      </p>

      <h2 style={h2}>Changes</h2>
      <p>
        If we change this policy, we will update the date at the top of this page.
      </p>
    </main>
  )
}
