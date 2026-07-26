// Single source of truth for payment packages, shared by the build page (UI +
// Paystack amount) and the webhook (crediting). `amount` is in PESEWAS — the
// Paystack subunit for GHS, where GH₵1 = 100 pesewas. cv / cl are how many CV
// and cover-letter credits the package grants.
export type PackageId = 'silver' | 'gold' | 'coverletter' | 'platinum'

export interface Package {
  id: PackageId
  name: string
  emoji: string   // shown in the pricing modal
  price: number   // GH₵, for display
  amount: number  // pesewas, for Paystack
  cv: number      // CV credits granted
  cl: number      // cover-letter credits granted
  blurb: string
  recommended?: boolean
}

export const PACKAGES: Package[] = [
  { id: 'silver',      name: 'Silver CV',             emoji: '🥈', price: 29, amount: 2900, cv: 1, cl: 0, blurb: '1 Professional CV' },
  { id: 'gold',        name: 'Gold Application Pack', emoji: '⭐', price: 39, amount: 3900, cv: 1, cl: 1, blurb: 'CV + Cover Letter', recommended: true },
  { id: 'coverletter', name: 'Cover Letter Pro',      emoji: '✉️', price: 15, amount: 1500, cv: 0, cl: 1, blurb: 'Cover Letter only' },
  { id: 'platinum',    name: 'Platinum Career Pack',  emoji: '👑', price: 99, amount: 9900, cv: 4, cl: 4, blurb: '4 CVs + 4 Cover Letters' },
]

// Packages relevant to the document being built: a CV needs CV credits, a
// cover letter needs cover-letter credits — so we never offer, say, "Silver CV"
// to someone who's making a cover letter.
export function packagesForDoc(isCoverLetter: boolean): Package[] {
  return PACKAGES.filter(p => (isCoverLetter ? p.cl > 0 : p.cv > 0))
}

// The webhook resolves the package from the amount Paystack actually charged —
// never from client-supplied metadata — so a tampered request can't claim more
// credits than it paid for.
export function packageByAmount(amount: number): Package | undefined {
  return PACKAGES.find(p => p.amount === amount)
}
