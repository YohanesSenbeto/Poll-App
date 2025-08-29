-- Storage Diagnostic for Avatar Upload Issues
-- Run these queries to identify storage-related problems

-- 1. Check if 'avatars' bucket exists
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE name = 'avatars';

-- 2. If bucket doesn't exist, create it
-- Run this only if query #1 returns no results
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);

-- 3. Check storage RLS policies for objects
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 4. Check current user's permissions on storage
-- Test if authenticated user can upload
SELECT 
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'Authenticated'
        ELSE 'Anonymous'
    END as user_status;

-- 5. Create proper storage RLS policies if missing
-- Policy for authenticated users to upload files
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

-- 6. Grant necessary permissions on storage
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;

-- 7. Test storage upload capability
-- This creates a test file to verify upload works
-- SELECT storage.upload('avatars', auth.uid() || '/test.txt', 'test content');

-- 8. Check storage bucket policies (alternative view)
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
ORDER BY tablename, policyname;