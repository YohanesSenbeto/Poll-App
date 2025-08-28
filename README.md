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
