import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const { voteType } = await request.json();

    if (!commentId || !voteType || ![-1, 1].includes(voteType)) {
      return NextResponse.json({ 
        error: 'Comment ID and vote type (1 or -1) are required' 
      }, { status: 400 });
    }

    console.log('Vote API: Processing vote for comment:', commentId, 'voteType:', voteType);

    const supabaseAuth = await createServerClient();

    // Get current user for authorization
    const { data: { session }, error: authError } = await supabaseAuth.auth.getSession();
    const user = session?.user;
    
    if (authError || !user) {
      console.log('Vote API: User not authenticated');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('Vote API: User authenticated:', user.id);

    // Check if comment exists
    const { data: comment, error: commentError } = await supabaseAuth
      .from('comments')
      .select('id, user_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      console.log('Vote API: Comment not found:', commentError);
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user already voted on this comment
    const { data: existingVote, error: voteCheckError } = await supabaseAuth
      .from('comment_votes')
      .select('id, vote_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();

    console.log('Vote API: Existing vote check:', { existingVote, voteCheckError });

    let result;
    let action;

    if (existingVote) {
      // User already voted
      if (existingVote.vote_type === voteType) {
        // Same vote type - remove the vote
        const { error: deleteError } = await supabaseAuth
          .from('comment_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          console.error('Vote API: Error removing vote:', deleteError);
          return NextResponse.json({ 
            error: 'Failed to remove vote',
            details: deleteError.message
          }, { status: 500 });
        }

        action = 'removed';
        console.log('Vote API: Vote removed');
      } else {
        // Different vote type - update the vote
        const { error: updateError } = await supabaseAuth
          .from('comment_votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);

        if (updateError) {
          console.error('Vote API: Error updating vote:', updateError);
          return NextResponse.json({ 
            error: 'Failed to update vote',
            details: updateError.message
          }, { status: 500 });
        }

        action = 'updated';
        console.log('Vote API: Vote updated');
      }
    } else {
      // New vote
      const { error: insertError } = await supabaseAuth
        .from('comment_votes')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          vote_type: voteType
        });

      if (insertError) {
        console.error('Vote API: Error inserting vote:', insertError);
        return NextResponse.json({ 
          error: 'Failed to create vote',
          details: insertError.message
        }, { status: 500 });
      }

      action = 'created';
      console.log('Vote API: Vote created');
    }

    // Get updated vote counts
    const { data: updatedComment, error: fetchError } = await supabaseAuth
      .from('comments')
      .select('like_count, dislike_count')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('Vote API: Error fetching updated counts:', fetchError);
    }

    console.log('Vote API: Vote processed successfully, action:', action);
    return NextResponse.json({ 
      success: true, 
      action: action,
      likeCount: updatedComment?.like_count || 0,
      dislikeCount: updatedComment?.dislike_count || 0
    });

  } catch (error) {
    console.error('Vote API: Exception:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}