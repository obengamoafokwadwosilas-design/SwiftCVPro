import { createClient } from '@supabase/supabase-js'

// Support both NEXT_PUBLIC_ and non-prefixed variants
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''

// Public client — for frontend use
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// True only when a real service-role key is configured. The admin client can
// read/write RLS-protected tables (payments, cv_credits, …) ONLY with this key.
export const hasServiceKey = Boolean(supabaseUrl && supabaseServiceKey)

// Admin client — for API routes only (server-side).
//
// Critical: this must NEVER fall back to the anon key. Every table has RLS
// `using (false)`, so the anon key is blocked from every read and write — but
// silently, surfacing as confusing empty reads and "Failed to credit" 500s
// rather than a clear misconfiguration. (That fallback is exactly what once
// hid a missing SUPABASE_SERVICE_ROLE_KEY and made payments fail to credit.)
// So: if the service key is absent we log loudly and hand back a client that
// throws a clear error the moment anything touches the database.
const makeAdmin = () => createClient(supabaseUrl, supabaseServiceKey)
type AdminClient = ReturnType<typeof makeAdmin>

export const supabaseAdmin: AdminClient = hasServiceKey
  ? makeAdmin()
  : (() => {
      const msg =
        'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_URL) is not set. Admin database ' +
        'operations — credits, payments, CV history, PINs — are disabled. Set it ' +
        'in your environment (Vercel → Settings → Environment Variables) and redeploy.'
      console.error('[supabase] ' + msg)
      return new Proxy({} as AdminClient, {
        get() { throw new Error('[supabase] ' + msg) },
      })
    })()
