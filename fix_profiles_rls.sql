-- Fix infinite recursion in profiles RLS policies
-- This script resolves the infinite recursion issue in profiles table policies

-- First, disable RLS temporarily to diagnose
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simplified, non-recursive policies

-- Policy 1: Allow all authenticated users to view all profiles
CREATE POLICY "Allow authenticated users to view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- Policy 2: Allow users to update their own profile
CREATE POLICY "Allow users to update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Policy 3: Allow users to insert their own profile
CREATE POLICY "Allow users to insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Policy 4: Allow service role to manage all profiles (for admin operations)
CREATE POLICY "Service role can manage all profiles" 
ON public.profiles 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Verify the fix
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;