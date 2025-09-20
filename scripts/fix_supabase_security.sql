
-- ===========================================
-- 1. DROP AND RECREATE VIEWS WITH SECURITY INVOKER
-- ===========================================

-- Drop views if they exist (in dependency order)
DROP VIEW IF EXISTS public.user_polls_detailed CASCADE;
DROP VIEW IF EXISTS public.admin_analytics CASCADE;
DROP VIEW IF EXISTS public.analytics_dashboard CASCADE;
DROP VIEW IF EXISTS public.polls_with_counts CASCADE;
DROP VIEW IF EXISTS public.poll_statistics CASCADE;

-- ===========================================
-- 2. RECREATE VIEWS WITHOUT EXPOSING auth.users
--    AND USING SECURITY INVOKER
-- ===========================================

-- NOTE: Replace the SELECT ... FROM ... with your actual view logic,
-- but ensure no columns from auth.users are exposed directly.
-- If user info is needed, only expose user_id or a safe subset.

-- Example: user_polls_detailed (no direct auth.users exposure)
CREATE OR REPLACE VIEW public.user_polls_detailed
SECURITY INVOKER
AS
SELECT
    p.id AS poll_id,
    p.title,
    p.created_by AS user_id, -- Only expose user_id, not email or other PII
    p.created_at,
    p.status,
    up.vote_option,
    up.voted_at
FROM
    public.polls p
    JOIN public.user_polls up ON up.poll_id = p.id
-- Do NOT join or select from auth.users here!

;

-- Example: admin_analytics
CREATE OR REPLACE VIEW public.admin_analytics
SECURITY INVOKER
AS
SELECT
    p.id AS poll_id,
    p.title,
    COUNT(up.id) AS total_votes,
    MAX(up.voted_at) AS last_vote_at
FROM
    public.polls p
    LEFT JOIN public.user_polls up ON up.poll_id = p.id
GROUP BY p.id, p.title
;

-- Example: analytics_dashboard
CREATE OR REPLACE VIEW public.analytics_dashboard
SECURITY INVOKER
AS
SELECT
    da.date,
    da.total_polls,
    da.total_votes,
    da.active_users
FROM
    public.daily_analytics da
;

-- Example: polls_with_counts
CREATE OR REPLACE VIEW public.polls_with_counts
SECURITY INVOKER
AS
SELECT
    p.id AS poll_id,
    p.title,
    COUNT(up.id) AS vote_count
FROM
    public.polls p
    LEFT JOIN public.user_polls up ON up.poll_id = p.id
GROUP BY p.id, p.title
;

-- Example: poll_statistics
CREATE OR REPLACE VIEW public.poll_statistics
SECURITY INVOKER
AS
SELECT
    pa.poll_id,
    pa.total_votes,
    pa.unique_voters,
    pa.average_vote_time
FROM
    public.poll_analytics pa
;

-- ===========================================
-- 3. ENABLE RLS AND DEFINE POLICIES
-- ===========================================

-- --------- daily_analytics (user can see only their own data) ---------
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.daily_analytics;
DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.daily_analytics;
DROP POLICY IF EXISTS "Users can update their own analytics" ON public.daily_analytics;
DROP POLICY IF EXISTS "Users can delete their own analytics" ON public.daily_analytics;

CREATE POLICY "Users can view their own analytics"
    ON public.daily_analytics
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own analytics"
    ON public.daily_analytics
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own analytics"
    ON public.daily_analytics
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own analytics"
    ON public.daily_analytics
    FOR DELETE
    USING (user_id = auth.uid());

-- --------- poll_analytics (user can see only their own data) ---------
ALTER TABLE public.poll_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own poll analytics" ON public.poll_analytics;
DROP POLICY IF EXISTS "Users can insert their own poll analytics" ON public.poll_analytics;
DROP POLICY IF EXISTS "Users can update their own poll analytics" ON public.poll_analytics;
DROP POLICY IF EXISTS "Users can delete their own poll analytics" ON public.poll_analytics;

CREATE POLICY "Users can view their own poll analytics"
    ON public.poll_analytics
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own poll analytics"
    ON public.poll_analytics
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own poll analytics"
    ON public.poll_analytics
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own poll analytics"
    ON public.poll_analytics
    FOR DELETE
    USING (user_id = auth.uid());

-- --------- user_sessions (user can see only their own sessions) ---------
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;

CREATE POLICY "Users can view their own sessions"
    ON public.user_sessions
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sessions"
    ON public.user_sessions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
    ON public.user_sessions
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
    ON public.user_sessions
    FOR DELETE
    USING (user_id = auth.uid());

-- --------- programming_languages (public read access) ---------
ALTER TABLE public.programming_languages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read programming languages" ON public.programming_languages;
DROP POLICY IF EXISTS "Only admins can modify programming languages" ON public.programming_languages;

-- Public read access
CREATE POLICY "Public can read programming languages"
    ON public.programming_languages
    FOR SELECT
    USING (true);

-- (Optional) Only allow admins to modify
CREATE POLICY "Only admins can modify programming languages"
    ON public.programming_languages
    FOR ALL
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- ===========================================
-- 4. VERIFICATION QUERIES
-- ===========================================

-- Check that all views use SECURITY INVOKER
SELECT table_schema, table_name, security_type
FROM information_schema.views
WHERE table_name IN (
    'user_polls_detailed',
    'admin_analytics',
    'analytics_dashboard',
    'polls_with_counts',
    'poll_statistics'
);

-- Check that no view exposes auth.users columns
SELECT view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    view_definition ILIKE '%auth.users%'
    OR view_definition ILIKE '%email%'
    OR view_definition ILIKE '%raw_app_meta_data%'
    OR view_definition ILIKE '%encrypted%'
  );

-- Check RLS is enabled on all required tables
SELECT table_schema, table_name, relrowsecurity
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE table_name IN (
    'daily_analytics',
    'poll_analytics',
    'user_sessions',
    'programming_languages'
)
  AND n.nspname = 'public';

-- List all policies for the secured tables
SELECT polrelid::regclass AS table_name, polname, polcmd, polpermissive, polroles, polqual, polwithcheck
FROM pg_policy
WHERE polrelid::regclass::text IN (
    'daily_analytics',
    'poll_analytics',
    'user_sessions',
    'programming_languages'
);

-- The error indicates that "SECURITY INVOKER" is being used incorrectly, likely outside of a CREATE VIEW statement.
-- To fix this, you should ALTER the views to explicitly set SECURITY INVOKER.
-- The following SQL will update the relevant views to use SECURITY INVOKER.

DO $$
DECLARE
    view_rec RECORD;
BEGIN
    FOR view_rec IN
        SELECT table_schema, table_name
        FROM information_schema.views
        WHERE table_name IN (
            'user_polls_detailed',
            'admin_analytics',
            'analytics_dashboard',
            'polls_with_counts',
            'poll_statistics'
        )
    LOOP
        -- SECURITY INVOKER can only be set at view creation time, not via ALTER VIEW.
        -- To fix the error, recreate the view with SECURITY INVOKER.
        -- The following will drop and recreate the view with SECURITY INVOKER, preserving the definition.

        DECLARE
            view_def TEXT;
        BEGIN
            SELECT definition INTO view_def
            FROM pg_views
            WHERE schemaname = view_rec.table_schema
              AND viewname = view_rec.table_name;

            IF view_def IS NOT NULL THEN
                EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE;', view_rec.table_schema, view_rec.table_name);
                EXECUTE format(
                    'CREATE OR REPLACE VIEW %I.%I SECURITY INVOKER AS %s',
                    view_rec.table_schema,
                    view_rec.table_name,
                    view_def
                );
            END IF;
        END;
    END LOOP;
END
$$;

-- If you want to check the current security type of the views, use the following query:
-- SELECT table_schema, table_name, security_type
-- FROM information_schema.views
-- WHERE table_name IN (
--     'user_polls_detailed',
--     'admin_analytics',
--     'analytics_dashboard',
--     'polls_with_counts',
--     'poll_statistics'
-- );
