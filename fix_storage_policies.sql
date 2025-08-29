-- Fix Storage RLS Policies for Avatar Upload
-- This addresses "new row violates row-level security policy" for storage

-- 1. Check current storage configuration
SELECT name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name = 'avatars';

-- 2. Check storage RLS policies
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 3. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role uploads" ON storage.objects;

-- 5. Create comprehensive storage RLS policies
-- Policy for authenticated users to upload files to their own folder
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy for authenticated users to update their own files
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

-- Policy for authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy for public read access to avatars
CREATE POLICY "Allow public read" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'avatars');

-- 6. Grant necessary permissions on storage tables
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;

-- 7. Ensure avatars bucket has proper configuration
UPDATE storage.buckets 
SET public = true, 
    file_size_limit = 5242880, 
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
WHERE name = 'avatars';

-- 8. Test storage access
-- This should show the avatars bucket
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- 9. Verify RLS policies are working
SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';