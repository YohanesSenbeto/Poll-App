-- Final Storage Fix for Avatar Upload
-- Simplified version that works with Supabase's storage system

-- Ensure avatars bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']) 
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated, anon;
GRANT ALL ON storage.buckets TO authenticated, anon;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;

-- Create proper storage RLS policies
CREATE POLICY "Allow authenticated uploads" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated updates" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'avatars') 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated deletes" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'avatars');

CREATE POLICY "Allow public reads" ON storage.objects 
FOR SELECT TO authenticated, anon 
USING (bucket_id = 'avatars');

-- Verify the setup
SELECT id, name, public FROM storage.buckets WHERE id = 'avatars';
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'objects';