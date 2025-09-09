# Fix User Display Issue - Quick Guide

## Problem
Your admin dashboard isn't showing jose@gmail.com and other users because of RLS (Row Level Security) policies on the auth.users table.

## Solution

### Step 1: Apply SQL Fix
1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `apply_rls_fix.sql` into the editor
3. Click "Run" to execute all commands

### Step 2: Verify Fix
After running the SQL, verify by checking:
- The profiles table now exists and has all your users
- jose@gmail.com is marked as admin
- All users from auth.users are now visible

### Step 3: Test Dashboard
1. Refresh your admin dashboard
2. You should now see all users including jose@gmail.com
3. User statistics should show correct counts

## What the Fix Does
- Creates a profiles table to safely store user information
- Updates RLS policies to allow admin access
- Syncs all existing auth.users to the profiles table
- Sets jose@gmail.com as admin
- Updates your dashboard to use the new profiles table

## Expected Results
After applying this fix:
- ✅ All users will be visible in admin dashboard
- ✅ jose@gmail.com will show as admin
- ✅ User counts will be accurate
- ✅ Security remains intact (only admins can see all users)

## Need Help?
If you encounter any issues:
1. Check the SQL Editor output for error messages
2. Verify the profiles table was created: `SELECT * FROM public.profiles`
3. Check if jose@gmail.com appears: `SELECT * FROM public.profiles WHERE email = 'jose@gmail.com'`