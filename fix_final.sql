-- Final fix for RLS policies and user display issues
-- This script resolves all conflicts and ambiguities

-- Step 1: Check existing setup
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Step 2: Drop all conflicting policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin users to view all users" ON auth.users;
DROP POLICY IF EXISTS "Users can only view own data" ON auth.users;
DROP POLICY IF EXISTS "Users can only update own data" ON auth.users;

-- Step 3: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Step 4: Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create fresh policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM public.profiles AS p_check
            WHERE p_check.id = auth.uid() 
            AND p_check.role = 'admin'
        )
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Step 6: Sync users from auth.users to profiles (fixed version)
INSERT INTO public.profiles (id, email, username, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(split_part(au.email, '@', 1), 'user') as username,
    CASE 
        WHEN au.email = 'jose@gmail.com' THEN 'admin'
        ELSE 'user' 
    END as role,
    au.created_at,
    now()
FROM auth.users au
WHERE au.email IS NOT NULL
ON CONFLICT (id) DO UPDATE 
SET 
    email = EXCLUDED.email,
    username = COALESCE(split_part(EXCLUDED.email, '@', 1), public.profiles.username),
    role = CASE 
        WHEN EXCLUDED.email = 'jose@gmail.com' THEN 'admin'
        ELSE public.profiles.role 
    END,
    updated_at = now();

-- Step 7: Ensure jose@gmail.com has admin role
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE email = 'jose@gmail.com';

-- Step 8: Update auth.users policies for admin access
CREATE POLICY "Allow admin users to view all users" ON auth.users
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 
            FROM public.profiles AS p_admin
            WHERE p_admin.id = auth.uid() 
            AND p_admin.role = 'admin'
        )
    );

-- Step 9: Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Step 10: Verify everything is working
SELECT 
    au.id,
    au.email,
    au.created_at,
    p.role,
    COALESCE(p.username, split_part(au.email, '@', 1)) as username
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;