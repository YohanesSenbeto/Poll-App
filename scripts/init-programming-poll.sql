-- Initialize Programming Language Poll
-- Run this in Supabase SQL Editor to create the poll for testing

-- Create the programming languages poll
INSERT INTO public.polls (id, title, description, user_id, is_active, created_at, updated_at)
VALUES (
    '950cd588-0ffc-4cdb-8fdf-039318533ada',
    'Programming Language Popularity',
    'Vote for your favorite programming language',
    (SELECT id FROM auth.users LIMIT 1),
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = NOW();

-- Insert initial programming language options
INSERT INTO public.options (poll_id, text, created_at) VALUES
    ('950cd588-0ffc-4cdb-8fdf-039318533ada', 'JavaScript', NOW()),
    ('950cd588-0ffc-4cdb-8fdf-039318533ada', 'Python', NOW()),
    ('950cd588-0ffc-4cdb-8fdf-039318533ada', 'TypeScript', NOW())
ON CONFLICT (poll_id, text) DO NOTHING;

-- Verify the poll was created
SELECT p.id, p.title, p.description, p.is_active,
       COUNT(o.id) as option_count
FROM public.polls p
LEFT JOIN public.options o ON p.id = o.poll_id
WHERE p.id = '950cd588-0ffc-4cdb-8fdf-039318533ada'
GROUP BY p.id, p.title, p.description, p.is_active;
