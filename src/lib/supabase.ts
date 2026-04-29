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

// Admin client — for API routes only (server-side)
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || supabaseAnonKey || 'placeholder'
)
