import { createBrowserClient } from '@supabase/ssr'

// GoTrue is used only as a disposable OAuth broker (see google/callback route) —
// this client never needs to persist a Supabase Auth session of its own.
export const supabaseBrowser = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
