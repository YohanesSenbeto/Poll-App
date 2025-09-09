# Environment Variables Setup Guide

## Required Variables

Add these to your `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Example format:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## How to Get These Values

1. **Go to your Supabase Dashboard**
2. **Project Settings** → **API**
3. **Project URL**: Use this for `NEXT_PUBLIC_SUPABASE_URL`
4. **Project API Keys**:
   - Use `anon` key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Use `service_role` key for `SUPABASE_SERVICE_ROLE_KEY`

## Important Notes

- **Service Role Key**: This has admin privileges - never expose it to the client
- **Anon Key**: Safe to use in client-side code
- **Restart your dev server** after adding these variables

## Verification

After setting up:
1. Run `npm run dev` to restart the server
2. Navigate to `/admin` 
3. You should see all users including jose@gmail.com