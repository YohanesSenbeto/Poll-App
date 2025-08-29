-- Fix Storage RLS Permissions for Avatar Upload
-- This addresses the "must be owner of table objects" error and storage RLS issues

-- First, check current storage configuration
SELECT 
    bucket_id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

-- Check existing storage RLS policies
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Grant necessary permissions to authenticated and anon users
-- These permissions are needed for storage operations
GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON storage.buckets TO authenticated, anon;
GRANT ALL ON storage.objects TO authenticated, anon;

-- Create storage RLS policies for avatars bucket
-- These policies work with the existing storage system

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new storage RLS policies
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Allow authenticated updates" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Allow authenticated deletes" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Allow public reads" ON storage.objects
    FOR SELECT TO authenticated, anon
    USING (bucket_id = 'avatars');

-- Ensure avatars bucket is properly configured
UPDATE storage.buckets 
SET 
    public = true,
    file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

-- Test queries to verify setup
-- Check if avatars bucket exists and is public
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Test if you can list objects in avatars bucket
SELECT * FROM storage.objects WHERE bucket_id = 'avatars' LIMIT 5;

-- Instructions for use:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. If you get permission errors, ensure you're connected as a superuser
-- 3. After running, refresh your profile page and try avatar upload again
-- 4. Check browser console for any remaining errors