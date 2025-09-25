import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from './auth-config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton pattern to prevent multiple client instances
let supabaseInstance: ReturnType<typeof createClient> | null = null

// Create client with extended session configuration
export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'poll-app-auth',
      },
      global: {
        headers: {
          'x-application-name': 'poll-app',
        },
      },
    })
  }
  return supabaseInstance
})()

export { createClient }
