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
        storage: typeof window !== 'undefined' ? {
          getItem: (key: string) => {
            if (typeof window !== 'undefined') {
              // Try localStorage first, then cookies as fallback
              const localStorageValue = window.localStorage.getItem(key);
              if (localStorageValue) {
                // Also ensure it's in cookies for server access
                document.cookie = `${key}=${encodeURIComponent(localStorageValue)}; path=/; max-age=31536000; SameSite=Lax`;
                return localStorageValue;
              }
              
              // Fallback to cookies
              const cookies = document.cookie.split(';');
              for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === key) return decodeURIComponent(value);
              }
            }
            return null;
          },
          setItem: (key: string, value: string) => {
            if (typeof window !== 'undefined') {
              // Store in both localStorage and cookies
              window.localStorage.setItem(key, value);
              document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
            }
          },
          removeItem: (key: string) => {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(key);
              document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            }
          }
        } : undefined,
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
