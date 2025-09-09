-- Fix for existing trigger issue
-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_update_daily_analytics ON public.poll_analytics;

-- Recreate the function and trigger
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily poll creation count
    IF NEW.metric_type = 'poll_created' THEN
        INSERT INTO public.daily_analytics (date, metric_type, language_name, total_value, unique_users)
        VALUES (CURRENT_DATE, 'poll_created', NULL, 1, 1)
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

-- Recreate trigger
CREATE TRIGGER trigger_update_daily_analytics
    AFTER INSERT ON public.poll_analytics
    FOR EACH ROW EXECUTE FUNCTION update_daily_analytics();