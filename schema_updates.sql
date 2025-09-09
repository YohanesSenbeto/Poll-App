-- Database schema updates for improved analytics and session management

-- 1. Create programming languages reference table
CREATE TABLE IF NOT EXISTS public.programming_languages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create poll analytics table for tracking creation metrics
CREATE TABLE IF NOT EXISTS public.poll_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- 'poll_created', 'vote_cast', 'language_mentioned'
    language_name VARCHAR(100), -- For language-specific metrics
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
    value INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create daily analytics summary table
CREATE TABLE IF NOT EXISTS public.daily_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    language_name VARCHAR(100),
    total_value INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, metric_type, language_name)
);

-- 4. Create user session tracking table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insert common programming languages
INSERT INTO public.programming_languages (name, display_name, category) VALUES
('javascript', 'JavaScript', 'language'),
('python', 'Python', 'language'),
('java', 'Java', 'language'),
('typescript', 'TypeScript', 'language'),
('csharp', 'C#', 'language'),
('cpp', 'C++', 'language'),
('php', 'PHP', 'language'),
('ruby', 'Ruby', 'language'),
('go', 'Go', 'language'),
('rust', 'Rust', 'language'),
('swift', 'Swift', 'language'),
('kotlin', 'Kotlin', 'language'),
('sql', 'SQL', 'language'),
('html-css', 'HTML/CSS', 'markup'),
('react', 'React', 'framework'),
('vue', 'Vue', 'framework'),
('angular', 'Angular', 'framework'),
('nodejs', 'Node.js', 'runtime'),
('django', 'Django', 'framework'),
('flask', 'Flask', 'framework'),
('spring', 'Spring', 'framework'),
('laravel', 'Laravel', 'framework'),
('express', 'Express', 'framework')
ON CONFLICT (name) DO NOTHING;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_poll_analytics_type ON public.poll_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_poll_analytics_language ON public.poll_analytics(language_name);
CREATE INDEX IF NOT EXISTS idx_poll_analytics_user ON public.poll_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_analytics_created ON public.poll_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON public.daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_type ON public.daily_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_language ON public.daily_analytics(language_name);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);

-- 7. Create function to update daily analytics
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily poll creation count
    IF NEW.metric_type = 'poll_created' THEN
        INSERT INTO public.daily_analytics (date, metric_type, total_value, unique_users)
        VALUES (CURRENT_DATE, 'poll_created', 1, 1)
        ON CONFLICT (date, metric_type, language_name) 
        DO UPDATE SET 
            total_value = daily_analytics.total_value + 1,
            unique_users = (
                SELECT COUNT(DISTINCT user_id) 
                FROM public.poll_analytics 
                WHERE metric_type = 'poll_created' 
                AND DATE(created_at) = CURRENT_DATE
            ),
            updated_at = NOW();
    END IF;

    -- Update daily language mentions
    IF NEW.metric_type = 'language_mentioned' AND NEW.language_name IS NOT NULL THEN
        INSERT INTO public.daily_analytics (date, metric_type, language_name, total_value, unique_users)
        VALUES (CURRENT_DATE, 'language_mentioned', NEW.language_name, 1, 1)
        ON CONFLICT (date, metric_type, language_name)
        DO UPDATE SET 
            total_value = daily_analytics.total_value + 1,
            unique_users = (
                SELECT COUNT(DISTINCT user_id) 
                FROM public.poll_analytics 
                WHERE metric_type = 'language_mentioned' 
                AND language_name = NEW.language_name
                AND DATE(created_at) = CURRENT_DATE
            ),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for analytics updates
CREATE TRIGGER trigger_update_daily_analytics
    AFTER INSERT ON public.poll_analytics
    FOR EACH ROW EXECUTE FUNCTION update_daily_analytics();

-- 9. Create function to record poll creation analytics
CREATE OR REPLACE FUNCTION record_poll_creation(
    p_user_id UUID,
    p_poll_id UUID,
    p_languages TEXT[]
) RETURNS VOID AS $$
DECLARE
    lang TEXT;
BEGIN
    -- Record poll creation
    INSERT INTO public.poll_analytics (metric_type, user_id, poll_id)
    VALUES ('poll_created', p_user_id, p_poll_id);

    -- Record language mentions
    IF p_languages IS NOT NULL THEN
        FOREACH lang IN ARRAY p_languages LOOP
            INSERT INTO public.poll_analytics (metric_type, language_name, user_id, poll_id)
            VALUES ('language_mentioned', lang, p_user_id, p_poll_id);
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create view for simplified analytics dashboard
CREATE OR REPLACE VIEW public.analytics_dashboard AS
SELECT 
    da.date,
    da.metric_type,
    da.language_name,
    da.total_value,
    da.unique_users,
    CASE 
        WHEN da.language_name IS NOT NULL 
        THEN pl.display_name 
        ELSE NULL 
    END as display_name
FROM public.daily_analytics da
LEFT JOIN public.programming_languages pl ON da.language_name = pl.name
ORDER BY da.date DESC, da.metric_type, da.total_value DESC;

-- 11. Create RPC functions for incrementing counters (used by the app)
CREATE OR REPLACE FUNCTION increment_daily_metrics(
    p_metric_type TEXT,
    p_language_name TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.daily_analytics (date, metric_type, language_name, total_value, unique_users)
    VALUES (CURRENT_DATE, p_metric_type, p_language_name, 1, 1)
    ON CONFLICT (date, metric_type, language_name)
    DO UPDATE SET 
        total_value = daily_analytics.total_value + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_language_demand(
    p_language_name TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.daily_analytics (date, metric_type, language_name, total_value, unique_users)
    VALUES (CURRENT_DATE, 'language_demand', p_language_name, 1, 1)
    ON CONFLICT (date, metric_type, language_name)
    DO UPDATE SET 
        total_value = daily_analytics.total_value + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.daily_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.poll_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;
GRANT SELECT ON public.programming_languages TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_daily_metrics(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_language_demand(TEXT) TO authenticated;