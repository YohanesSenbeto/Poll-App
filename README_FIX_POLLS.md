# Fix for "Error fetching polls" Issue

## Problem
The error "Error fetching polls: {}" occurs because of missing or conflicting database views.

## Solution

### Step 1: Run the Fix Script
Copy and paste the following SQL into your Supabase SQL editor and run it:

```sql
-- Drop existing views to avoid conflicts
DROP VIEW IF EXISTS public.poll_statistics CASCADE;
DROP VIEW IF EXISTS public.user_polls_detailed CASCADE;
DROP VIEW IF EXISTS public.polls_with_counts CASCADE;

-- Create poll_statistics view
CREATE OR REPLACE VIEW public.poll_statistics AS
SELECT 
    p.id as poll_id,
    p.title,
    p.description,
    p.user_id,
    p.is_active,
    p.created_at,
    COUNT(DISTINCT o.id) as option_count,
    COUNT(DISTINCT v.user_id) as total_votes
FROM public.polls p
LEFT JOIN public.options o ON p.id = o.poll_id
LEFT JOIN public.votes v ON p.id = v.poll_id
GROUP BY p.id, p.title, p.description, p.user_id, p.is_active, p.created_at;

-- Create user_polls_detailed view
CREATE OR REPLACE VIEW public.user_polls_detailed AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.user_id,
    p.is_active,
    p.created_at,
    p.updated_at,
    COALESCE(u.email, 'Unknown User') as user_email,
    COUNT(DISTINCT o.id) as option_count,
    COUNT(DISTINCT v.user_id) as total_votes,
    COUNT(DISTINCT v.id) as total_votes_count,
    CASE 
        WHEN COUNT(DISTINCT v.user_id) > 0 THEN 'Voted'
        ELSE 'No Votes'
    END as status
FROM public.polls p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN public.options o ON p.id = o.poll_id
LEFT JOIN public.votes v ON p.id = v.poll_id
GROUP BY p.id, p.title, p.description, p.user_id, p.is_active, p.created_at, p.updated_at, u.email
ORDER BY p.created_at DESC;

-- Create polls_with_counts view
CREATE OR REPLACE VIEW public.polls_with_counts AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.user_id,
    p.is_active,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT o.id) as options_count,
    COUNT(DISTINCT v.user_id) as votes_count
FROM public.polls p
LEFT JOIN public.options o ON p.id = o.poll_id
LEFT JOIN public.votes v ON p.id = v.poll_id
GROUP BY p.id, p.title, p.description, p.user_id, p.is_active, p.created_at, p.updated_at;

-- Grant permissions
GRANT SELECT ON public.poll_statistics TO anon, authenticated;
GRANT SELECT ON public.user_polls_detailed TO anon, authenticated;
GRANT SELECT ON public.polls_with_counts TO anon, authenticated;
```

### Step 2: Verify Tables Exist
If you get errors about missing tables, run:

```sql
-- Check if tables exist
SELECT * FROM public.polls LIMIT 1;
SELECT * FROM public.options LIMIT 1;
SELECT * FROM public.votes LIMIT 1;

-- If tables don't exist, run the main schema
-- Copy contents from supabase_schema.sql
```

### Step 3: Refresh the Page
After running the SQL script, refresh your polls page at `/polls`.

## Troubleshooting

If you still see errors:

1. **Check browser console** for specific error messages
2. **Verify RLS policies** are allowing read access
3. **Check if you're logged in** - some features require authentication
4. **Clear browser cache** and refresh

## Expected Result
The polls dashboard should load successfully showing:
- Total polls count
- Total votes count
- Your polls (if logged in)
- Other users' polls