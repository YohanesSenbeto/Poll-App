-- =====================================================
-- ADD HARD DELETE POLICY
-- =====================================================
-- Run this in Supabase SQL Editor to allow hard delete
-- =====================================================

-- Add DELETE policy for hard delete
CREATE POLICY "hard_delete_comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- HARD DELETE POLICY ADDED!
-- =====================================================
-- Now users can permanently delete their own comments
-- =====================================================
