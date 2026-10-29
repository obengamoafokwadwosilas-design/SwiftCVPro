import 'server-only'
import { Resend } from 'resend'

// Tells the owner by email when something customers depend on breaks — a
// payment that can't be credited, PDFs that won't render, the AI key rejected —
// so it isn't found out from an angry WhatsApp message. Needs ALERT_EMAIL set
// in Vercel (RESEND_API_KEY and RECOVERY_EMAIL_FROM are already there); until
// it is, failures only go to the server log.
//
// Never throws, never delays the customer's request for long, and carries no
// CV content or contact details — only what failed and where.
const lastSent = new Map<string, number>()
const QUIET_MS = 15 * 60 * 1000   // one email per kind per instance per 15 minutes

export async function alertOwner(kind: string, detail: unknown): Promise<void> {
  const text = (detail instanceof Error ? detail.message : String(detail ?? '')).replace(/\s+/g, ' ').slice(0, 300)
  console.error(`[ALERT] ${kind}: ${text}`)
  try {
    const to = process.env.ALERT_EMAIL, from = process.env.RECOVERY_EMAIL_FROM, key = process.env.RESEND_API_KEY
    if (!to || !from || !key) return
    const now = Date.now()
    if (now - (lastSent.get(kind) || 0) < QUIET_MS) return
    lastSent.set(kind, now)
    await new Resend(key).emails.send({
      from, to, subject: `RemarkableCV alert: ${kind}`,
      text: `${kind}\n\n${text}\n\nTime: ${new Date(now).toISOString()}\nSite: ${process.env.NEXT_PUBLIC_BASE_URL || ''}\n\n(One email per kind every 15 minutes. Full details are in the Vercel logs.)`,
    })
  } catch (error) {
    console.error('alertOwner could not send:', error)
  }
}
