import { createClient } from '@/lib/supabase';

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  
  return user;
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

export function getAuthRedirectUrl(pathname: string): string {
  const params = new URLSearchParams();
  params.set('redirectTo', pathname);
  return `/auth/login?${params.toString()}`;
}

export function getAuthNotificationMessage(pathname: string): {
  type: 'warning' | 'error';
  title: string;
  message: string;
} {
  return {
    type: 'warning',
    title: 'Authentication Required',
    message: 'Please register or login to access this feature.',
  };
}