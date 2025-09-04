import { createClient } from '@supabase/supabase-js';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Types for admin system
export type UserRole = 'user' | 'admin' | 'moderator';

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  username?: string;
  created_at: string;
}

// Create admin client with elevated permissions
function getAdminClient() {
  return createClient(supabaseUrl, supabaseKey);
}

// Check if user has admin role by testing database access
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = getAdminClient();
    
    // Simple admin detection: check if user can access polls table without restrictions
    const { data, error } = await supabase
      .from('polls')
      .select('id')
      .limit(1);

    // If we can access polls without error, consider this admin access
    return !error;
  } catch (error) {
    console.error('Exception checking admin status:', error);
    return false;
  }
}

// Get current admin user with role (simplified without profiles)
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  try {
    const supabase = getAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Return basic user info without profiles table
    return {
      id: user.id,
      email: user.email || '',
      role: (await isAdmin(user.id)) ? 'admin' : 'user',
      created_at: user.created_at || new Date().toISOString()
    } as AdminUser;
  } catch (error) {
    console.error('Exception fetching admin user:', error);
    return null;
  }
}

// Admin middleware for protecting admin routes
export async function adminMiddleware(request: NextRequest) {
  try {
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createMiddlewareClient({ req: request, res: response });
    const { data: { session } } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user is admin
    const isUserAdmin = await isAdmin(session.user.id);
    if (!isUserAdmin) {
      // Redirect non-admins to home page
      return NextResponse.redirect(new URL('/', request.url));
    }

    return response;
  } catch (error) {
    console.error('Admin middleware error:', error);
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

// Log admin actions for audit trail
export async function logAdminAction(
  adminId: string,
  actionType: string,
  targetId?: string,
  targetType?: string,
  actionDetails?: any
) {
  try {
    const supabase = getAdminClient();
    
    const { error } = await supabase
      .from('admin_actions')
      .insert({
        admin_id: adminId,
        action_type: actionType,
        target_id: targetId,
        target_type: targetType,
        action_details: actionDetails || {}
      });

    if (error) {
      console.error('Error logging admin action:', error);
    }
  } catch (error) {
    console.error('Exception logging admin action:', error);
  }
}

// Admin API route handler wrapper
export function withAdminAuth(handler: Function) {
  return async (req: Request, ...args: any[]) => {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const isUserAdmin = await isAdmin(user.id);
      if (!isUserAdmin) {
        return new Response('Forbidden: Admin access required', { status: 403 });
      }

      return handler(req, user, ...args);
    } catch (error) {
      console.error('Admin auth wrapper error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  };
}

// Get admin analytics
export async function getAdminAnalytics() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('admin_analytics')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching admin analytics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching admin analytics:', error);
    return null;
  }
}

// Get all polls for admin dashboard (simplified without user_polls_detailed view)
export async function getAllPollsForAdmin() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('polls')
      .select(`*, options(*)`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all polls for admin:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching all polls for admin:', error);
    return [];
  }
}

// Delete poll as admin
export async function deletePollAsAdmin(adminId: string, pollId: string) {
  try {
    const supabase = getAdminClient();

    // Start transaction-like operation
    const { error: deleteVotes } = await supabase
      .from('votes')
      .delete()
      .eq('poll_id', pollId);

    if (deleteVotes) throw deleteVotes;

    const { error: deleteOptions } = await supabase
      .from('options')
      .delete()
      .eq('poll_id', pollId);

    if (deleteOptions) throw deleteOptions;

    const { error: deletePoll } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);

    if (deletePoll) throw deletePoll;

    // Log the action
    await logAdminAction(adminId, 'delete_poll', pollId, 'poll');

    return { success: true };
  } catch (error) {
    console.error('Error deleting poll as admin:', error);
    return { success: false, error };
  }
}