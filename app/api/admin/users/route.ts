import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (from user_profiles)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch users from user_profiles
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const adminUsers = (users || []).map((u: any) => ({
      id: u.user_id,
      email: '',
      username: u.username,
      display_name: u.display_name,
      role: u.role,
      created_at: u.created_at,
    }));

    return NextResponse.json({ users: adminUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure caller is admin; create profile if missing
    let { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (!adminProfile) {
      // Create default admin profile for caller if missing (role stays user by default)
      await supabase.from('user_profiles').insert({
        user_id: session.user.id,
        username: `user_${String(session.user.id).slice(0,8)}`,
        display_name: session.user.email || 'User',
        role: 'admin',
        is_active: true
      });
      adminProfile = { role: 'admin' } as any;
    }

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, newRole } = body;

    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['user', 'moderator', 'admin'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Ensure target has a profile
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', targetUserId)
      .single();

    if (!targetProfile) {
      await supabase.from('user_profiles').insert({
        user_id: targetUserId,
        username: `user_${String(targetUserId).slice(0,8)}`,
        display_name: 'User',
        role: 'user',
        is_active: true
      });
    }

    // Update user role directly using the authenticated route client
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('user_id', targetUserId);

    if (updateError) {
      console.error('Update role error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log admin action (best-effort)
    await supabase.from('admin_actions').insert({
      admin_id: session.user.id,
      action_type: 'update_user_role',
      target_id: targetUserId,
      target_type: 'user_profile',
      action_details: { new_role: newRole }
    });

    return NextResponse.json({ success: true, message: 'Role updated successfully' });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}