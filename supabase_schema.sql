-- Supabase Database Schema for Poll Application
-- This script sets up the complete database structure for the poll app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create polls table
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create options table
CREATE TABLE IF NOT EXISTS public.options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
    text VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
    option_id UUID REFERENCES public.options(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, poll_id) -- Ensure one vote per user per poll
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for polls updated_at
CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON public.polls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polls table
-- Allow users to view all active polls
CREATE POLICY "Users can view active polls" ON public.polls
    FOR SELECT USING (is_active = true);

-- Allow users to view their own polls (including inactive)
CREATE POLICY "Users can view own polls" ON public.polls
    FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated users to create polls
CREATE POLICY "Authenticated users can create polls" ON public.polls
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own polls
CREATE POLICY "Users can update own polls" ON public.polls
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own polls
CREATE POLICY "Users can delete own polls" ON public.polls
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for options table
-- Allow users to view options for visible polls
CREATE POLICY "Users can view options for visible polls" ON public.options
    FOR SELECT USING (
        poll_id IN (
            SELECT id FROM public.polls 
            WHERE is_active = true OR user_id = auth.uid()
        )
    );

-- Allow users to create options for their own polls
CREATE POLICY "Users can create options for own polls" ON public.options
    FOR INSERT WITH CHECK (
        poll_id IN (
            SELECT id FROM public.polls 
            WHERE user_id = auth.uid()
        )
    );

-- Allow users to update options for their own polls
CREATE POLICY "Users can update options for own polls" ON public.options
    FOR UPDATE USING (
        poll_id IN (
            SELECT id FROM public.polls 
            WHERE user_id = auth.uid()
        )
    );

-- Allow users to delete options for their own polls
CREATE POLICY "Users can delete options for own polls" ON public.options
    FOR DELETE USING (
        poll_id IN (
            SELECT id FROM public.polls 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for votes table
-- Allow users to view votes for visible polls
CREATE POLICY "Users can view votes for visible polls" ON public.votes
    FOR SELECT USING (
        poll_id IN (
            SELECT id FROM public.polls 
            WHERE is_active = true OR user_id = auth.uid()
        )
    );

-- Allow authenticated users to vote
CREATE POLICY "Authenticated users can vote" ON public.votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own votes
CREATE POLICY "Users can delete own votes" ON public.votes
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_user_id ON public.polls(user_id);
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON public.polls(is_active);
CREATE INDEX IF NOT EXISTS idx_options_poll_id ON public.options(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON public.votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_option_id ON public.votes(option_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_poll ON public.votes(user_id, poll_id);

-- Create view for poll statistics
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

-- Create function to get poll results
CREATE OR REPLACE FUNCTION public.get_poll_results(poll_uuid UUID)
RETURNS TABLE (
    option_id UUID,
    option_text VARCHAR(255),
    vote_count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as option_id,
        o.text as option_text,
        COUNT(v.id) as vote_count,
        CASE 
            WHEN total_votes.total = 0 THEN 0
            ELSE ROUND((COUNT(v.id)::NUMERIC / total_votes.total) * 100, 2)
        END as percentage
    FROM public.options o
    LEFT JOIN public.votes v ON o.id = v.option_id
    CROSS JOIN (
        SELECT COUNT(*) as total 
        FROM public.votes 
        WHERE poll_id = poll_uuid
    ) total_votes
    WHERE o.poll_id = poll_uuid
    GROUP BY o.id, o.text, total_votes.total
    ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;