-- =====================================================
-- SIMPLE DATABASE CHECK
-- =====================================================
-- This script will show us what's in the database
-- =====================================================

-- 1. CHECK ALL COMMENTS
-- =====================================================
SELECT 
    'ALL COMMENTS:' as info,
    COUNT(*) as total_comments
FROM public.comments;

-- 2. CHECK ALL POLLS
-- =====================================================
SELECT 
    'ALL POLLS:' as info,
    id,
    title,
    is_active
FROM public.polls
ORDER BY created_at DESC;

-- 3. CHECK COMMENTS FOR SPECIFIC POLL
-- =====================================================
SELECT 
    'COMMENTS FOR POLL:' as info,
    COUNT(*) as comment_count
FROM public.comments 
WHERE poll_id = '724a499d-dd5d-4758-af5f-47d771f242a9';

-- 4. CHECK USER PROFILES
-- =====================================================
SELECT 
    'USER PROFILES:' as info,
    COUNT(*) as profile_count
FROM public.user_profiles;

-- 5. FINAL RESULT
-- =====================================================
SELECT 
    'CHECK COMPLETE!' as result,
    'Database contents checked' as message;

