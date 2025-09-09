-- Fix existing RLS policies for admin dashboard
-- This script handles existing policies gracefully

-- Step 1: Check existing policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Step 2: Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Step 3: Create fresh policies
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

-- Step 4: Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Step 5: Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Sync users from auth.users to profiles (skip conflicts)
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
SET 
    email = EXCLUDED.email,
    username = COALESCE(split_part(EXCLUDED.email, '@', 1), username),
    role = CASE 
        WHEN EXCLUDED.email = 'jose@gmail.com' THEN 'admin'
        ELSE public.profiles.role 
    END,
    updated_at = now();

-- Step 7: Ensure jose@gmail.com has admin role
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE email = 'jose@gmail.com';

-- Step 8: Check auth.users policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'auth' AND tablename = 'users';

-- Step 9: Update auth.users policies for admin access
DROP POLICY IF EXISTS "Allow admin users to view all users" ON auth.users;
DROP POLICY IF EXISTS "Users can only view own data" ON auth.users;
DROP POLICY IF EXISTS "Users can only update own data" ON auth.users;

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

-- Step 10: Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Step 11: Verify the fix
SELECT 
    au.id,
    au.email,
    au.created_at,
    p.role,
    p.username
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;