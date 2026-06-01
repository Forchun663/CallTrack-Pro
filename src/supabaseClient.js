import { createClient } from '@supabase/supabase-js'

// Default fallback values using your exact Supabase credentials.
// This ensures that when the app is built in the cloud (e.g. GitHub Actions, Vercel)
// where .env.local is ignored for security, it will still connect to your database perfectly.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vtdekjpgyevulnzhoifh.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_NM1enl680o0HgolPmKraEg_9swcfWQL"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
