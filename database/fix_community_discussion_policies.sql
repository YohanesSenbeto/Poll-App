-- =====================================================
-- FIX RLS POLICIES FOR COMMUNITY DISCUSSION
-- =====================================================
-- Run this in Supabase SQL Editor to fix community discussion
-- =====================================================

-- 1. DROP EXISTING RESTRICTIVE POLICIES
-- =====================================================

-- Drop the restrictive comment creation policy
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;

-- Drop the restrictive comment votes policy  
DROP POLICY IF EXISTS "Authenticated users can vote on comments" ON public.comment_votes;

-- Drop the restrictive comment votes view policy
DROP POLICY IF EXISTS "Users can view votes for visible comments" ON public.comment_votes;

-- 2. CREATE NEW FLEXIBLE POLICIES
-- =====================================================

-- New comment creation policy that allows community discussion (poll_id = null)
CREATE POLICY "Users can create comments anywhere" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            -- Allow community discussion (poll_id = null)
            poll_id IS NULL OR
            -- Allow comments on active polls
            poll_id IN (
                SELECT polls.id 
                FROM polls 
                WHERE polls.is_active = true
            )
        )
    );

-- New comment votes policy that allows voting ONLY on reply comments (parent_id IS NOT NULL)
CREATE POLICY "Users can vote only on reply comments" ON public.comment_votes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        comment_id IN (
            SELECT comments.id 
            FROM comments 
            WHERE comments.is_deleted = false 
            AND comments.parent_id IS NOT NULL
        )
    );

-- New comment votes view policy that allows viewing votes on any comment
CREATE POLICY "Users can view votes on any comment" ON public.comment_votes
    FOR SELECT USING (
        comment_id IN (
            SELECT comments.id 
            FROM comments 
            WHERE comments.is_deleted = false
        )
    );

-- 3. VERIFY THE CHANGES
-- =====================================================

-- Check updated policies
SELECT 
    tablename,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('comments', 'comment_votes')
AND policyname LIKE '%create%' OR policyname LIKE '%vote%'
ORDER BY tablename, policyname;

-- =====================================================
-- POLICIES UPDATED!
-- =====================================================
-- Now your system supports:
-- ✅ Community discussion comments (poll_id = null)
-- ✅ Voting on community discussion comments
-- ✅ All existing poll-based functionality
-- =====================================================
