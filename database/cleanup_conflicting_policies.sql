-- =====================================================
-- CLEAN UP CONFLICTING RLS POLICIES
-- =====================================================
-- Run this in Supabase SQL Editor to fix conflicting policies
-- =====================================================

-- 1. DROP ALL EXISTING POLICIES TO START FRESH
-- =====================================================

-- Drop all comment policies
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
DROP POLICY IF EXISTS "Anyone can create comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Universal comment create access" ON public.comments;
DROP POLICY IF EXISTS "Universal comment delete access" ON public.comments;
DROP POLICY IF EXISTS "Universal comment read access" ON public.comments;
DROP POLICY IF EXISTS "Universal comment update access" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can reply to any comment" ON public.comments;
DROP POLICY IF EXISTS "Users can soft delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments for visible polls" ON public.comments;
DROP POLICY IF EXISTS "Users can view non-deleted comments" ON public.comments;

-- 2. CREATE CLEAN, NON-CONFLICTING POLICIES
-- =====================================================

-- SELECT: Users can view non-deleted comments
CREATE POLICY "view_comments" ON public.comments
    FOR SELECT USING (is_deleted = false);

-- INSERT: Users can create comments (community discussion + active polls)
CREATE POLICY "create_comments" ON public.comments
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

-- UPDATE: Users can update their own non-deleted comments
CREATE POLICY "update_comments" ON public.comments
    FOR UPDATE USING (
        auth.uid() = user_id AND is_deleted = false
    ) WITH CHECK (
        auth.uid() = user_id AND is_deleted = false
    );

-- UPDATE: Users can soft delete their own comments
CREATE POLICY "soft_delete_comments" ON public.comments
    FOR UPDATE USING (
        auth.uid() = user_id AND is_deleted = false
    ) WITH CHECK (
        auth.uid() = user_id AND is_deleted = true
    );

-- 3. VERIFY THE CLEAN POLICIES
-- =====================================================

-- Check the new clean policies
SELECT 
    tablename,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'comments'
ORDER BY policyname;

-- =====================================================
-- POLICIES CLEANED UP!
-- =====================================================
-- Now you have clean, non-conflicting policies:
-- ✅ view_comments - View non-deleted comments
-- ✅ create_comments - Create comments (community + active polls)
-- ✅ update_comments - Update own comments
-- ✅ soft_delete_comments - Soft delete own comments
-- =====================================================
