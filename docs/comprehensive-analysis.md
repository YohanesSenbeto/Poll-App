This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase Authentication Setup

This app now includes full Supabase authentication integration.

### Setup Instructions

1. **Create Supabase Project**:

    - Go to [supabase.com](https://supabase.com) and create a new project
    - Copy your project URL and anon key from project settings

2. **Configure Environment**:
   Update `.env.local` with your Supabase credentials:

    ```
    NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
    ```

3. **Enable Authentication**:

    - In Supabase dashboard, go to Authentication > Providers
    - Enable Email authentication
    - Configure any additional providers as needed

4. **Database Schema** (optional for polls):

    ```sql
    CREATE TABLE polls (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      options JSONB NOT NULL,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE votes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
      option_index INTEGER NOT NULL,
      user_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(poll_id, user_id)
    );
    ```

### Authentication Features

-   **Login/Register Pages**: Secure authentication with email/password
-   **Protected Routes**: Automatic redirects for unauthenticated users
-   **User State Management**: Real-time auth state across the app
-   **Responsive Navbar**: Shows user info and logout when authenticated
-   **Middleware Protection**: Server-side route protection

### Project Structure

-   `/app/auth-context.tsx` - Authentication context provider
-   `/app/auth/login/page.tsx` - Login page with Supabase auth
-   `/app/auth/register/page.tsx` - Registration page with Supabase auth
-   `/components/navbar.tsx` - Responsive navigation with auth state
-   `/components/protected-route.tsx` - Component for protecting routes
-   `/lib/supabase.ts` - Supabase client configuration
-   `/middleware.ts` - Route protection middleware
# Supabase Setup Guide for Poll App

This guide will help you set up the database schema for your poll application using Supabase.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key to `.env.local`

## Step 2: Database Schema Setup

### Option 1: Using SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the sidebar
3. Copy and paste the contents of `supabase_schema.sql`
4. Click **Run** to execute the SQL commands

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db reset
supabase db push
```

## Step 3: Environment Variables

Ensure your `.env.local` file has these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Row Level Security (RLS)

The schema includes RLS policies that:
- Allow anyone to view polls and options
- Only authenticated users can create polls and vote
- Users can only modify their own polls
- Users can only vote once per poll

## Step 5: Testing the Setup

### Test Database Connection

You can test the connection by running:

```bash
npm run dev
```

### Test Creating a Poll

1. Log in to your application
2. Navigate to `/polls/create`
3. Create a test poll with multiple options
4. Check if the poll appears in your Supabase dashboard

### Test Voting

1. Create a poll
2. Vote on one of the options
3. Verify the vote is recorded in the `votes` table

## Database Structure

### Tables

- **polls**: Stores poll questions and metadata
- **options**: Stores poll answer options
- **votes**: Stores user votes

### Views

- **poll_statistics**: Provides aggregated statistics for polls

### Functions

- **get_poll_results**: Returns vote counts and percentages for each option

## API Integration

The application uses the `lib/database.ts` file which provides:

- `createPoll()`: Create new polls with options
- `getPolls()`: Fetch all polls with options
- `getPollById()`: Get specific poll details
- `voteOnPoll()`: Submit a vote
- `getPollResults()`: Get poll results with percentages
- `getUserPolls()`: Get polls created by current user

## Troubleshooting

### Common Issues

1. **Authentication Error**: Ensure RLS policies are enabled
2. **Permission Denied**: Check if the user is authenticated
3. **Duplicate Votes**: The RLS policy prevents multiple votes from same user

### Debug Commands

You can use the Supabase dashboard to:
- View table data in **Table Editor**
- Test SQL queries in **SQL Editor**
- Check authentication in **Authentication**

## Next Steps

1. Add real-time subscriptions for live vote updates
2. Add poll categories/tags
3. Add poll expiration dates
4. Add user profiles and avatars
5. Add poll sharing functionality

## Database Types

TypeScript types are available in `types/database.ts` for full type safety when interacting with the database.-- Supabase Database Schema for Poll Application
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
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;{
  "name": "poll-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "node.exe node_modules/next/dist/bin/next dev",
    "build": "node.exe node_modules/next/dist/bin/next build",
    "start": "next start",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tabs": "^1.1.13",
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "@supabase/supabase-js": "^2.56.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.542.0",
    "next": "15.5.2",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "recharts": "^3.1.2",
    "tailwind-merge": "^3.3.1",
    "zod": "^4.1.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/jest": "^29.5.14",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "supabase": "^2.39.2",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.3.7",
    "typescript": "^5"
  }
}
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}


---


## Deep Analysis Tasks\n1. Supabase Integration\n2. Poll Data Flow\n3. User Management\n4. Recharts Readiness\n5. Role Management Potential\n6. Accessibility Audit\n\n## Recommendations\n- User roles in Supabase\n- Poll result charts with Recharts\n- Accessibility improvements\n- Testing strategy\n
