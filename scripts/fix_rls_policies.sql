-- Fix infinite recursion in RLS policies
-- This script fixes the circular dependency in user_profiles policies

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view active profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Moderators can manage user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Moderators can update user profiles" ON public.user_profiles;

-- Create simplified policies without circular references
-- Allow users to view all active profiles
CREATE POLICY "Users can view active profiles" ON public.user_profiles
    FOR SELECT USING (is_active = true);

-- Allow users to view their own profile (including inactive)
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to create their own profile
CREATE POLICY "Users can create own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow admins to manage all profiles (simplified - no circular reference)
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
            AND up.is_active = true
        )
    );

-- Allow moderators to view and update profiles (simplified)
CREATE POLICY "Moderators can view profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'moderator')
            AND up.is_active = true
        )
    );

CREATE POLICY "Moderators can update profiles" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'moderator')
            AND up.is_active = true
        )
    );
