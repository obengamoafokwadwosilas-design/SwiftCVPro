// Single source of truth for payment packages, shared by the build page (UI +
// Paystack amount) and the webhook (crediting). `amount` is in PESEWAS — the
// Paystack subunit for GHS, where GH₵1 = 100 pesewas. cv / cl are how many CV
// and cover-letter credits the package grants.
export type PackageId = 'single' | 'coverletter' | 'hunter' | 'huntermax'

export interface Package {
  id: PackageId
  name: string
  emoji: string   // shown in the pricing modal
  price: number   // GH₵, for display
  amount: number  // pesewas, for Paystack
  cv: number      // CV credits granted
  cl: number      // cover-letter credits granted
  blurb: string
  // Kept in PACKAGES (and fully supported by the webhook/crediting logic)
  // but not offered in the pricing modal or on the landing page for now —
  // multi-CV bundles are parked, not deleted. Un-hide by removing this flag.
  hidden?: boolean
  // Shown on the card and pre-selected in the credit picker.
  badge?: string
}

// Named by what they buy — a CV credit builds one CV, a cover-letter credit
// builds one letter. Two CV choices, not three: the old 6-CV pack barely
// lowered the price per CV (~GH₵30 vs ~GH₵33), so it was a third decision with
// no real reason to pick it. The 3-credit pack carries the "Best value" badge
// and is pre-selected (owner's call — this reverses the earlier no-steering
// rule). landing.html must list exactly the packages that aren't hidden.
export const PACKAGES: Package[] = [
  { id: 'single',      name: '1 CV Credit',            emoji: '🥈', price: 39,  amount: 3900,  cv: 1, cl: 0, blurb: 'Builds 1 professional CV' },
  { id: 'coverletter', name: '1 Cover Letter Credit',  emoji: '✉️', price: 19,  amount: 1900,  cv: 0, cl: 1, blurb: 'Builds 1 cover letter' },
  { id: 'hunter',      name: '3 CV Credits',           emoji: '🎯', price: 99,  amount: 9900,  cv: 3, cl: 1, blurb: 'Builds 3 CVs + free cover letter', badge: 'Best value' },
  // No longer offered; kept so a replayed or late GH₵179 payment is still credited.
  { id: 'huntermax',   name: '6 CV Credits',           emoji: '🚀', price: 179, amount: 17900, cv: 6, cl: 2, blurb: 'Builds 6 CVs + 2 cover letters', hidden: true },
]

// Packages relevant to the document being built: a CV needs CV credits, a
// cover letter needs cover-letter credits — so we never offer, say, "Professional CV"
// to someone who's making a cover letter. Hidden packages (old multi-CV
// bundles) are parked out of the modal but still valid for the webhook to
// credit if an old link or receipt ever replays one.
export function packagesForDoc(isCoverLetter: boolean): Package[] {
  return PACKAGES.filter(p => !p.hidden && (isCoverLetter ? p.cl > 0 : p.cv > 0))
}

// The webhook resolves the package from the amount Paystack actually charged —
// never from client-supplied metadata — so a tampered request can't claim more
// credits than it paid for.
export function packageByAmount(amount: number): Package | undefined {
  return PACKAGES.find(p => p.amount === amount)
}
