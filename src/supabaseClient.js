import { createClient } from '@supabase/supabase-js'

// Use fallback placeholder values if VITE_SUPABASE_URL is missing to prevent startup crashes.
// When placeholders are used, API calls will fail gracefully in try/catch rather than killing the React app.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-vtdekjpgyevulnzhoifh.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholderAnonKey"

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "WARNING: Supabase credentials (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY) are missing in the environment. " +
    "The app will render in demo/diagnostic mode, but database connections will require valid credentials."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
