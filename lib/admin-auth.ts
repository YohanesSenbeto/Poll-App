import { createClient } from '@supabase/supabase-js';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Enhanced types for role management system
export type UserRole = 'user' | 'admin' | 'moderator';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  username?: string;
  display_name?: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permission: string;
  resource: string;
  action: string;
  created_at: string;
}

// Create admin client with elevated permissions
function getAdminClient() {
  return createClient(supabaseUrl, supabaseKey);
}

// Enhanced role checking functions
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .rpc('get_user_role', { user_uuid: userId });

    if (error) {
      console.error('Error getting user role:', error);
      return 'user';
    }

    return data || 'user';
  } catch (error) {
    console.error('Exception getting user role:', error);
    return 'user';
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

export async function isModerator(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'moderator' || role === 'admin';
}

export async function hasPermission(
  userId: string,
  permission: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .rpc('user_has_permission', {
        user_uuid: userId,
        permission_name: permission,
        resource_name: resource,
        action_name: action
      });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Exception checking permission:', error);
    return false;
  }
}

// Get current user with enhanced profile information
export async function getCurrentUser(): Promise<AdminUser | null> {
  try {
    const supabase = getAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Get user profile with role information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Return basic user info if profile doesn't exist
      return {
        id: user.id,
        email: user.email || '',
        role: 'user',
        created_at: user.created_at || new Date().toISOString()
      } as AdminUser;
    }

    return {
      id: user.id,
      email: user.email || '',
      role: profile.role,
      username: profile.username,
      display_name: profile.display_name,
      created_at: user.created_at || new Date().toISOString()
    } as AdminUser;
  } catch (error) {
    console.error('Exception fetching current user:', error);
    return null;
  }
}

// Legacy function for backward compatibility
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  return getCurrentUser();
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

// Role management functions
export async function updateUserRole(
  adminId: string,
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient();
    
    // Check if admin has permission to manage roles
    const hasPermission = await hasPermission(adminId, 'roles', 'user_roles', 'manage');
    if (!hasPermission) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Update user role
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: error.message };
    }

    // Log the action
    await logAdminAction(adminId, 'update_user_role', targetUserId, 'user_profile', {
      new_role: newRole
    });

    return { success: true };
  } catch (error) {
    console.error('Exception updating user role:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function getAllUsers(): Promise<AdminUser[]> {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        auth_users:user_id (
          email,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data?.map(profile => ({
      id: profile.user_id,
      email: profile.auth_users?.email || 'unknown@example.com',
      role: profile.role,
      username: profile.username,
      display_name: profile.display_name,
      created_at: profile.auth_users?.created_at || profile.created_at
    })) || [];
  } catch (error) {
    console.error('Exception fetching users:', error);
    return [];
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching user profile:', error);
    return null;
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

// Log moderator actions for audit trail
export async function logModeratorAction(
  moderatorId: string,
  actionType: string,
  targetId?: string,
  targetType?: string,
  actionDetails?: any
) {
  try {
    const supabase = getAdminClient();
    
    const { error } = await supabase
      .from('moderator_actions')
      .insert({
        moderator_id: moderatorId,
        action_type: actionType,
        target_id: targetId,
        target_type: targetType,
        action_details: actionDetails || {}
      });

    if (error) {
      console.error('Error logging moderator action:', error);
    }
  } catch (error) {
    console.error('Exception logging moderator action:', error);
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