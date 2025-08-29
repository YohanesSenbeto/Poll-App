-- Fix Storage RLS Policies for Avatar Upload
-- Run these commands in Supabase SQL Editor

-- 1. Check current storage configuration
SELECT name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name = 'avatars';

-- 2. Check existing storage RLS policies
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 3. Drop existing storage policies (if any)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- 4. Create storage RLS policies for avatar uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow authenticated updates" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow authenticated deletes" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow public read" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'avatars');

-- 5. Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- 6. Test the configuration
-- This should return the avatars bucket info
SELECT * FROM storage.buckets WHERE name = 'avatars';