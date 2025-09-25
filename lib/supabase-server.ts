import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()
  
  console.log('Server client: Environment check:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
  });
  
  // Get all cookies for debugging
  const allCookies = await cookieStore.getAll();
  console.log('Server client: Available cookies:', allCookies.map((c: any) => ({ 
    name: c.name, 
    hasValue: !!c.value,
    valueLength: c.value?.length || 0 
  })));
  
  // Look for our custom session cookie
  const sessionCookie = await cookieStore.get('poll-app-auth');
  let sessionData = null;
  
  if (sessionCookie?.value) {
    try {
      sessionData = JSON.parse(decodeURIComponent(sessionCookie.value));
      console.log('Server client: Found session data:', {
        hasAccessToken: !!sessionData.access_token,
        hasRefreshToken: !!sessionData.refresh_token,
        userId: sessionData.user?.id,
        userEmail: sessionData.user?.email
      });
    } catch (parseError) {
      console.error('Server client: Failed to parse session cookie:', parseError);
    }
  }
  
  const client = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => {
          // Try the exact cookie name first
          let value = (await cookieStore.get(name))?.value;
          
          // If not found, try common Supabase cookie names
          if (!value) {
            const commonNames = [
              'poll-app-auth',
              'sb-access-token',
              'sb-refresh-token',
              'supabase-auth-token'
            ];
            
            for (const cookieName of commonNames) {
              const cookie = await cookieStore.get(cookieName);
              if (cookie?.value) {
                console.log(`Server client: Found auth cookie ${cookieName}`);
                return cookie.value;
              }
            }
          }
          
          console.log(`Server client: Getting cookie ${name}:`, !!value);
          return value;
        },
        set: async (name: string, value: string, options: any) => {
          console.log(`Server client: Setting cookie ${name}`);
          await cookieStore.set({ name, value, ...options });
        },
        remove: async (name: string, options: any) => {
          console.log(`Server client: Removing cookie ${name}`);
          await cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
  
  // If we have session data, set it on the client
  if (sessionData && sessionData.access_token) {
    try {
      await client.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token
      });
      console.log('Server client: Session set successfully');
    } catch (sessionError) {
      console.error('Server client: Failed to set session:', sessionError);
    }
  }
  
  console.log('Server client: Created successfully');
  return client;
}
