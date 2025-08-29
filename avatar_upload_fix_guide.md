# Complete Avatar Upload Fix Guide

## Current Issue Analysis

Your console shows:
- `Available buckets: []` - indicates the avatars bucket exists but isn't accessible
- `new row violates row-level security policy` - indicates missing RLS policies
- `statusCode: "403"` - indicates permission issues

## Step-by-Step Fix Using Supabase Dashboard

### Step 1: Verify and Configure Storage Bucket

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Storage** → **Buckets**

2. **Check if "avatars" bucket exists**
   - If it exists: Click on "avatars" bucket
   - If it doesn't exist: Click **Create bucket**
     - Name: `avatars`
     - Public: **ON** (toggle must be enabled)
     - File size limit: `5242880` (5MB)
     - Allowed MIME types: `image/jpeg,image/png,image/webp,image/gif`

3. **Configure bucket settings**
   - Click on the **Settings** tab within the avatars bucket
   - Ensure **Public bucket** is enabled
   - Set **File size limit** to 5MB
   - Add **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`

### Step 2: Create RLS Policies for Storage

1. **Navigate to SQL Editor**
   - Go to **SQL Editor** in Supabase dashboard
   - Run these queries one by one:

```sql
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;

-- Create new policies for avatars bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
```

2. **Verify policies were created**
   - Go to **Authentication** → **Policies**
   - Look for policies starting with "Allow authenticated" and "Allow public reads"
   - Ensure they apply to the `storage.objects` table

### Step 3: Grant Necessary Permissions

1. **Grant storage permissions**
   - In **SQL Editor**, run:

```sql
-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;
```

### Step 4: Test Storage Access

1. **Test bucket access**
   - In **SQL Editor**, run this diagnostic query:

```sql
-- Check bucket status
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'avatars';

-- Check current policies
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

2. **Expected results**
   - Should show avatars bucket with `public = true`
   - Should show 4 policies for storage.objects

### Step 5: Update Your Application

1. **Clear browser cache**
   - Hard refresh your browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Clear browser cache and cookies for your domain

2. **Restart your development server**
   ```bash
   npm run dev
   ```

3. **Test the upload**
   - Go to your profile page
   - Try uploading an avatar image
   - Check browser console for any remaining errors

### Step 6: Debug If Still Failing

If you still get errors, check these additional items:

1. **Verify bucket structure**
   - Your upload path should be: `avatars/{user-id}/{filename}`
   - Ensure the folder structure matches your code

2. **Check file size and type**
   - Ensure your image is under 5MB
   - Ensure it's one of the allowed types (jpeg, png, webp, gif)

3. **Enable debug mode**
   - Add this temporary debug code to your profile page:

```typescript
// Add this to check bucket access
const debugStorage = async () => {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    console.log("Available buckets:", buckets);
    console.log("Storage error:", error);
    
    const { data: files, error: listError } = await supabase.storage
        .from('avatars')
        .list('');
    console.log("Files in avatars:", files);
    console.log("List error:", listError);
};
```

### Common Issues and Solutions

**Issue: "Bucket not found"**
- Solution: Ensure the bucket name is exactly "avatars" (case-sensitive)
- Check that public access is enabled

**Issue: "new row violates row-level security policy"**
- Solution: Ensure all 4 RLS policies are created correctly
- Check that the folder structure matches: `user-id/filename`

**Issue: "permission denied"**
- Solution: Run the GRANT statements in Step 3
- Ensure the authenticated role has proper permissions

### Alternative: Using Supabase CLI (if installed)

If you have Supabase CLI installed, you can run:

```bash
# Update bucket to be public
supabase storage update avatars --public

# Or create bucket if it doesn't exist
supabase storage create-bucket avatars --public
```

### Final Verification

After completing all steps:

1. **Check browser console** - should show "Available buckets: [Object]" instead of []
2. **Test upload** - should succeed without 403 errors
3. **Check Supabase dashboard** - should see uploaded files in Storage → avatars

If issues persist, please share:
- Browser console output
- Results from the diagnostic SQL queries
- Any error messages from the upload attempt