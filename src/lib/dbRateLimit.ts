import 'server-only'
import { supabaseAdmin } from './supabase'
import { digest } from './customerAuth'

// A limit that holds across every serverless instance, because the counter
// lives in the database (the same table the free-preview cap uses) rather than
// in each instance's memory. For abuse throttling, not accounting: the count is
// read then written, so two simultaneous requests can both slip under the line
// by one, and a database hiccup lets the request through rather than block a
// real customer.
export async function takeFromBucket(key: string, max: number, windowSec: number): Promise<boolean> {
  const bucket = 'rl:' + digest(key)
  try {
    const { data: row } = await supabaseAdmin.from('customer_generation_usage')
      .select('cv_uses, window_start').eq('bucket', bucket).maybeSingle()
    const fresh = !row || Date.now() - new Date(row.window_start).getTime() > windowSec * 1000
    if (fresh) {
      await supabaseAdmin.from('customer_generation_usage')
        .upsert({ bucket, cv_uses: 1, cl_uses: 0, window_start: new Date().toISOString() })
      return true
    }
    if (row.cv_uses >= max) return false
    await supabaseAdmin.from('customer_generation_usage').update({ cv_uses: row.cv_uses + 1 }).eq('bucket', bucket)
    return true
  } catch (error) {
    console.error('dbRateLimit failed open:', error)
    return true
  }
}
