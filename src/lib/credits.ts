import { supabaseAdmin } from './supabase'
export { normalizePhone } from './phone'
import type { Package } from './packages'

export async function getCredits(ownerId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.from('customer_credits').select('credits').eq('owner_id', ownerId).maybeSingle()
  if (error) throw error
  return data?.credits || 0
}
export async function getCoverLetterCredits(ownerId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.from('customer_credits').select('cover_letter_credits').eq('owner_id', ownerId).maybeSingle()
  if (error) throw error
  return data?.cover_letter_credits || 0
}
async function adjust(ownerId: string, cv: number, cl: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('adjust_customer_credit', { p_owner: ownerId, p_cv: cv, p_cl: cl })
  return !error && data === true
}
export const addCredits = (ownerId: string, amount = 1) => adjust(ownerId, amount, 0)
export const grantCoverLetterCredit = (ownerId: string, amount = 1) => adjust(ownerId, 0, amount)
export const deductCredit = (ownerId: string) => adjust(ownerId, -1, 0)
export const deductCoverLetterCredit = (ownerId: string) => adjust(ownerId, 0, -1)
export const hasCredits = async (ownerId: string) => (await getCredits(ownerId)) > 0
export const hasCoverLetterCredit = async (ownerId: string) => (await getCoverLetterCredits(ownerId)) > 0

export async function adminSetCredits(ownerId: string, fields: { credits?: number; coverLetterCredits?: number }): Promise<boolean> {
  const row: Record<string, unknown> = { owner_id: ownerId, updated_at: new Date().toISOString() }
  if (fields.credits !== undefined) row.credits = Math.max(0, Math.floor(fields.credits))
  if (fields.coverLetterCredits !== undefined) row.cover_letter_credits = Math.max(0, Math.floor(fields.coverLetterCredits))
  const { error } = await supabaseAdmin.from('customer_credits').upsert(row, { onConflict: 'owner_id' })
  return !error
}
export async function creditPackageIfNew(ownerId: string, reference: string, pkg: Package, amount: number): Promise<{ credited: boolean; duplicate: boolean; error?: string }> {
  const { data, error } = await supabaseAdmin.rpc('credit_customer_payment', {
    p_owner: ownerId, p_reference: reference, p_package: pkg.id, p_amount: amount, p_cv: pkg.cv, p_cl: pkg.cl,
  })
  if (error) return { credited: false, duplicate: false, error: error.message }
  return { credited: data === true, duplicate: data === false }
}
export async function isDownloadPaid(ownerId: string, historyId: number, cover?: boolean): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('customer_history').select('download_paid, cv_type').eq('id', historyId).eq('owner_id', ownerId).maybeSingle()
  if (error) throw error
  if (!data || (cover !== undefined && (data.cv_type === 'cover_letter') !== cover)) throw new Error('Saved document not found.')
  return !!data.download_paid
}
export async function markDownloadPaid(ownerId: string, historyId: number): Promise<void> {
  const { error } = await supabaseAdmin.from('customer_history').update({ download_paid: true }).eq('id', historyId).eq('owner_id', ownerId)
  if (error) throw error
}
export async function payDocument(ownerId: string, historyId: number, cover: boolean): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('pay_customer_document', { p_owner: ownerId, p_id: historyId, p_cover: cover })
  return !error && data === true
}
