-- Fix infinite recursion in RLS policies for profiles table
-- This script addresses the "infinite recursion detected in policy for relation 'profiles'" error

-- Step 1: Temporarily disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on profiles table to eliminate recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;

-- Step 3: Re-enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simplified, non-recursive policies

-- Policy 1: Allow users to view all profiles (simplified to avoid recursion)
CREATE POLICY "Allow profile viewing" ON public.profiles
    FOR SELECT USING (true);

-- Policy 2: Allow users to update only their own profile
CREATE POLICY "Allow own profile updates" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy 3: Allow users to insert their own profile
CREATE POLICY "Allow own profile insertion" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 4: Allow service role to do anything (for admin operations)
CREATE POLICY "Service role full access" ON public.profiles
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Step 5: Create a simple function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct check without subquery to avoid recursion
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = user_uuid 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 6: Grant necessary permissions
GRANT SELECT ON public.profiles TO authenticated, anon;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;

-- Step 7: Create a view for polls that doesn't involve profiles to avoid the issue entirely
CREATE OR REPLACE VIEW public.polls_basic_view AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.is_active,
    p.created_at,
    p.updated_at,
    p.user_id
FROM public.polls p
WHERE p.is_active = true;

-- Step 8: Create a function to get poll data without profile joins
CREATE OR REPLACE FUNCTION public.get_polls_without_profiles()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    options JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.description,
        p.is_active,
        p.created_at,
        p.updated_at,
        p.user_id,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', o.id,
                    'text', o.text,
                    'poll_id', o.poll_id,
                    'votes_count', COALESCE(v.vote_count, 0)
                )
            ) FILTER (WHERE o.id IS NOT NULL), 
            '[]'::jsonb
        ) as options
    FROM public.polls p
    LEFT JOIN public.options o ON o.poll_id = p.id
    LEFT JOIN (
        SELECT option_id, COUNT(*) as vote_count
        FROM public.votes
        GROUP BY option_id
    ) v ON v.option_id = o.id
    WHERE p.is_active = true
    GROUP BY p.id, p.title, p.description, p.is_active, p.created_at, p.updated_at, p.user_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 9: Grant permissions on the function
GRANT EXECUTE ON FUNCTION public.get_polls_without_profiles() TO authenticated, anon;

-- Step 10: Test the fix
SELECT public.get_polls_without_profiles();