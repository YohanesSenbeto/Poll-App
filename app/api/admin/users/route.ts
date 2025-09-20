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

    // Ensure caller is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
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
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}