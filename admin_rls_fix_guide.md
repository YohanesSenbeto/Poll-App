# Admin RLS Fix Guide

## Issue
The admin dashboard cannot display all users (including jose@gmail.com) due to restrictive RLS policies on the `auth.users` table.

## Solution
Update RLS policies to allow admin users to view all user data while maintaining security.

## Steps to Fix

### 1. Connect to Supabase
```bash
# Using Supabase CLI
supabase db reset
supabase db reset --linked

# Or use SQL editor in Supabase dashboard
```

### 2. Run RLS Policy Updates
Execute the SQL commands in `fix_auth_rls_for_admin.sql`:

```sql
-- Update RLS policies for auth.users table

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only view own data" ON auth.users;
DROP POLICY IF EXISTS "Users can only update own data" ON auth.users;

-- Create new admin-friendly policies
CREATE POLICY "Allow admin users to view all users" ON auth.users
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 
            FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can update own data" ON auth.users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;

-- Ensure jose@gmail.com has admin role
INSERT INTO public.profiles (id, email, username, role, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(split_part(email, '@', 1), 'user') as username,
    'admin' as role,
    created_at,
    now()
FROM auth.users 
WHERE email = 'jose@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', updated_at = now();
```

### 3. Verify the Fix
After running the SQL commands, verify that:

1. **Admin users can see all users** in the dashboard
2. **jose@gmail.com appears in the users list** with admin privileges
3. **Regular users can only see their own data**

### 4. Test the Dashboard
Refresh the admin dashboard and check:
- Total users count is accurate
- All user emails are visible
- User statistics are correct

## Alternative Approach (If RLS Issues Persist)

If the above doesn't work, create a server-side API route:

```typescript
// app/api/admin/users/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  // ... (server-side user fetching logic)
}
```

## Security Notes
- Never expose service role keys client-side
- Always verify admin permissions server-side
- Keep RLS policies restrictive for non-admin users
- Regularly audit admin access