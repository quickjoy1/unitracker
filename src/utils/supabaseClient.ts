import { createClient } from '@supabase/supabase-js'

const env = import.meta.env as Record<string, string | undefined>

// Without Supabase keys the app runs fully offline in local mode (data lives in
// the browser). Placeholder values keep createClient from throwing at startup.
export const isSupabaseConfigured = Boolean(env['VITE_SUPABASE_URL'] && env['VITE_SUPABASE_ANON_KEY'])
const supabaseUrl = env['VITE_SUPABASE_URL'] || 'http://localhost:54321'
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'] || 'local-mode-placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  }
})
