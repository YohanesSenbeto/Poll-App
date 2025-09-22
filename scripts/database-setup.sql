-- =====================================================
-- POLL APP DATABASE SETUP - COMPLETE SCHEMA
-- =====================================================
-- This file contains all SQL commands needed to set up
-- the complete database schema for the poll application
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. CREATE COMMENTS TABLES
-- =====================================================

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment votes table
CREATE TABLE IF NOT EXISTS public.comment_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (1, -1)), -- 1 for upvote, -1 for downvote
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id) -- One vote per user per comment
);

-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_poll_id ON public.comments(poll_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_not_deleted ON public.comments(poll_id, is_deleted) WHERE is_deleted = FALSE;

-- Comment votes indexes
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON public.comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON public.comment_votes(user_id);

-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
-- =====================================================

-- Comments policies
DROP POLICY IF EXISTS "Anyone can view non-deleted comments" ON public.comments;
CREATE POLICY "Anyone can view non-deleted comments" ON public.comments
    FOR SELECT USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "Users can create comments on active polls" ON public.comments;
CREATE POLICY "Users can create comments on active polls" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.polls 
            WHERE id = poll_id AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Comment votes policies
DROP POLICY IF EXISTS "Anyone can view comment votes" ON public.comment_votes;
CREATE POLICY "Anyone can view comment votes" ON public.comment_votes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote on comments" ON public.comment_votes;
CREATE POLICY "Users can vote on comments" ON public.comment_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON public.comment_votes;
CREATE POLICY "Users can update their own votes" ON public.comment_votes
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON public.comment_votes;
CREATE POLICY "Users can delete their own votes" ON public.comment_votes
    FOR DELETE USING (auth.uid() = user_id);

-- 5. USER PROFILES POLICIES (if user_profiles table exists)
-- =====================================================

-- Allow everyone to read public profile fields
DROP POLICY IF EXISTS "select public profiles" ON public.user_profiles;
CREATE POLICY "select public profiles" ON public.user_profiles
    FOR SELECT USING (true);

-- Keep write access restricted to the owner
DROP POLICY IF EXISTS "insert own profile" ON public.user_profiles;
CREATE POLICY "insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update own profile" ON public.user_profiles;
CREATE POLICY "update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_votes TO authenticated;
GRANT SELECT ON public.user_profiles TO anon, authenticated;

-- 7. CREATE TRIGGERS
-- =====================================================

-- Update updated_at timestamp on comments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. STORAGE SETUP (for avatars)
-- =====================================================

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON storage.objects;
CREATE POLICY "Public avatars are viewable by everyone" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 9. VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
SELECT 
    'Tables created:' as status,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('comments', 'comment_votes');

-- Check RLS policies
SELECT 
    'RLS Policies:' as status,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('comments', 'comment_votes');

-- Check indexes
SELECT 
    'Indexes created:' as status,
    COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('comments', 'comment_votes');

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Your comments system is now ready to use.
-- Users can create, read, update, and delete comments.
-- Voting system is enabled.
-- Avatar storage is configured.
-- =====================================================
