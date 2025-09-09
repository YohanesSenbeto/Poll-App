# Admin Dashboard Fix - Simple Instructions

## Problem
The admin dashboard is failing to load users with "Error loading profiles: {}"

## Quick Fix Steps

1. **Check your .env.local file** - Ensure these variables are set:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Refresh the page** - The simplified user loading should now work

3. **If still failing**, check browser console for specific errors

## What's Changed
- Simplified user loading logic to use direct auth.users access
- Removed complex profiles table fallback
- Added proper error handling
- jose@gmail.com will be automatically assigned admin role

## Expected Result
- All users from auth.users table should display
- jose@gmail.com will show as admin
- Other users will show as regular users
- Dashboard will load without errors

## Troubleshooting
If issues persist, check:
- Supabase connection status
- Browser network tab for API calls
- Console for any additional error messages