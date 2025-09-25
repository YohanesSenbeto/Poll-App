import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = createServerComponentClient({ 
      cookies: async () => await cookies()
    });
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    console.log('API: Request URL:', request.url);
    console.log('API: Extracted pollId:', pollId);

    if (!pollId) {
      console.log('API: No pollId found, returning error');
      return NextResponse.json({ error: 'Poll ID is required' }, { status: 400 });
    }

    // Get comments from database
    console.log('API: Fetching comments for pollId:', pollId);
    const { data: commentsData, error: commentsError } = await supabaseAuth
      .from('comments')
      .select(`
        id,
        content,
        user_id,
        created_at,
        updated_at,
        poll_id,
        parent_id,
        is_deleted,
        is_edited
      `)
      .eq('poll_id', pollId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.log('API: Comments query error:', commentsError);
      console.log('API: Comments error details:', commentsError.message, commentsError.code);
      return NextResponse.json({ 
        error: 'Failed to fetch comments',
        details: commentsError.message,
        code: commentsError.code
      }, { status: 500 });
    }

    console.log('API: Found comments:', commentsData?.length);

    // Get user profiles for all comment authors
    const userIds = Array.from(new Set(commentsData?.map(c => c.user_id) || []));
    console.log('API: User IDs from comments:', userIds);
    
    let authorMap: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseAuth
        .from('user_profiles')
        .select('id, email, display_name, username, avatar_url')
        .in('id', userIds);

      console.log('API: Profile query result:', profiles?.length, 'profiles, error:', profileError?.message);
      console.log('API: Profile data:', profiles);

      if (profileError) {
        console.log('API: Profile query error:', profileError);
        console.log('API: Profile error details:', profileError.message, profileError.code);
        // Continue without profiles - comments will show without author data
      }

      if (profiles && profiles.length > 0) {
        authorMap = profiles.reduce((acc: any, p: any) => {
          acc[p.id] = {
            email: p.email,
            display_name: p.display_name,
            username: p.username,
            avatar_url: p.avatar_url
          };
          return acc;
        }, {});
        console.log('API: Author map created:', authorMap);
      }
    }

    // Combine comments with author data
    const commentsWithAuthors = (commentsData || []).map((c: any) => ({
      ...c,
      author: authorMap[c.user_id] || null,
      votes: { upvotes: 0, downvotes: 0, user_vote: null }
    }));

    console.log('API: Final comments with authors:', commentsWithAuthors.map(c => ({
      id: c.id,
      user_id: c.user_id,
      author: c.author,
      content: c.content?.substring(0, 50)
    })));

    return NextResponse.json({ comments: commentsWithAuthors });

  } catch (error) {
    console.error('API: Exception:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createServerComponentClient({ 
      cookies: async () => await cookies()
    });
    const { pollId, content, parentId, guestName } = await request.json();

    // Validate input
    if (!pollId || !content) {
      return NextResponse.json({ error: 'Poll ID and content are required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment must be less than 1000 characters' }, { status: 400 });
    }

    // Get current user (or handle guest)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    let userId: string;
    let authorData: any = null;

    if (user) {
      // Authenticated user
      userId = user.id;
    } else {
      // Guest user
      if (!guestName || guestName.trim().length === 0) {
        return NextResponse.json({ error: 'Guest name is required for anonymous comments' }, { status: 400 });
      }
      
      // Create a deterministic user ID for guests
      const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      userId = `guest_${Buffer.from(guestName + clientIP).toString('base64').slice(0, 16)}`;
      
      // Set guest author data
      authorData = {
        display_name: guestName.trim(),
        username: guestName.trim(),
        email: null,
        avatar_url: null
      };
    }

    // Check if poll exists and is active
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
    
    // Allow commenting on active polls for everyone
    if (!poll.is_active) {
      return NextResponse.json({ error: 'Cannot comment on inactive polls' }, { status: 403 });
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabaseAuth
      .from('comments')
      .insert({
        poll_id: pollId,
        user_id: userId,
        parent_id: parentId || null,
        content: content.trim()
      })
      .select(`
        id,
        content,
        user_id,
        created_at,
        updated_at,
        poll_id,
        parent_id,
        is_deleted,
        is_edited
      `)
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Get author data for the new comment
    if (!authorData && user) {
      // Only fetch profile data for authenticated users who don't already have author data
      try {
        const { data: profile } = await supabaseAuth
          .from('user_profiles')
          .select('id, email, display_name, username, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          authorData = {
            email: profile.email,
            display_name: profile.display_name,
            username: profile.username,
            avatar_url: profile.avatar_url
          };
        }
      } catch (error) {
        console.warn('Error fetching author profile:', error);
      }
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

    const commentWithAuthorAndVotes = {
      ...comment,
      author: authorData,
      votes: {
        upvotes,
        downvotes,
        user_vote: null
      }
    };

    return NextResponse.json(commentWithAuthorAndVotes);

  } catch (error) {
    console.error('API: Exception:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
