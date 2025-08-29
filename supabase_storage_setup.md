# Supabase Storage Setup Guide - Manual Configuration

## Issue Summary
The "must be owner of table objects" error occurs because we cannot directly modify storage system tables. Instead, we'll use Supabase's dashboard to properly configure storage.

## Manual Setup Steps (No SQL Required)

### 1. Access Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to **Storage** → **Buckets**

### 2. Create/Configure Avatars Bucket
If the avatars bucket doesn't exist:
- Click **Create Bucket**
- **Bucket ID**: `avatars`
- **Name**: `avatars`
- **Public**: ✅ Enable (check the box)
- **File size limit**: 5MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`

If it exists:
- Click on **avatars** bucket
- Click **Settings** tab
- Ensure **Public bucket** is enabled
- Set **File size limit** to 5MB
- Add allowed MIME types as above

### 3. Configure Storage Policies
Navigate to **Authentication** → **Policies** → **Storage**

Create these policies for the `avatars` bucket:

#### Policy 1: Allow Authenticated Uploads
- **Name**: `Allow authenticated uploads`
- **Bucket**: `avatars`
- **Operations**: `INSERT`
- **Roles**: `authenticated`
- **Check expression**: `true`

#### Policy 2: Allow Authenticated Updates
- **Name**: `Allow authenticated updates`
- **Bucket**: `avatars`
- **Operations**: `UPDATE`
- **Roles**: `authenticated`
- **Check expression**: `true`

#### Policy 3: Allow Authenticated Deletes
- **Name**: `Allow authenticated deletes`
- **Bucket**: `avatars`
- **Operations**: `DELETE`
- **Roles**: `authenticated`
- **Check expression**: `true`

#### Policy 4: Allow Public Reads
- **Name**: `Allow public reads`
- **Bucket**: `avatars`
- **Operations**: `SELECT`
- **Roles**: `authenticated`, `anon`
- **Check expression**: `true`

### 4. Verify Setup
After configuration:
- Go to **Storage** → **Buckets** → **avatars**
- Check that policies are listed
- Ensure the bucket shows as **Public**

### 5. Test Upload
- Return to your profile page
- Try uploading an avatar
- Check browser console for any remaining errors

## Troubleshooting
- If upload still fails, check that your user is properly authenticated
- Ensure the file size is under 5MB
- Verify the file type is one of the allowed MIME types
- Check browser network tab for detailed error messages

## Alternative: Using Supabase CLI
If you prefer using the CLI:
```bash
# Install Supabase CLI
npm install -g supabase

# Login to your project
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply storage configuration
supabase storage update avatars --public
```

This approach bypasses the SQL permission issues entirely by using Supabase's official configuration methods.