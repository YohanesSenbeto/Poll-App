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

TypeScript types are available in `types/database.ts` for full type safety when interacting with the database.