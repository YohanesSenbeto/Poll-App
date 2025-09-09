-- Apply RLS fixes for admin dashboard to show all users
-- Run this in your Supabase SQL editor

-- Step 1: Check if profiles table exists and has admin role
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Step 2: Create RLS policies for profiles table if they don't exist
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow admin users to view all profiles
CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Step 3: Update auth.users RLS policies for admin access
-- First, check current policies
SELECT schemaname, tablename, policyname, cmd, permissive, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'auth' AND tablename = 'users';

-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can only view own data" ON auth.users;
DROP POLICY IF EXISTS "Users can only update own data" ON auth.users;

-- Create admin-friendly policies
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

-- Step 4: Sync existing auth.users to profiles
INSERT INTO public.profiles (id, email, username, role, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(split_part(email, '@', 1), 'user') as username,
    CASE 
        WHEN email = 'jose@gmail.com' THEN 'admin'
        ELSE 'user' 
    END as role,
    created_at,
    now()
FROM auth.users 
WHERE email IS NOT NULL
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email,
    username = COALESCE(split_part(EXCLUDED.email, '@', 1), 'user'),
    role = CASE 
        WHEN EXCLUDED.email = 'jose@gmail.com' THEN 'admin'
        ELSE public.profiles.role 
    END,
    updated_at = now();

-- Step 5: Ensure jose@gmail.com has admin role (if exists)
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE email = 'jose@gmail.com';

-- Step 6: Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Step 7: Verify the fix
-- This should show all users when run by an admin
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    p.role,
    p.username
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- Step 8: Test admin access
-- Run this query to verify admin can access all users
SELECT COUNT(*) as total_users FROM auth.users;