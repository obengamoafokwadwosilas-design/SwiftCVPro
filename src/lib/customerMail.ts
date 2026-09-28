import 'server-only'
import crypto from 'crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from './supabase'
import { digest, reserveSend, Customer } from './customerAuth'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
}
export async function sendCustomerLink(customer: Customer, receipt?: { reference: string; amount: number; packageName: string }) {
  const bucket = receipt ? 'receipt:' + receipt.reference : 'access:' + digest(customer.email)
  if (!await reserveSend(bucket, receipt ? 10 * 365 * 86400 : 60)) return
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = digest(token)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    const from = process.env.RECOVERY_EMAIL_FROM
    if (!baseUrl || !from || !process.env.RESEND_API_KEY) throw new Error('Email delivery is not configured.')
    const url = new URL('/my-cvs', baseUrl)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('The access URL must use HTTPS.')
    url.hash = 'access=' + token
    const { error } = await supabaseAdmin.from('customer_access_links').insert({
      token_hash: tokenHash, owner_id: customer.id, expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
    })
    if (error) throw new Error('Could not create access link.')
    const intro = receipt
      ? 'Payment received: GH₵' + (receipt.amount / 100).toFixed(2) + ' for ' + receipt.packageName + '. Reference: ' + receipt.reference + '.'
      : 'Open your saved CVs using the secure link below.'
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from, to: customer.email, subject: receipt ? 'Your RemarkableCV receipt and access link' : 'Your secure RemarkableCV access link',
      html: '<p>' + escapeHtml(intro) + '</p><p><a href="' + escapeHtml(url.toString()) + '">Open My CVs</a></p><p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>',
      text: intro + '\n\nOpen My CVs: ' + url.toString() + '\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.',
    })
    if (result.error) throw new Error('Email delivery failed.')
  } catch (error) {
    await supabaseAdmin.from('customer_access_links').delete().eq('token_hash', tokenHash)
    await supabaseAdmin.from('customer_send_limits').delete().eq('bucket', bucket)
    throw error
  }
}
