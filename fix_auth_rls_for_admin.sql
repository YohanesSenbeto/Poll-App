-- Update RLS policies for auth.users table to allow admin access
-- This will enable the admin dashboard to display all users including jose@gmail.com

-- First, check current policies
SELECT * FROM pg_policies WHERE schemaname = 'auth' AND tablename = 'users';

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can only view own data" ON auth.users;
DROP POLICY IF EXISTS "Users can only update own data" ON auth.users;

-- Create new policies that allow admin users to view all users
-- Policy for SELECT: Allow admin users to view all user data
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

-- Policy for UPDATE: Users can only update their own data
CREATE POLICY "Users can update own data" ON auth.users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to the anon and authenticated roles
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;

-- Ensure the profiles table has the admin role column and jose@gmail.com is set as admin
-- Check if jose@gmail.com exists and has admin role
SELECT 
    au.id,
    au.email,
    p.role,
    p.username
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'jose@gmail.com';

-- If jose@gmail.com doesn't have a profile or isn't admin, create/update it
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

-- Verify the policy works for admin users
-- This query should return all users when executed by an admin
SELECT * FROM auth.users LIMIT 10;