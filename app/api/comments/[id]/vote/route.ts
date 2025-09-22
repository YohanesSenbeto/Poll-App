import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerComponentClient({ cookies });
    const { id: commentId } = await params;
    const { voteType } = await request.json();

    if (!commentId || voteType === undefined || ![1, -1].includes(voteType)) {
      return NextResponse.json({ error: 'Comment ID and valid vote type are required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if comment exists and is not deleted
    let comment = null;
    try {
      const { data: commentData } = await supabase
        .from('"comments"')
        .select('id, is_deleted')
        .eq('id', commentId)
        .single();

      comment = commentData;
    } catch (error) {
      console.error('Error fetching comment:', error);
      return NextResponse.json({
        error: 'Comment not found or database error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 404 });
    }

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.is_deleted) {
      return NextResponse.json({ error: 'Cannot vote on deleted comments' }, { status: 400 });
    }

    // Check if user already voted
    let existingVote = null;
    try {
      const { data: voteData } = await supabase
        .from('"comment_votes"')
        .select('id, vote_type')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

      existingVote = voteData;
    } catch (error) {
      // Vote doesn't exist, which is fine
    }

    if (existingVote) {
      // If same vote, remove it (toggle off)
      if (existingVote.vote_type === voteType) {
        let deleteError = null;
        try {
          const { error } = await supabase
            .from('"comment_votes"')
            .delete()
            .eq('id', existingVote.id);

          deleteError = error;
        } catch (error) {
          deleteError = error;
        }

        if (deleteError) {
          console.error('Error removing vote:', deleteError);
          return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
        }

        return NextResponse.json({ success: true, action: 'removed' });
      } else {
        // If different vote, update it
        let updateError = null;
        try {
          const { error } = await supabase
            .from('"comment_votes"')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

          updateError = error;
        } catch (error) {
          updateError = error;
        }

        if (updateError) {
          console.error('Error updating vote:', updateError);
          return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
        }

        return NextResponse.json({ success: true, action: 'updated' });
      }
    } else {
      // Create new vote
      let insertError = null;
      try {
        const { error } = await supabase
          .from('"comment_votes"')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            vote_type: voteType
          });

        insertError = error;
      } catch (error) {
        insertError = error;
      }

      if (insertError) {
        console.error('Error creating vote:', insertError);
        return NextResponse.json({ error: 'Failed to create vote' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'created' });
    }

  } catch (error) {
    console.error('Comment vote error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
