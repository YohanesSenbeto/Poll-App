-- Admin System Database Schema
-- This adds admin roles and permissions to the existing poll app

-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- Create admin users table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('create_poll', 'delete_poll', 'delete_user', 'update_user', 'view_analytics')),
    target_id UUID,
    target_type TEXT CHECK (target_type IN ('poll', 'user', 'vote')),
    action_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin analytics view
CREATE OR REPLACE VIEW public.admin_analytics AS
SELECT 
    COUNT(DISTINCT p.id) as total_polls,
    COUNT(DISTINCT v.id) as total_votes,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT p.user_id) as active_poll_creators,
    AVG(CASE WHEN v.id IS NOT NULL THEN 1 ELSE 0 END) as avg_votes_per_poll,
    MAX(p.created_at) as latest_poll,
    MAX(v.created_at) as latest_vote
FROM public.polls p
LEFT JOIN public.votes v ON p.id = v.poll_id
LEFT JOIN auth.users u ON p.user_id = u.id;

-- Create user polls view for admin dashboard (FIXED: changed o.option_text to o.text)
CREATE OR REPLACE VIEW public.user_polls_detailed AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.created_at,
    p.updated_at,
    p.user_id as created_by,
    pr.email as creator_email,
    pr.username as creator_username,
    pr.role as creator_role,
    COUNT(DISTINCT v.id) as vote_count,
    COUNT(DISTINCT o.id) as option_count,
    jsonb_agg(
        jsonb_build_object(
            'option_text', o.text, -- Changed from o.option_text to o.text
            'vote_count', COALESCE(vo.votes, 0)
        )
    ) as options_with_votes
FROM public.polls p
LEFT JOIN public.profiles pr ON p.user_id = pr.id
LEFT JOIN public.options o ON p.id = o.poll_id
LEFT JOIN public.votes v ON p.id = v.poll_id
LEFT JOIN (
    SELECT o2.id as option_id, o2.poll_id, COUNT(v2.id) as votes
    FROM public.options o2
    LEFT JOIN public.votes v2 ON o2.id = v2.option_id
    GROUP BY o2.id, o2.poll_id
) vo ON o.id = vo.option_id AND o.poll_id = vo.poll_id
GROUP BY p.id, p.title, p.description, p.created_at, p.updated_at, p.user_id, pr.email, pr.username, pr.role;

-- Enable RLS on admin_actions table
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Admin RLS Policies
-- Allow admins to view all admin actions
CREATE POLICY "Admins can view admin actions" ON public.admin_actions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Allow admins to create admin actions
CREATE POLICY "Admins can create admin actions" ON public.admin_actions
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Update existing RLS policies to allow admin access
-- Allow admins to view all polls
DROP POLICY IF EXISTS "Users can view active polls" ON public.polls;
CREATE POLICY "Users and admins can view polls" ON public.polls
    FOR SELECT USING (
        is_active = true OR 
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Allow admins to view all votes
DROP POLICY IF EXISTS "Users can view votes for visible polls" ON public.votes;
CREATE POLICY "Users and admins can view votes" ON public.votes
    FOR SELECT USING (
        poll_id IN (
            SELECT id FROM public.polls 
            WHERE is_active = true OR 
                  user_id = auth.uid() OR
                  auth.uid() IN (
                      SELECT id FROM public.profiles WHERE role = 'admin'
                  )
        )
    );

-- Allow admins to view all user profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles
    FOR SELECT USING (true);

-- Allow admins to update any user profile
CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Create function to promote user to admin (for initial setup)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    IF auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin') THEN
        UPDATE public.profiles 
        SET role = 'admin', updated_at = NOW()
        WHERE id = target_user_id;
        
        INSERT INTO public.admin_actions (admin_id, action_type, target_id, target_type, action_details)
        VALUES (auth.uid(), 'update_user', target_user_id, 'user', jsonb_build_object('role_change', 'user_to_admin'));
    ELSE
        RAISE EXCEPTION 'Insufficient permissions to promote user to admin';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(UUID) TO authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);