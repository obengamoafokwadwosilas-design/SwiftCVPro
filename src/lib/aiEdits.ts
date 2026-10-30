import 'server-only'
import { supabaseAdmin } from './supabase'
import { AI_EDIT_PACK } from './packages'
import { alertOwner } from './alerts'

// "Edit with RemarkableCV" bookkeeping, all in the database (see
// supabase_ai_edits.sql) so counts hold across every server instance.
// Every function treats "the SQL hasn't been run yet" as "AI edits aren't
// available" rather than an error, so the feature switches itself on when the
// database is ready and stays hidden until then.

const missing = (error: { code?: string; message?: string }) =>
  error.code === '42883' || error.code === 'PGRST202' || error.code === '42703' || /does not exist|could not find the function/i.test(error.message || '')

export async function aiEditsLeft(ownerId: string, historyId: number): Promise<{ available: boolean; left: number }> {
  const { data, error } = await supabaseAdmin.rpc('ai_edits_left', { p_owner: ownerId, p_id: historyId })
  if (error) {
    if (!missing(error)) console.error('ai_edits_left failed:', error.message)
    return { available: false, left: 0 }
  }
  return typeof data === 'number' ? { available: true, left: data } : { available: false, left: 0 }
}

// true = an edit was taken; false = none left (or not theirs); throws if the database can't say.
export async function takeAiEdit(ownerId: string, historyId: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('take_ai_edit', { p_owner: ownerId, p_id: historyId })
  if (error) throw error
  return data === true
}

export async function refundAiEdit(ownerId: string, historyId: number): Promise<void> {
  const { error } = await supabaseAdmin.rpc('refund_ai_edit', { p_owner: ownerId, p_id: historyId })
  if (error) await alertOwner('AI edit could not be refunded', `history ${historyId}: ${error.message}`)
}

// Credits a paid edit pack from a Paystack transaction the caller has already
// confirmed as successful. Checks everything the caller can't: that it is the
// edit-pack price in cedis and names a document. Safe to call any number of
// times for one reference (the database ignores repeats).
export async function creditEditPayment(tx: { reference: string; amount: number; currency: string; ownerId: string; historyId: unknown }):
  Promise<{ ok: boolean; duplicate: boolean; error?: string }> {
  const historyId = Number(tx.historyId)
  if (tx.currency !== 'GHS' || tx.amount !== AI_EDIT_PACK.amount || !Number.isSafeInteger(historyId) || historyId < 1) {
    await alertOwner('PAID but AI edit payment is malformed', `reference ${tx.reference}, amount ${tx.amount} ${tx.currency}, history ${String(tx.historyId)}`)
    return { ok: false, duplicate: false, error: 'This payment could not be matched to a document. Contact support.' }
  }
  const { liveOwnerId } = await import('./credits')
  const creditTo = await liveOwnerId(tx.ownerId)
  if (!creditTo) return { ok: false, duplicate: false, error: 'Payment customer could not be found.' }
  const { data, error } = await supabaseAdmin.rpc('credit_ai_edits', {
    p_owner: creditTo, p_id: historyId, p_reference: tx.reference, p_amount: tx.amount, p_edits: AI_EDIT_PACK.edits,
  })
  if (error) {
    await alertOwner('PAID but AI edits NOT added', `reference ${tx.reference}, history ${historyId}: ${error.message}`)
    return { ok: false, duplicate: false, error: 'Payment received but the edits could not be added. Contact support.' }
  }
  return { ok: true, duplicate: data === false }
}
