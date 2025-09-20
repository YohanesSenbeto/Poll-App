-- Enhanced Role Management Database Migration
-- This script adds comprehensive role management to the poll application

-- Create user profiles table with role management
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'moderator', 'admin')),
    permission VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'manage')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role, permission, resource, action)
);

-- Create admin actions log table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    target_id UUID,
    target_type VARCHAR(50),
    action_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create moderator actions log table
CREATE TABLE IF NOT EXISTS public.moderator_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    moderator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    target_id UUID,
    target_type VARCHAR(50),
    action_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission, resource, action) VALUES
-- User permissions
('user', 'polls', 'polls', 'create'),
('user', 'polls', 'polls', 'read'),
('user', 'polls', 'own_polls', 'update'),
('user', 'polls', 'own_polls', 'delete'),
('user', 'votes', 'votes', 'create'),
('user', 'votes', 'votes', 'read'),
('user', 'profile', 'own_profile', 'update'),

-- Moderator permissions (includes all user permissions plus)
('moderator', 'polls', 'all_polls', 'read'),
('moderator', 'polls', 'inappropriate_polls', 'update'),
('moderator', 'polls', 'inappropriate_polls', 'delete'),
('moderator', 'users', 'user_profiles', 'read'),
('moderator', 'users', 'user_profiles', 'update'),
('moderator', 'moderation', 'content_review', 'manage'),

-- Admin permissions (includes all moderator permissions plus)
('admin', 'polls', 'all_polls', 'manage'),
('admin', 'users', 'all_users', 'manage'),
('admin', 'roles', 'user_roles', 'manage'),
('admin', 'system', 'admin_panel', 'manage'),
('admin', 'analytics', 'all_data', 'read'),
('admin', 'logs', 'admin_actions', 'read'),
('admin', 'logs', 'moderator_actions', 'read')
ON CONFLICT (role, permission, resource, action) DO NOTHING;

-- Create updated_at trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Users can view all active profiles
DROP POLICY IF EXISTS "Users can view active profiles" ON public.user_profiles;
CREATE POLICY "Users can view active profiles" ON public.user_profiles
    FOR SELECT USING (is_active = true);

-- Users can view their own profile (including inactive)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own profile
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
CREATE POLICY "Users can create own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can manage all profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
    );

-- Moderators can view and update user profiles (but not delete)
DROP POLICY IF EXISTS "Moderators can manage user profiles" ON public.user_profiles;
CREATE POLICY "Moderators can manage user profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "Moderators can update user profiles" ON public.user_profiles;
CREATE POLICY "Moderators can update user profiles" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'moderator')
        )
    );

-- RLS Policies for role_permissions (read-only for authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for admin_actions (only admins can view)
DROP POLICY IF EXISTS "Admins can view admin actions" ON public.admin_actions;
CREATE POLICY "Admins can view admin actions" ON public.admin_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert admin actions" ON public.admin_actions;
CREATE POLICY "Admins can insert admin actions" ON public.admin_actions
    FOR INSERT WITH CHECK (
        auth.uid() = admin_id AND
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
    );

-- RLS Policies for moderator_actions
DROP POLICY IF EXISTS "Moderators can view moderator actions" ON public.moderator_actions;
CREATE POLICY "Moderators can view moderator actions" ON public.moderator_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "Moderators can insert moderator actions" ON public.moderator_actions;
CREATE POLICY "Moderators can insert moderator actions" ON public.moderator_actions
    FOR INSERT WITH CHECK (
        auth.uid() = moderator_id AND
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'moderator')
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_moderator_id ON public.moderator_actions(moderator_id);

-- Create function to get user role
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    user_role VARCHAR(20);
BEGIN
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has permission
DROP FUNCTION IF EXISTS public.user_has_permission(UUID, VARCHAR(50), VARCHAR(50), VARCHAR(20));
CREATE OR REPLACE FUNCTION public.user_has_permission(
    user_uuid UUID,
    permission_name VARCHAR(50),
    resource_name VARCHAR(50),
    action_name VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(20);
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Get user role
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE user_id = user_uuid AND is_active = true;
    
    -- If no role found, default to user
    user_role := COALESCE(user_role, 'user');
    
    -- Check if permission exists
    SELECT EXISTS(
        SELECT 1 FROM public.role_permissions
        WHERE role = user_role
        AND permission = permission_name
        AND resource = resource_name
        AND action = action_name
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create user profile on signup
-- First drop the trigger that depends on this function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, username, display_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, VARCHAR(50), VARCHAR(50), VARCHAR(20)) TO authenticated, anon;
