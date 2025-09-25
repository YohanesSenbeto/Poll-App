"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FacebookCommentForm } from "./facebook-comment-form";
import { FacebookComment } from "./facebook-comment";
import { useAuth } from "@/app/auth-context";
import { MessageSquare, RefreshCw, Loader2, AlertCircle } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  poll_id: string;
  parent_id?: string;
  reply_count?: number;
  like_count?: number;
  dislike_count?: number;
  author?: {
    email?: string;
    display_name?: string;
    username?: string;
    avatar_url?: string;
  } | null;
  votes?: {
    upvotes: number;
    downvotes: number;
    user_vote: number | null;
  };
  replies?: Comment[];
}

interface CommentListProps {
  pollId: string;
  className?: string;
}

export function CommentList({ pollId, className = "" }: CommentListProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});

  console.log('CommentList: Component rendered with pollId:', pollId);


  // Fetch comments
  const fetchComments = async () => {
    if (!pollId) {
      console.log('CommentList: No pollId provided, skipping fetch');
      return;
    }
    
    try {
      setError(null);
      console.log('CommentList: Fetching comments for pollId:', pollId);
      console.log('CommentList: pollId type:', typeof pollId);
      console.log('CommentList: pollId length:', pollId?.length);
      console.log('CommentList: pollId value:', JSON.stringify(pollId));
      const apiUrl = `/api/comments?pollId=${pollId}`;
      console.log('CommentList: API URL:', apiUrl);
      console.log('CommentList: About to make API call...');
      const response = await fetch(apiUrl);
      console.log('CommentList: API response status:', response.status);
      console.log('CommentList: API response URL:', response.url);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON, create a basic error object
          errorData = { error: 'Unknown error occurred' };
        }
        
        console.error('CommentList: API error:', errorData);

        // If it's a table not found error, just show empty comments
        if (response.status === 500 && errorData.details?.includes('Could not find the table')) {
          setComments([]);
          return;
        }

        // If it's a service unavailable error (table not set up), show helpful message
        if (response.status === 503) {
          setError('Comments system is being set up. Please try again later.');
          return;
        }

        // Handle empty error objects gracefully
        if (Object.keys(errorData).length === 0) {
          setError('Unable to load comments. Please try again later.');
          return;
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('CommentList: API Response data:', data);
      console.log('CommentList: Comments from API:', data.comments?.length || 0);
      console.log('CommentList: Sample comment with author:', data.comments?.[0]);
      console.log('CommentList: First comment author data:', data.comments?.[0]?.author);
      console.log('CommentList: First comment user_id:', data.comments?.[0]?.user_id);
      setComments(data.comments || []);
    } catch (error) {
      console.error('CommentList: Fetch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load comments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (pollId) {
      fetchComments();
    }
  }, [pollId]);

  // Vote on comment
  const handleVote = async (commentId: string, voteType: 1 | -1) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voteType }),
      });

      if (response.ok) {
        // Update the specific comment's vote count in state instead of refetching all
        const data = await response.json();
        if (data.success) {
          setComments(prevComments => 
            prevComments.map(comment => {
              if (comment.id === commentId) {
                const currentVote = comment.votes?.user_vote || 0;
                let newUpvotes = comment.votes?.upvotes || 0;
                let newDownvotes = comment.votes?.downvotes || 0;
                let newUserVote: number | null = null;

                if (data.action === 'removed') {
                  // Vote was removed
                  if (currentVote === 1) newUpvotes--;
                  if (currentVote === -1) newDownvotes--;
                } else if (data.action === 'updated') {
                  // Vote was changed
                  if (currentVote === 1) newUpvotes--;
                  if (currentVote === -1) newDownvotes--;
                  if (voteType === 1) newUpvotes++;
                  if (voteType === -1) newDownvotes++;
                  newUserVote = voteType;
                } else if (data.action === 'created') {
                  // New vote was created
                  if (voteType === 1) newUpvotes++;
                  if (voteType === -1) newDownvotes++;
                  newUserVote = voteType;
                }

                return {
                  ...comment,
                  votes: {
                    upvotes: newUpvotes,
                    downvotes: newDownvotes,
                    user_vote: newUserVote
                  }
                };
              }
              return comment;
            })
          );
        }
      } else {
        console.error('Failed to vote on comment');
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
    }
  };

  // Handle reply
  const handleReply = (commentId: string) => {
    // This could scroll to the reply form or open it
    console.log('Reply to comment:', commentId);
  };

  // Handle edit
  const handleEdit = (commentId: string) => {
    console.log('Edit comment:', commentId);
    // Refresh comments to show updated content
    fetchComments();
  };

  // Handle delete
  const handleDelete = async (commentId: string) => {
    console.log('Delete comment:', commentId);
    
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('Comment deleted successfully');
        // Refresh comments to remove deleted comment
        fetchComments();
      } else {
        const errorData = await response.json();
        console.error('Failed to delete comment:', errorData);
        setError(errorData.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment');
    }
  };

  // Handle report
  const handleReport = (commentId: string) => {
    console.log('Report comment:', commentId);
    // Could open a report modal or send a report
  };

  // Organize comments into threads for Facebook-style display
  const organizeComments = (comments: Comment[]): Comment[] => {
    console.log('CommentList: Organizing comments, input count:', comments.length);
    console.log('CommentList: Input comments:', comments.map(c => ({
      id: c.id,
      content: c.content?.substring(0, 30),
      parent_id: c.parent_id,
      poll_id: c.poll_id
    })));
    
    // Sort comments by creation date (newest first for root comments)
    const sortedComments = [...comments].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create comment map
    sortedComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    console.log('CommentList: Comment map created with', commentMap.size, 'comments');

    // Second pass: organize into threads
    sortedComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;

      if (comment.parent_id && comment.parent_id !== null) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(commentWithReplies);
          console.log('CommentList: Added reply', comment.id, 'to parent', comment.parent_id);
        } else {
          console.log('CommentList: Parent not found for reply', comment.id, 'parent:', comment.parent_id);
        }
      } else {
        rootComments.push(commentWithReplies);
        console.log('CommentList: Added root comment', comment.id);
      }
    });

    // Sort replies by creation date (oldest first for replies)
    rootComments.forEach(comment => {
      if (comment.replies) {
        comment.replies.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        console.log('CommentList: Comment', comment.id, 'has', comment.replies.length, 'replies');
      }
    });

    console.log('CommentList: Organized into', rootComments.length, 'root comments');
    console.log('CommentList: Root comments:', rootComments.map(c => ({
      id: c.id,
      content: c.content?.substring(0, 30),
      replyCount: c.replies?.length || 0
    })));
    return rootComments;
  };

  const organizedComments = organizeComments(comments);
  console.log('CommentList: Total comments received:', comments.length);
  console.log('CommentList: Organized comments:', organizedComments.length);
  
  // Debug: Show all replies found
  const allReplies = comments.filter(c => c.parent_id);
  console.log('CommentList: All replies found:', allReplies.map(r => ({
    id: r.id,
    parent_id: r.parent_id,
    content: r.content?.substring(0, 30)
  })));
  
  // Debug: Show organized structure
  console.log('CommentList: Organized structure:', organizedComments.map(c => ({
    id: c.id,
    content: c.content?.substring(0, 30),
    replies: c.replies?.map(r => ({ id: r.id, content: r.content?.substring(0, 20) })) || []
  })));
  
  // FORCE TEST: Show all replies directly
  console.log('CommentList: FORCE TEST - All replies:', allReplies);
  
  // Debug: Check if comments have author data
  if (comments.length > 0) {
    console.log('CommentList: First comment full data:', JSON.stringify(comments[0], null, 2));
    console.log('CommentList: All comments author status:', comments.map(c => ({
      id: c.id,
      user_id: c.user_id,
      has_author: !!c.author,
      author_data: c.author
    })));
  }

  if (!pollId) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Error: No poll ID provided to CommentList component</p>
            <p className="text-sm text-muted-foreground mt-2">pollId: {String(pollId)}</p>
            <p className="text-xs text-muted-foreground mt-1">Type: {typeof pollId}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading comments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold">
              Discussion ({organizedComments.length})
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Share your thoughts and engage with others
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRefreshing(true);
            fetchComments();
          }}
          disabled={refreshing}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error loading comments: {error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchComments}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New comment form - Only for authenticated users */}
      {user ? (
        <FacebookCommentForm
          pollId={pollId}
          onCommentAdded={() => {
            console.log('CommentList: Comment submitted, refreshing comments...');
            // Refresh comments to show the new one
            fetchComments();
          }}
        />
      ) : (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Join the Discussion</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Please <a href="/auth/login" className="underline hover:no-underline">log in</a> to share your thoughts and connect with other users.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FORCE TEST: Show all replies directly */}
      {allReplies.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
          <h3 className="font-bold text-yellow-800">FORCE TEST - All Replies Found:</h3>
          {allReplies.map(reply => (
            <div key={reply.id} className="mt-2 p-2 bg-white rounded border">
              <strong>Reply ID:</strong> {reply.id}<br/>
              <strong>Parent ID:</strong> {reply.parent_id}<br/>
              <strong>Content:</strong> {reply.content}<br/>
              <strong>User:</strong> {reply.user_id}
            </div>
          ))}
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {organizedComments.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground py-12">
                <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h4 className="font-semibold text-lg mb-2">No comments yet</h4>
                <p className="text-sm mb-4">Be the first to share your thoughts and start the discussion!</p>
                <div className="text-xs text-muted-foreground">
                  💡 <strong>Tip:</strong> Your comment will appear here once you post it
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          organizedComments.map((comment) => (
            <div key={comment.id}>
              <FacebookComment
                comment={comment}
                onVote={handleVote}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                pollId={pollId}
                currentUserId={user?.id}
                onCommentAdded={fetchComments}
                showReplies={showReplies[comment.id] || false}
                onToggleReplies={() => {
                  setShowReplies(prev => ({
                    ...prev,
                    [comment.id]: !prev[comment.id]
                  }));
                }}
              />
              {/* Render replies when toggled */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 space-y-2">
                  {comment.replies.map((reply) => (
                    <FacebookComment
                      key={reply.id}
                      comment={reply}
                      onVote={handleVote}
                      onReply={handleReply}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onCommentAdded={fetchComments}
                      pollId={pollId}
                      currentUserId={user?.id}
                      isReply={true}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
