// Single source of truth for payment packages, shared by the build page (UI +
// Paystack amount) and the webhook (crediting). `amount` is in PESEWAS — the
// Paystack subunit for GHS, where GH₵1 = 100 pesewas. cv / cl are how many CV
// and cover-letter credits the package grants.
export type PackageId = 'single' | 'standard' | 'value'

export interface Package {
  id: PackageId
  name: string
  price: number   // GH₵, for display
  amount: number  // pesewas, for Paystack
  cv: number      // CV credits granted
  cl: number      // cover-letter credits granted
  blurb: string
  recommended?: boolean
}

export const PACKAGES: Package[] = [
  { id: 'single',   name: 'Single',   price: 29, amount: 2900, cv: 1, cl: 0, blurb: '1 CV' },
  { id: 'standard', name: 'Standard', price: 49, amount: 4900, cv: 1, cl: 1, blurb: '1 CV + 1 cover letter', recommended: true },
  { id: 'value',    name: 'Value',    price: 99, amount: 9900, cv: 4, cl: 3, blurb: '4 CVs + 3 cover letters' },
]

// The webhook resolves the package from the amount Paystack actually charged —
// never from client-supplied metadata — so a tampered request can't claim more
// credits than it paid for.
export function packageByAmount(amount: number): Package | undefined {
  return PACKAGES.find(p => p.amount === amount)
}
