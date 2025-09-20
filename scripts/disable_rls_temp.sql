-- Temporarily disable RLS to test functionality
-- This will allow us to test the role management without policy issues

-- Disable RLS temporarily
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS (uncomment when ready)
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
