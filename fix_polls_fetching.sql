-- Fix for "Error fetching polls" issue
-- This script creates all missing views and ensures proper RLS policies

-- Drop existing poll_statistics view to avoid column conflicts
DROP VIEW IF EXISTS public.poll_statistics CASCADE;

-- Create poll_statistics view with consistent column structure
CREATE OR REPLACE VIEW public.poll_statistics AS
SELECT 
    p.id as poll_id,
    p.title,
    p.description,
    p.user_id,
    p.is_active,
    p.created_at,
    COUNT(DISTINCT o.id) as option_count,
    COUNT(DISTINCT v.user_id) as total_votes
FROM public.polls p
LEFT JOIN public.options o ON p.id = o.poll_id
LEFT JOIN public.votes v ON p.id = v.poll_id
GROUP BY p.id, p.title, p.description, p.user_id, p.is_active, p.created_at;

-- Drop existing user_polls_detailed view to avoid conflicts
DROP VIEW IF EXISTS public.user_polls_detailed CASCADE;

-- Create user_polls_detailed view for admin and user dashboards
CREATE OR REPLACE VIEW public.user_polls_detailed AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.user_id,
    p.is_active,
    p.created_at,
    p.updated_at,
    COALESCE(u.email, 'Unknown User') as user_email,
    COUNT(DISTINCT o.id) as option_count,
    COUNT(DISTINCT v.user_id) as total_votes,
    COUNT(DISTINCT v.id) as total_votes_count,
    CASE 
        WHEN COUNT(DISTINCT v.user_id) > 0 THEN 'Voted'
        ELSE 'No Votes'
    END as status
FROM public.polls p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN public.options o ON p.id = o.poll_id
LEFT JOIN public.votes v ON p.id = v.poll_id
GROUP BY p.id, p.title, p.description, p.user_id, p.is_active, p.created_at, p.updated_at, u.email
ORDER BY p.created_at DESC;

-- Ensure RLS policies allow reading polls
-- These policies should already exist but we'll ensure they're correct

-- Allow users to view all active polls
DROP POLICY IF EXISTS "Users can view active polls" ON public.polls;
CREATE POLICY "Users can view active polls" ON public.polls
    FOR SELECT USING (is_active = true);

-- Allow users to view their own polls (including inactive)
DROP POLICY IF EXISTS "Users can view own polls" ON public.polls;
CREATE POLICY "Users can view own polls" ON public.polls
    FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions for views
GRANT SELECT ON public.poll_statistics TO anon, authenticated;
GRANT SELECT ON public.user_polls_detailed TO anon, authenticated;

-- Drop existing polls_with_counts view to avoid conflicts
DROP VIEW IF EXISTS public.polls_with_counts CASCADE;

-- Create a simple polls_with_counts view for basic fetching
CREATE OR REPLACE VIEW public.polls_with_counts AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.user_id,
    p.is_active,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT o.id) as options_count,
    COUNT(DISTINCT v.user_id) as votes_count
FROM public.polls p
LEFT JOIN public.options o ON p.id = o.poll_id
LEFT JOIN public.votes v ON p.id = v.poll_id
GROUP BY p.id, p.title, p.description, p.user_id, p.is_active, p.created_at, p.updated_at;