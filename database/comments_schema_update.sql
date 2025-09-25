-- =====================================================
-- UPDATED COMMENTS SCHEMA - FIXES FOR COMMUNITY DISCUSSION
-- =====================================================
-- This file contains updates to fix the comments system
-- Run this in Supabase SQL Editor after your existing schema
-- =====================================================

-- 1. UPDATE COMMENTS TABLE STRUCTURE
-- =====================================================

-- Make poll_id nullable for community discussion
ALTER TABLE public.comments ALTER COLUMN poll_id DROP NOT NULL;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add reply_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'reply_count') THEN
        ALTER TABLE public.comments ADD COLUMN reply_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add like_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'like_count') THEN
        ALTER TABLE public.comments ADD COLUMN like_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add dislike_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'dislike_count') THEN
        ALTER TABLE public.comments ADD COLUMN dislike_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. UPDATE RLS POLICIES FOR COMMUNITY DISCUSSION
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create comments on active polls" ON public.comments;

-- Create new policy that allows community discussion (poll_id = null)
CREATE POLICY "Users can create comments" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            -- Either poll_id is null (community discussion)
            poll_id IS NULL OR
            -- Or poll_id references an active poll
            EXISTS (
                SELECT 1 FROM public.polls 
                WHERE id = poll_id AND is_active = TRUE
            )
        )
    );

-- 3. CREATE VOTE COUNT TRIGGERS
-- =====================================================

-- Function to update comment vote counts
CREATE OR REPLACE FUNCTION update_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment the appropriate count
        IF NEW.vote_type = 1 THEN
            UPDATE public.comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
        ELSE
            UPDATE public.comments SET dislike_count = dislike_count + 1 WHERE id = NEW.comment_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle vote change (like to dislike or vice versa)
        IF OLD.vote_type = 1 AND NEW.vote_type = -1 THEN
            UPDATE public.comments SET 
                like_count = like_count - 1,
                dislike_count = dislike_count + 1 
            WHERE id = NEW.comment_id;
        ELSIF OLD.vote_type = -1 AND NEW.vote_type = 1 THEN
            UPDATE public.comments SET 
                dislike_count = dislike_count - 1,
                like_count = like_count + 1 
            WHERE id = NEW.comment_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement the appropriate count
        IF OLD.vote_type = 1 THEN
            UPDATE public.comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
        ELSE
            UPDATE public.comments SET dislike_count = dislike_count - 1 WHERE id = OLD.comment_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote count updates
DROP TRIGGER IF EXISTS update_comment_vote_counts_trigger ON public.comment_votes;
CREATE TRIGGER update_comment_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_comment_vote_counts();

-- 4. CREATE REPLY COUNT TRIGGER
-- =====================================================

-- Function to update reply count when replies are added/deleted
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
        -- Increment reply count for parent
        UPDATE public.comments 
        SET reply_count = reply_count + 1 
        WHERE id = NEW.parent_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
        -- Decrement reply count for parent
        UPDATE public.comments 
        SET reply_count = reply_count - 1 
        WHERE id = OLD.parent_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle parent_id changes
        IF OLD.parent_id IS NOT NULL AND NEW.parent_id IS NULL THEN
            -- Reply became root comment
            UPDATE public.comments 
            SET reply_count = reply_count - 1 
            WHERE id = OLD.parent_id;
        ELSIF OLD.parent_id IS NULL AND NEW.parent_id IS NOT NULL THEN
            -- Root comment became reply
            UPDATE public.comments 
            SET reply_count = reply_count + 1 
            WHERE id = NEW.parent_id;
        ELSIF OLD.parent_id IS NOT NULL AND NEW.parent_id IS NOT NULL AND OLD.parent_id != NEW.parent_id THEN
            -- Reply moved to different parent
            UPDATE public.comments 
            SET reply_count = reply_count - 1 
            WHERE id = OLD.parent_id;
            UPDATE public.comments 
            SET reply_count = reply_count + 1 
            WHERE id = NEW.parent_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reply count updates
DROP TRIGGER IF EXISTS update_reply_count_trigger ON public.comments;
CREATE TRIGGER update_reply_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_reply_count();

-- 5. INITIALIZE EXISTING COUNTS
-- =====================================================

-- Update reply counts for existing comments
UPDATE public.comments 
SET reply_count = (
    SELECT COUNT(*) 
    FROM public.comments c2 
    WHERE c2.parent_id = public.comments.id AND c2.is_deleted = FALSE
);

-- Update like/dislike counts for existing comments
UPDATE public.comments 
SET like_count = (
    SELECT COUNT(*) 
    FROM public.comment_votes cv 
    WHERE cv.comment_id = public.comments.id AND cv.vote_type = 1
);

UPDATE public.comments 
SET dislike_count = (
    SELECT COUNT(*) 
    FROM public.comment_votes cv 
    WHERE cv.comment_id = public.comments.id AND cv.vote_type = -1
);

-- 6. VERIFICATION QUERIES
-- =====================================================

-- Check updated structure
SELECT 
    'Comments table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'comments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing data
SELECT 
    'Sample comments data:' as info,
    id,
    poll_id,
    parent_id,
    reply_count,
    like_count,
    dislike_count,
    LEFT(content, 30) as content_preview
FROM public.comments 
ORDER BY created_at DESC 
LIMIT 5;

-- =====================================================
-- SCHEMA UPDATE COMPLETE!
-- =====================================================
-- Your comments system now supports:
-- ✅ Community discussion (poll_id = null)
-- ✅ Automatic reply count updates
-- ✅ Automatic like/dislike count updates
-- ✅ Proper RLS policies for all scenarios
-- =====================================================
