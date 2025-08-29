-- Comprehensive Diagnostic for Avatar Upload Issues
-- Run these queries in Supabase SQL Editor to identify the problem

-- 1. Check current RLS policies
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 2. Check if user exists in profiles table
SELECT 
    id,
    username,
    email,
    avatar_url,
    created_at
FROM public.profiles 
WHERE id = auth.uid();

-- 3. Check authentication status
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users 
WHERE id = auth.uid();

-- 4. Test INSERT capability (this will show if RLS is working)
INSERT INTO public.profiles (id, username, email, avatar_url, updated_at)
VALUES (auth.uid(), 'test_user', 'test@example.com', NULL, now())
ON CONFLICT (id) DO NOTHING;

-- 5. Test UPDATE capability
UPDATE public.profiles 
SET avatar_url = 'test_avatar.jpg', updated_at = now()
WHERE id = auth.uid();

-- 6. Check storage bucket permissions
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'avatars';

-- 7. Check storage RLS policies
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 8. If user doesn't exist in profiles, create it
-- Run this if query #2 returns no results
INSERT INTO public.profiles (id, username, email, avatar_url, created_at, updated_at)
SELECT 
    auth.uid(),
    COALESCE(raw_user_meta_data->>'username', 'user_' || substr(auth.uid()::text, 1, 8)),
    email,
    NULL,
    now(),
    now()
FROM auth.users 
WHERE id = auth.uid()
ON CONFLICT (id) DO NOTHING;