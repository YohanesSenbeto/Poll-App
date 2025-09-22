import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from('"comments"')
      .select('*')
      .eq('id', commentId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Error fetching comment:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      // If comment not found, return 404 instead of 500
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      return NextResponse.json({
        error: 'Failed to fetch comment',
        details: error.message || 'Unknown error'
      }, { status: 500 });
    }

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Get vote counts
    let votes = null;
    try {
      const { data: votesData } = await supabase
        .from('"comment_votes"')
        .select('vote_type, user_id')
        .eq('comment_id', commentId);

      votes = votesData;
    } catch (error) {
      console.warn('Error fetching comment votes:', error);
    }

    const upvotes = votes?.filter(v => v.vote_type === 1).length || 0;
    const downvotes = votes?.filter(v => v.vote_type === -1).length || 0;

    // Get current user vote
    const { data: { user } } = await supabase.auth.getUser();
    const userVote = user ? votes?.find(v => v.user_id === user.id)?.vote_type || null : null;

    const commentWithVotes = {
      ...comment,
      votes: {
        upvotes,
        downvotes,
        user_vote: userVote
      }
    };

    return NextResponse.json(commentWithVotes);

  } catch (error) {
    console.error('Comment GET error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerComponentClient({ cookies: () => cookieStore });
    const commentId = params.id;
    const { content } = await request.json();

    if (!commentId || !content) {
      return NextResponse.json({ error: 'Comment ID and content are required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment must be less than 1000 characters' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns the comment
    const { data: comment } = await supabase
      .from('"comments"')
      .select('user_id, is_deleted')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 });
    }

    if (comment.is_deleted) {
      return NextResponse.json({ error: 'Cannot edit deleted comments' }, { status: 400 });
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('"comments"')
      .update({
        content: content.trim(),
        is_edited: true
      })
      .eq('id', commentId)
      .select(`
        *,
        user:user_profiles(full_name, email)
      `)
      .single();

    if (updateError) {
      console.error('Error updating comment:', updateError);
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }

    return NextResponse.json(updatedComment);

  } catch (error) {
    console.error('Comment PUT error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerComponentClient({ cookies: () => cookieStore });
    const commentId = params.id;

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns the comment or is admin
    const { data: comment } = await supabase
      .from('"comments"')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'moderator';

    if (comment.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 });
    }

    // Soft delete comment (mark as deleted)
    const { error: deleteError } = await supabase
      .from('"comments"')
      .update({ is_deleted: true })
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Comment DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
