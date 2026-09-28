import { supabaseAdmin } from './supabase'
import { digest } from './customerAuth'
import { normalizeEmail } from './email'
export const FREE_CV_CAP = 2
export const FREE_COVER_LETTER_CAP = 2

export async function consumeFreeGeneration(ip: string, email: string, cover: boolean): Promise<{ allowed: boolean; used: number }> {
  const cap = cover ? FREE_COVER_LETTER_CAP : FREE_CV_CAP
  const { data, error } = await supabaseAdmin.rpc('consume_customer_preview', {
    p_email: digest(normalizeEmail(email)), p_ip: digest(ip), p_cover: cover, p_cap: cap,
  })
  if (error) throw error
  return { allowed: data === true, used: data ? 1 : cap }
}
export async function refundFreeGeneration(ip: string, email: string, cover: boolean): Promise<void> {
  const { error } = await supabaseAdmin.rpc('refund_customer_preview', {
    p_email: digest(normalizeEmail(email)), p_ip: digest(ip), p_cover: cover,
  })
  if (error) console.error('Free preview refund failed:', error.message)
}
