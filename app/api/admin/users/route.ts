import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role using profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service role key to fetch all users (bypasses RLS)
    const { createClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch users from auth.users
    const { data: authUsers, error: usersError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, created_at, email_confirmed_at')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Fetch corresponding profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, role, created_at, updated_at')

    // Combine user data
    const users = authUsers.map(user => {
      const profile = profiles?.find(p => p.id === user.id)
      return {
        id: user.id,
        email: user.email || 'unknown@example.com',
        username: profile?.username || user.email?.split('@')[0] || 'user',
        role: profile?.role || (user.email === 'jose@gmail.com' ? 'admin' : 'user'),
        created_at: user.created_at,
        updated_at: profile?.updated_at || user.created_at,
        email_confirmed: !!user.email_confirmed_at,
        polls_count: 0,
        votes_count: 0
      }
    })

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}