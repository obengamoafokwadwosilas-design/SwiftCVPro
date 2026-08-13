// Split out of credits.ts so client components (e.g. app/build/page.tsx) can
// normalize a phone number without importing credits.ts — which pulls in
// supabase.ts's service-role client, meant to be server-only.

// Normalise phone — strips spaces, converts 0XX to +233XX
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('0')) cleaned = '+233' + cleaned.slice(1)
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned
  return cleaned
}
