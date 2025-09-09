// Extended authentication configuration for long session duration
export const AUTH_CONFIG = {
  // Extend session expiration to 30 days (instead of default 1 hour)
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    refreshTokenRotationEnabled: true,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  
  // Cookie settings for extended sessions
  cookies: {
    name: 'sb-access-token',
    lifetime: 60 * 60 * 24 * 30, // 30 days
    domain: '',
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },

  // Refresh token settings
  refreshToken: {
    lifetime: 60 * 60 * 24 * 30, // 30 days
    autoRefreshBeforeExpiration: 60 * 60 * 24, // Refresh 1 day before expiration
  }
};

// Extended Supabase client configuration
export const SUPABASE_CONFIG = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'poll-app-auth',
    // Extended session duration
    expiresIn: 60 * 60 * 24 * 30, // 30 days
  }
};