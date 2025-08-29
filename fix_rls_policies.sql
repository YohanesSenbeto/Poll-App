-- Fix RLS Policies for Profile Updates
-- This addresses the "new row violates row-level security policy" error

-- First, let's check current policies
-- Run this in Supabase SQL editor to see existing policies:
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create properly configured policies with correct roles
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated, anon
    USING (true);

-- Additional policy to ensure users can always read their own profile
-- Note: CREATE POLICY IF NOT EXISTS is not supported in PostgreSQL
-- We need to check if it exists first
DO $$\BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can read own profile'
    ) THEN
        CREATE POLICY "Users can read own profile" ON public.profiles
            FOR SELECT TO authenticated
            USING (auth.uid() = id);
    END IF;
END$$;

-- Grant explicit permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Test the policies with these queries:
-- SELECT * FROM public.profiles WHERE id = auth.uid();
-- UPDATE public.profiles SET avatar_url = 'test.jpg' WHERE id = auth.uid();

-- If issues persist, temporarily disable RLS for testing:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable RLS:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;