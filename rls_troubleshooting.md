# Fix "new row violates row-level security policy" Error

## Problem
When uploading an avatar, you get the error: "Upload failed: new row violates row-level security policy"

## Root Cause
This error occurs when Row Level Security (RLS) policies are not properly configured for the `profiles` table, preventing users from updating their own profile records.

## Solution

### Step 1: Run the RLS Fix SQL
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `fix_rls_policies.sql`
4. Click **Run** to execute the SQL commands

### Step 2: Verify RLS Policies
After running the SQL, test the policies with these commands:

```sql
-- Test if you can read your own profile
SELECT * FROM public.profiles WHERE id = auth.uid();

-- Test if you can update your own profile
UPDATE public.profiles 
SET avatar_url = 'https://example.com/test.jpg' 
WHERE id = auth.uid();

-- Check if the update was successful
SELECT avatar_url FROM public.profiles WHERE id = auth.uid();
```

### Step 3: Alternative Solutions

If the issue persists:

#### Option A: Check User Authentication
Ensure the user is properly authenticated:
```sql
SELECT auth.uid(); -- Should return your user ID
```

#### Option B: Check Table Permissions
```sql
-- Check table ownership and permissions
\dt public.profiles
\z public.profiles
```

#### Option C: Temporary RLS Disable (for testing only)
```sql
-- WARNING: This disables security - only for testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Test your upload
-- After testing, re-enable:
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### Step 4: Re-test Avatar Upload
1. Refresh your profile page
2. Try uploading an avatar again
3. Check browser console for any remaining errors

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `auth.uid()` returns null | User not logged in - check authentication |
| `42501` error | Permission denied - check RLS policies |
| `42P01` error | Table doesn't exist - run schema setup |
| Policy exists but still fails | Drop and recreate the policy |

## Verification Commands

Run these in Supabase SQL Editor to verify everything is working:

```sql
-- Check all policies on profiles
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check current user
SELECT auth.uid() as current_user_id;

-- Check if profile exists
SELECT * FROM public.profiles WHERE id = auth.uid();
```