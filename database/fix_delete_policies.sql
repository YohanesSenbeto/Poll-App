-- =====================================================
-- FIX DELETE POLICIES FOR COMMENTS
-- =====================================================
-- Run this in Supabase SQL Editor to fix comment deletion
-- =====================================================

-- 1. ADD DELETE POLICY FOR COMMENTS
-- =====================================================

-- Allow users to delete their own comments (soft delete by setting is_deleted = true)
CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR UPDATE USING (
        auth.uid() = user_id AND is_deleted = false
    ) WITH CHECK (
        auth.uid() = user_id AND is_deleted = true
    );

-- 2. ADD UPDATE POLICY FOR COMMENTS (if not exists)
-- =====================================================

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (
        auth.uid() = user_id AND is_deleted = false
    ) WITH CHECK (
        auth.uid() = user_id AND is_deleted = false
    );

-- 3. ADD SELECT POLICY FOR COMMENTS (if not exists)
-- =====================================================

-- Allow users to view non-deleted comments
CREATE POLICY "Users can view non-deleted comments" ON public.comments
    FOR SELECT USING (
        is_deleted = false
    );

-- 4. VERIFY THE CHANGES
-- =====================================================

-- Check all comment policies
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
-- DELETE POLICIES ADDED!
-- =====================================================
-- Now your system supports:
-- ✅ Users can delete their own comments
-- ✅ Users can update their own comments  
-- ✅ Users can view non-deleted comments
-- ✅ Soft delete functionality (is_deleted = true)
-- =====================================================
