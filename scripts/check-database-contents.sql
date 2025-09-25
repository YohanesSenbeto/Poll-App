-- =====================================================
-- CHECK WHAT'S ACTUALLY IN THE DATABASE
-- =====================================================
-- This script will show us exactly what comments exist
-- and verify the poll ID is correct
-- =====================================================

-- 1. CHECK ALL COMMENTS IN DATABASE
-- =====================================================
SELECT 
    'ALL COMMENTS IN DATABASE:' as info,
    COUNT(*) as total_comments,
    COUNT(CASE WHEN poll_id = '724a499d-dd5d-4758-af5f-47d771f242a9' THEN 1 END) as target_poll_comments
FROM public.comments;

-- 2. CHECK ALL POLLS
-- =====================================================
SELECT 
    'ALL POLLS IN DATABASE:' as info,
    id,
    title,
    is_active,
    created_at
FROM public.polls
ORDER BY created_at DESC;

-- 3. CHECK COMMENTS FOR SPECIFIC POLL
-- =====================================================
SELECT 
    'COMMENTS FOR POLL 724a499d-dd5d-4758-af5f-47d771f242a9:' as info,
    id,
    content,
    user_id,
    created_at,
    is_deleted,
    poll_id
FROM public.comments 
WHERE poll_id = '724a499d-dd5d-4758-af5f-47d771f242a9'
ORDER BY created_at ASC;

-- 4. CHECK ALL COMMENTS (regardless of poll)
-- =====================================================
SELECT 
    'ALL COMMENTS (any poll):' as info,
    id,
    content,
    user_id,
    poll_id,
    created_at,
    is_deleted
FROM public.comments 
ORDER BY created_at DESC
LIMIT 10;

-- 5. CHECK IF POLL EXISTS
-- =====================================================
SELECT 
    'POLL EXISTS CHECK:' as info,
    CASE 
        WHEN COUNT(*) > 0 THEN 'POLL EXISTS'
        ELSE 'POLL NOT FOUND'
    END as status,
    COUNT(*) as poll_count
FROM public.polls 
WHERE id = '724a499d-dd5d-4758-af5f-47d771f242a9';

-- 6. CHECK USER PROFILES
-- =====================================================
SELECT 
    'USER PROFILES:' as info,
    id,
    email,
    display_name,
    username,
    is_active
FROM public.user_profiles
ORDER BY created_at ASC;

-- 7. FINAL DIAGNOSIS
-- =====================================================
SELECT 
    'DIAGNOSIS:' as info,
    'API is working but no comments found' as status,
    'Check if poll ID is correct or if comments were deleted' as note;

