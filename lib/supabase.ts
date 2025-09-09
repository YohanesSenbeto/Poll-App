import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from './auth-config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create client with extended session configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'poll-app-auth',
    // Extended session duration - 30 days
    expiresIn: 60 * 60 * 24 * 30,
  },
  global: {
    headers: {
      'x-application-name': 'poll-app',
    },
  },
})

export { createClient }
