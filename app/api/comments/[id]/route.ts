import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: commentId } = await params;
    const { content } = await request.json();

    if (!commentId || !content) {
      return NextResponse.json({ error: 'Comment ID and content are required' }, { status: 400 });
    }

    console.log('Edit API: Attempting to edit comment:', commentId);

    const supabaseAuth = await createServerClient();

    // Get current user for authorization
    const { data: { session }, error: authError } = await supabaseAuth.auth.getSession();
    const user = session?.user;
    
    if (authError || !user) {
      console.log('Edit API: User not authenticated');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if comment exists and user owns it
    const { data: comment, error: fetchError } = await supabaseAuth
      .from('comments')
      .select('user_id, is_deleted')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.log('Edit API: Comment not found:', fetchError);
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user owns the comment
    if (comment.user_id !== user.id) {
      console.log('Edit API: User does not own comment');
      return NextResponse.json({ error: 'Not authorized to edit this comment' }, { status: 403 });
    }

    // Update the comment
    const { error: updateError } = await supabaseAuth
      .from('comments')
      .update({ 
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (updateError) {
      console.error('Edit API: Error updating comment:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update comment',
        details: updateError.message
      }, { status: 500 });
    }

    console.log('Edit API: Comment updated successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Comment updated successfully',
      commentId: commentId,
      content: content.trim()
    });

  } catch (error) {
    console.error('Edit API: Exception:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: commentId } = await params;

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    console.log('Delete API: Attempting to delete comment:', commentId);

    const supabaseAuth = await createServerClient();

    // Get current user for authorization
    const { data: { session }, error: authError } = await supabaseAuth.auth.getSession();
    const user = session?.user;
    
    console.log('Delete API: Auth check result:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.log('Delete API: User not authenticated');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if comment exists and user owns it
    const { data: comment, error: fetchError } = await supabaseAuth
      .from('comments')
      .select('user_id, is_deleted')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.log('Delete API: Comment not found:', fetchError);
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user owns the comment
    if (comment.user_id !== user.id) {
      console.log('Delete API: User does not own comment');
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 });
    }

    // Hard delete the comment (remove from database)
    console.log('Delete API: Attempting hard delete for comment:', commentId);
    const { error: deleteError } = await supabaseAuth
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Delete API: Error deleting comment:', deleteError);
      console.error('Delete API: Error code:', deleteError.code);
      console.error('Delete API: Error message:', deleteError.message);
      return NextResponse.json({ 
        error: 'Failed to delete comment',
        details: deleteError.message,
        code: deleteError.code
      }, { status: 500 });
    }

    console.log('Delete API: Comment successfully deleted from database');

    console.log('Delete API: Comment deleted successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Comment deleted successfully',
      commentId: commentId
    });

  } catch (error) {
    console.error('Delete API: Exception:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}