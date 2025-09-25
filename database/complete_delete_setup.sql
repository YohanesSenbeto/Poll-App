-- =====================================================
-- COMPLETE DELETE POLICY SETUP
-- =====================================================
-- Run this in Supabase SQL Editor to ensure delete works
-- =====================================================

-- 1. DROP ALL EXISTING DELETE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "hard_delete_comments" ON public.comments;
DROP POLICY IF EXISTS "soft_delete_comments" ON public.comments;
DROP POLICY IF EXISTS "simple_soft_delete" ON public.comments;

-- 2. CREATE CLEAN DELETE POLICY
-- =====================================================
CREATE POLICY "delete_own_comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- 3. VERIFY THE POLICY
-- =====================================================
SELECT 
    tablename,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'comments'
AND cmd = 'DELETE';

-- 4. TEST THE POLICY (Optional - for debugging)
-- =====================================================
-- This will show if the policy allows deletion for the current user
-- SELECT 
--     id,
--     user_id,
--     content,
--     auth.uid() as current_user_id,
--     (auth.uid() = user_id) as can_delete
-- FROM comments 
-- WHERE id = 'your-comment-id-here';

-- =====================================================
-- DELETE POLICY SETUP COMPLETE!
-- =====================================================
-- Now users can delete their own comments permanently
-- =====================================================
