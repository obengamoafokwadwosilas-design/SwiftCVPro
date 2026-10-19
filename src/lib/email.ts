export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
export function isValidEmail(value: string): boolean {
  // .invalid is reserved and never routable; it is also what browser-identity
  // (guest) rows use, so nobody may type one as their own address.
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/\.invalid$/i.test(value)
}
