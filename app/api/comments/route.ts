import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Use server auth client to ensure RLS/session context is respected
    const cookieStore = await cookies();
    const supabaseAuth = createServerComponentClient({ cookies });
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');

    if (!pollId) {
      return NextResponse.json({ error: 'Poll ID is required' }, { status: 400 });
    }

    // Get comments (return basic fields; do not over-filter)
    console.log('API: Fetching comments for pollId:', pollId);
    const { data: comments, error } = await supabaseAuth
      .from('comments')
      .select('id, content, user_id, created_at, updated_at, poll_id, parent_id, is_deleted')
      .eq('poll_id', pollId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    console.log('API: Query result - comments:', comments?.length, 'error:', error?.message);
    console.log('API: Comments data:', comments?.map(c => ({ id: c.id, deleted: c.is_deleted, content: c.content?.substring(0, 50) })));

    // Directly return active comments
    const activeComments = comments || [];
    console.log('API: Active comments after filtering:', activeComments.length);

    if (error) {
      console.log('API: Error occurred:', error);
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('Could not find the table')) {
        console.log('API: Table not found error, returning empty array');
        return NextResponse.json({ comments: [] });
      }

      return NextResponse.json({
        error: 'Failed to fetch comments',
        details: error.message || 'Unknown error'
      }, { status: 500 });
    }

    // Attach basic author info (email/full_name) to each comment
    const userIds = Array.from(new Set(activeComments.map((c: any) => c.user_id)));
    let authorMap: Record<string, { email?: string; display_name?: string; username?: string; avatar_url?: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAuth
        .from('user_profiles')
        .select('id, email, display_name, username, avatar_url')
        .in('id', userIds);

      if (profiles && profiles.length > 0) {
        authorMap = profiles.reduce((acc: any, p: any) => {
          acc[p.id] = { email: p.email, display_name: p.display_name, username: p.username, avatar_url: p.avatar_url };
          return acc;
        }, {} as Record<string, { email?: string; display_name?: string; username?: string; avatar_url?: string }>);
      }
    }

    const withAuthor = activeComments.map((c: any) => ({
      ...c,
      author: authorMap[c.user_id] || null,
    }));

    // Return comments with author info
    return NextResponse.json({ comments: withAuthor });

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerComponentClient({ cookies });
    const { pollId, content, parentId } = await request.json();

    // Validate input
    if (!pollId || !content) {
      return NextResponse.json({ error: 'Poll ID and content are required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment must be less than 1000 characters' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can comment on this poll
    const { data: poll, error: pollError } = await supabaseAuth
      .from('polls')
      .select('is_active, user_id')
      .eq('id', pollId)
      .single();

    if (pollError) {
      console.error('Error fetching poll:', pollError);
      return NextResponse.json({
        error: 'Error fetching poll',
        details: pollError.message
      }, { status: 404 });
    }
    
    if (!poll.is_active && poll.user_id !== user.id) {
      return NextResponse.json({ error: 'Cannot comment on inactive polls' }, { status: 403 });
    }

    // Insert comment

    const { data: comment, error: insertError } = await supabaseAuth
      .from('comments')
      .insert({
        poll_id: pollId,
        user_id: user.id,
        parent_id: parentId || null,
        content: content.trim()
      })
      .select(`
        *,
        user_id
      `)
      .single();

    if (insertError) {
      // If table doesn't exist, return helpful error message
      if (insertError.code === '42P01' || insertError.message?.includes('does not exist') || insertError.message?.includes('Could not find the table')) {
        return NextResponse.json({
          error: 'Comments system not yet set up',
          details: 'Please run the database setup script to create the comments tables'
        }, { status: 503 });
      }

      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Get vote count for the new comment
    let votes = null;
    try {
      const { data: votesData } = await supabaseAuth
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', comment.id);

      votes = votesData;
    } catch (error) {
      console.warn('Error fetching comment votes:', error);
    }

    const upvotes = votes?.filter(v => v.vote_type === 1).length || 0;
    const downvotes = votes?.filter(v => v.vote_type === -1).length || 0;

    const commentWithVotes = {
      ...comment,
      votes: {
        upvotes,
        downvotes,
        user_vote: null
      }
    };

    return NextResponse.json(commentWithVotes);

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
