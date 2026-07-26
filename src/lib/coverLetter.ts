// Shared helpers for the traditional Ghanaian application-letter layout.
// The AI writes the subject + body; these build the formal frame (recipient
// block, salutation, sign-off) deterministically from the inputs — so the
// letter never contains invented addresses or [placeholders].

export interface CoverRecipientInput {
  addressee?: string       // "The Human Resource Manager", "The Registrar", …
  company?: string         // institution / employer name
  companyAddress?: string  // "P. O. Box GP 667, Accra" (any comma/newline layout)
}

export function buildCoverLetterFrame(opts: CoverRecipientInput): {
  clRecipient: string[]
  clSalutation: string
  clSignOff: string
} {
  const recipient: string[] = []
  recipient.push((opts.addressee || '').trim() || 'The Human Resource Manager')
  if (opts.company?.trim()) recipient.push(opts.company.trim())
  if (opts.companyAddress?.trim()) {
    opts.companyAddress
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(line => recipient.push(line))
  }
  return {
    clRecipient: recipient,
    // No named contact is collected, so the safe, standard salutation is used.
    clSalutation: 'Dear Sir/Madam,',
    clSignOff: 'Yours faithfully,',
  }
}

// "1st July, 2026" — the date format Ghanaian letters use. Defaults to today,
// so every generated letter is dated ready-to-submit.
export function formatLetterDate(d: Date = new Date()): string {
  const day = d.getDate()
  const ones = day % 10, tens = day % 100
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th'
  const month = d.toLocaleString('en-GB', { month: 'long' })
  return `${day}${suffix} ${month}, ${d.getFullYear()}`
}

// Role-specific heading when we know the role; a general one otherwise
// (Ghanaian letters commonly use "APPLICATION FOR EMPLOYMENT" when applying
// generally rather than to a named vacancy). The subject is editable, so the
// user can switch to any variant they prefer.
export function defaultSubject(jobTitle?: string): string {
  const t = (jobTitle || '').trim()
  return t ? `APPLICATION FOR THE POSITION OF ${t.toUpperCase()}` : 'APPLICATION FOR EMPLOYMENT'
}
