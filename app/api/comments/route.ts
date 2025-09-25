import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await createServerClient();
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    const recent = searchParams.get('recent');
    
    console.log('API: Request URL:', request.url);
    console.log('API: Extracted pollId:', pollId);
    console.log('API: Recent request:', recent);
    console.log('API: pollId type:', typeof pollId);
    console.log('API: pollId value:', JSON.stringify(pollId));

    // Handle recent comments request
    if (recent === 'true') {
      console.log('API: Fetching recent comments from all polls');
      let commentsData: any[] = [];
      let commentsError: any = null;
      
      try {
        const result = await supabaseAuth
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
            is_edited,
            reply_count,
            like_count,
            dislike_count
          `)
          .eq('is_deleted', false)
          .is('parent_id', null) // Only root comments for featured section
          .order('created_at', { ascending: false })
          .limit(5); // Limit to 5 most recent comments
        
        commentsData = result.data || [];
        commentsError = result.error;
      } catch (error) {
        console.log('API: Comments table not available for recent comments');
        commentsError = error;
      }

      if (commentsError) {
        console.log('API: Recent comments query error:', commentsError);
        
        // If table doesn't exist, return empty comments
        if (commentsError.code === 'PGRST116' || commentsError.message?.includes('Could not find the table')) {
          console.log('API: Comments table not found, returning empty comments');
          return NextResponse.json({ comments: [] });
        }
        
        return NextResponse.json({ 
          error: 'Failed to fetch recent comments',
          details: commentsError.message,
          code: commentsError.code
        }, { status: 500 });
      }

      console.log('API: Found recent comments:', commentsData?.length);
      console.log('API: Comments data:', commentsData?.map(c => ({ id: c.id, user_id: c.user_id, content: c.content?.substring(0, 50), is_deleted: c.is_deleted })));

      // Get user profiles for all comment authors
      const userIds = Array.from(new Set(commentsData?.map(c => c.user_id) || []));
      console.log('API: User IDs from recent comments:', userIds);
      
      let authorMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabaseAuth
          .from('user_profiles')
          .select('id, email, display_name, username, avatar_url')
          .in('id', userIds);

        console.log('API: Profile query result for recent comments:', profiles?.length, 'profiles, error:', profileError?.message);

        if (profileError) {
          console.log('API: Profile query error for recent comments:', profileError);
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
          console.log('API: Author map created for recent comments:', authorMap);
        }
      }

      // Combine comments with author data
      const commentsWithAuthors = (commentsData || []).map((c: any) => ({
        ...c,
        author: authorMap[c.user_id] || null,
        votes: { upvotes: 0, downvotes: 0, user_vote: null }
      }));

      console.log('API: Final recent comments with authors:', commentsWithAuthors.map(c => ({
        id: c.id,
        user_id: c.user_id,
        author: c.author,
        content: c.content?.substring(0, 50)
      })));

      return NextResponse.json({ comments: commentsWithAuthors });
    }

    // Handle specific poll comments request
    if (!pollId) {
      console.log('API: No pollId found, returning error');
      return NextResponse.json({ error: 'Poll ID is required' }, { status: 400 });
    }

    // Get comments from database (best-effort, table might not exist)
    console.log('API: Fetching comments for pollId:', pollId);
    let commentsData: any[] = [];
    let commentsError: any = null;
    
    try {
      let query = supabaseAuth
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
          is_edited,
          reply_count,
          like_count,
          dislike_count
        `)
        .eq('is_deleted', false);

      // Handle community discussion (poll_id = null) vs specific polls
      // For community discussion, we need to fetch both root comments (poll_id = null) 
      // and replies to those comments (which also have poll_id = null)
      if (pollId === "community-discussion") {
        query = query.is('poll_id', null);
        console.log('API: Fetching community discussion comments (poll_id = null)');
      } else {
        query = query.eq('poll_id', pollId);
        console.log('API: Fetching comments for specific poll:', pollId);
      }

      const result = await query.order('created_at', { ascending: false });
      
      commentsData = result.data || [];
      commentsError = result.error;
    } catch (error) {
      console.log('API: Comments table not available, returning empty comments');
      commentsError = error;
    }

    if (commentsError) {
      console.log('API: Comments query error:', commentsError);
      console.log('API: Comments error details:', commentsError.message, commentsError.code);
      
      // If table doesn't exist, return empty comments instead of error
      if (commentsError.code === 'PGRST116' || commentsError.message?.includes('Could not find the table')) {
        console.log('API: Comments table not found, returning empty comments');
        return NextResponse.json({ comments: [] });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch comments',
        details: commentsError.message,
        code: commentsError.code
      }, { status: 500 });
    }

    console.log('API: Found comments:', commentsData?.length);
    console.log('API: Comments data:', commentsData?.map(c => ({
      id: c.id,
      content: c.content?.substring(0, 30),
      parent_id: c.parent_id,
      poll_id: c.poll_id,
      is_deleted: c.is_deleted
    })));
    
    // Separate root comments and replies for debugging
    const rootComments = commentsData?.filter(c => !c.parent_id) || [];
    const replies = commentsData?.filter(c => c.parent_id) || [];
    console.log('API: Root comments:', rootComments.length);
    console.log('API: Replies:', replies.length);
    console.log('API: Reply details:', replies.map(r => ({
      id: r.id,
      parent_id: r.parent_id,
      content: r.content?.substring(0, 20)
    })));

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

    // Get vote data for current user (if authenticated)
    let userVotes: Record<string, number> = {};
    const { data: { session } } = await supabaseAuth.auth.getSession();
    const currentUser = session?.user;
    
    if (currentUser && commentsData.length > 0) {
      const commentIds = commentsData.map(c => c.id);
      const { data: votes, error: votesError } = await supabaseAuth
        .from('comment_votes')
        .select('comment_id, vote_type')
        .eq('user_id', currentUser.id)
        .in('comment_id', commentIds);
      
      if (votes) {
        userVotes = votes.reduce((acc: Record<string, number>, vote: any) => {
          acc[vote.comment_id] = vote.vote_type;
          return acc;
        }, {} as Record<string, number>);
      }
      
      console.log('API: User votes fetched:', Object.keys(userVotes).length, 'votes');
    }

    // Combine comments with author data and vote data
    const commentsWithAuthors = (commentsData || []).map((c: any) => ({
      ...c,
      author: authorMap[c.user_id] || null,
      votes: { 
        upvotes: c.like_count || 0, 
        downvotes: c.dislike_count || 0, 
        user_vote: userVotes[c.id] || null 
      }
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
  console.log('=== API ROUTE START ===');
  console.log('API: POST request received at:', new Date().toISOString());
  
  try {
    
    let supabaseAuth;
    try {
      supabaseAuth = await createServerClient();
      console.log('API: Supabase client created successfully');
    } catch (clientError) {
      console.error('API: Failed to create Supabase client:', clientError);
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Failed to initialize database connection'
      }, { status: 500 });
    }
    
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('API: Request body parsed successfully');
    } catch (parseError) {
      console.error('API: Failed to parse request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: 'Request must be valid JSON'
      }, { status: 400 });
    }
    
    const { pollId, content, parentId } = requestBody;
    console.log('API: Request body parsed:', { pollId, content: content?.substring(0, 50), parentId });

    // Validate input
    if (!pollId || !content) {
      return NextResponse.json({ error: 'Poll ID and content are required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment must be less than 1000 characters' }, { status: 400 });
    }

    // Get current user - authentication required
    const { data: { session }, error: authError } = await supabaseAuth.auth.getSession();
    const user = session?.user;
    
    console.log('API: Auth check result:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      authError: authError?.message,
      sessionExists: !!session
    });
    console.log('API: Request data:', { pollId, content: content.substring(0, 50), parentId });
    
    // Require authentication
    if (!user) {
      console.log('API: User not authenticated - returning 401');
      return NextResponse.json({ 
        error: 'Authentication required to post comments',
        details: authError?.message || 'No valid session found'
      }, { status: 401 });
    }

    // Authenticated user
    console.log('API: Processing authenticated user comment');
    const userId = user.id;
    
    // Get user profile data
    const { data: profile, error: profileError } = await supabaseAuth
      .from('user_profiles')
      .select('display_name, username, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    
    console.log('API: User profile data:', profile, 'Error:', profileError);
    
    // Set author data from profile or fallback to user metadata
    let authorData = {
      display_name: profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.username || user.email,
      username: profile?.username || user.user_metadata?.username || user.email,
      email: user.email,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null
    };

    // Handle special community discussion poll
    if (pollId === "community-discussion") {
      console.log('API: Processing community discussion comment');
      // For community discussion, we'll skip poll validation
      // This allows general community comments without requiring a specific poll
    } else {
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
    }

    // Insert comment (best-effort, table might not exist)
    let comment: any = null;
    let insertError: any = null;
    
    try {
      console.log('API: Attempting to insert comment:', {
        poll_id: pollId === "community-discussion" ? null : pollId,
        user_id: userId,
        parent_id: parentId || null,
        content: content.trim()
      });
      
      const result = await supabaseAuth
        .from('comments')
        .insert({
          poll_id: pollId === "community-discussion" ? null : pollId,
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
      
      // If this is a reply, update the parent's reply count
      if (parentId && result.data) {
        console.log('API: Updating reply count for parent:', parentId);
        // Get current reply count and increment it
        const { data: parentComment, error: fetchError } = await supabaseAuth
          .from('comments')
          .select('reply_count')
          .eq('id', parentId)
          .single();
        
        if (!fetchError && parentComment) {
          const { error: updateError } = await supabaseAuth
            .from('comments')
            .update({ 
              reply_count: (parentComment.reply_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', parentId);
          
          if (updateError) {
            console.error('API: Error updating reply count:', updateError);
          } else {
            console.log('API: Reply count updated successfully');
          }
        }
      }
      
      console.log('API: Insert result:', result);
      comment = result.data;
      insertError = result.error;
    } catch (error) {
      console.log('API: Comments table not available for insert');
      console.log('API: Insert error:', error);
      insertError = error;
    }

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      console.error('Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // If table doesn't exist, return a helpful message
      if (insertError.code === 'PGRST116' || insertError.message?.includes('Could not find the table')) {
        return NextResponse.json({ 
          error: 'Comments system is not available yet',
          details: 'The comments feature is being set up. Please try again later.',
          code: insertError.code
        }, { status: 503 });
      }
      
      // Return detailed error information
      return NextResponse.json({ 
        error: 'Failed to create comment',
        details: insertError.message || 'Unknown error occurred',
        code: insertError.code,
        hint: insertError.hint
      }, { status: 500 });
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

    const upvotes = votes?.filter((v: any) => v.vote_type === 1).length || 0;
    const downvotes = votes?.filter((v: any) => v.vote_type === -1).length || 0;

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
    console.error('=== API ROUTE ERROR ===');
    console.error('API: Exception:', error);
    console.error('API: Exception details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
