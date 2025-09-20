-- Create profiles for existing users who don't have them
-- This script handles users who existed before the role management migration

INSERT INTO public.user_profiles (user_id, username, display_name, role, is_active)
SELECT 
    au.id as user_id,
    COALESCE(au.raw_user_meta_data->>'username', 'user_' || substr(au.id::text, 1, 8)) as username,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email) as display_name,
    'user' as role,
    true as is_active
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
AND au.email IS NOT NULL;

-- Grant admin role to the first user (optional - you can change this)
-- Uncomment the lines below if you want to make the first user an admin
-- UPDATE public.user_profiles 
-- SET role = 'admin' 
-- WHERE user_id = (
--     SELECT id FROM auth.users 
--     ORDER BY created_at ASC 
--     LIMIT 1
-- );
