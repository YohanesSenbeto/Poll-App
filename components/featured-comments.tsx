"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Loader2, AlertCircle, ThumbsUp, ThumbsDown, Reply, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/auth-context';
import { FacebookCommentForm } from './facebook-comment-form';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  poll_id?: string;
  parent_id?: string;
  like_count?: number;
  dislike_count?: number;
  reply_count?: number;
  is_edited?: boolean;
  votes?: {
    upvotes: number;
    downvotes: number;
    user_vote: number | null;
  };
  author?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
    email?: string;
  } | null;
  replies?: Comment[];
}

interface FeaturedCommentsProps {
  className?: string;
}

export function FeaturedComments({ className = "" }: FeaturedCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredPollId, setFeaturedPollId] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState<Record<string, boolean>>({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [votingComments, setVotingComments] = useState<Record<string, boolean>>({});
  const [deletingComments, setDeletingComments] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const { user } = useAuth();

  // Organize comments into nested structure (same logic as CommentList)
  const organizeComments = (comments: Comment[]): Comment[] => {
    console.log('FeaturedComments: Organizing comments, input count:', comments.length);
    
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

    console.log('FeaturedComments: Comment map created with', commentMap.size, 'comments');

    // Second pass: organize into threads
    sortedComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;

      if (comment.poll_id === null && comment.parent_id) {
        // This is a reply (has parent_id)
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(commentWithReplies);
          console.log('FeaturedComments: Added reply', comment.id, 'to parent', comment.parent_id);
        } else {
          console.log('FeaturedComments: Parent not found for reply', comment.id, 'parent:', comment.parent_id);
        }
      } else if (comment.poll_id === null && !comment.parent_id) {
        // This is a root comment (no parent_id)
        rootComments.push(commentWithReplies);
        console.log('FeaturedComments: Added root comment', comment.id);
      }
    });

    // Sort replies by creation date (oldest first for replies)
    rootComments.forEach(comment => {
      if (comment.replies) {
        comment.replies.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        console.log('FeaturedComments: Comment', comment.id, 'has', comment.replies.length, 'replies');
      }
    });

    console.log('FeaturedComments: Organized into', rootComments.length, 'root comments');
    return rootComments;
  };

  // Get a featured poll ID (you can replace this with actual logic)
  useEffect(() => {
    // For community comments, we'll use a special poll ID
    // This allows users to post general community comments
    setFeaturedPollId("community-discussion");
  }, []);

  // Get recent comments from all polls
  const fetchCommunityComments = async () => {
    try {
      setLoading(true);
      
      // Fetch community discussion comments (including replies)
      const response = await fetch('/api/comments?pollId=community-discussion');
      
      if (!response.ok) {
        // If the recent comments endpoint doesn't exist, fall back to sample comments
        if (response.status === 404) {
          setComments([]);
          setError(null);
          return;
        }
        throw new Error('Failed to fetch recent comments');
      }

      const data = await response.json();
      console.log('Fetched comments:', data.comments);
      
      // Organize comments into nested structure
      const organizedComments = organizeComments(data.comments || []);
      console.log('Organized comments:', organizedComments);
      console.log('Reply counts after organization:', organizedComments.map(c => ({
        id: c.id,
        content: c.content?.substring(0, 20),
        dbReplyCount: c.reply_count,
        actualReplies: c.replies?.length || 0,
        hasReplies: c.replies && c.replies.length > 0
      })));
      setComments(organizedComments);
      setError(null);
    } catch (error) {
      console.error('Error fetching recent comments:', error);
      setError('Unable to load recent comments');
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityComments();
  }, []);

  const getAuthorName = (comment: Comment) => {
    // Priority: display_name > username > email > Anonymous
    return comment.author?.display_name || 
           comment.author?.username || 
           comment.author?.email || 
           'Anonymous';
  };

  const getAuthorInitial = (comment: Comment) => {
    const name = getAuthorName(comment);
    return name.charAt(0).toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  // Handle vote on comment
  const handleVote = async (commentId: string, voteType: 1 | -1) => {
    if (!user || votingComments[commentId]) return;
    
    setVotingComments(prev => ({ ...prev, [commentId]: true }));
    
    try {
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      });

      if (response.ok) {
        // Update local state
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            const currentVote = comment.votes?.user_vote || 0;
            let newUpvotes = comment.like_count || 0;
            let newDownvotes = comment.dislike_count || 0;
            let newUserVote: number | null = null;

            if (currentVote === voteType) {
              // Remove vote
              if (voteType === 1) newUpvotes = Math.max(0, newUpvotes - 1);
              else newDownvotes = Math.max(0, newDownvotes - 1);
            } else {
              // Change vote
              if (currentVote === 1) newUpvotes = Math.max(0, newUpvotes - 1);
              else if (currentVote === -1) newDownvotes = Math.max(0, newDownvotes - 1);
              
              if (voteType === 1) newUpvotes += 1;
              else newDownvotes += 1;
              newUserVote = voteType;
            }

            return {
              ...comment,
              like_count: newUpvotes,
              dislike_count: newDownvotes,
              votes: { upvotes: newUpvotes, downvotes: newDownvotes, user_vote: newUserVote }
            };
          }
          return comment;
        }));
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
    } finally {
      setVotingComments(prev => ({ ...prev, [commentId]: false }));
    }
  };

  // Handle reply toggle
  const handleReplyToggle = (commentId: string) => {
    // If replies are hidden, show them when clicking reply button
    if (!showReplies[commentId]) {
      setShowReplies(prev => ({ ...prev, [commentId]: true }));
    }
    // Toggle reply form
    setShowReplyForm(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  // Handle edit comment
  const handleEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  // Handle save edit
  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() })
      });

      if (response.ok) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, content: editContent.trim(), is_edited: true }
            : comment
        ));
        setEditingComment(null);
        setEditContent("");
        showMessage('success', 'Comment updated successfully!');
      } else {
        const errorData = await response.json();
        showMessage('error', `Failed to update comment: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      showMessage('error', 'Failed to update comment. Please try again.');
    }
  };

  // Handle delete comment
  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to permanently delete this comment? This action cannot be undone.')) return;

    try {
      // Set loading state
      setDeletingComments(prev => ({ ...prev, [commentId]: true }));
      
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove comment from UI immediately after successful API call
        setComments(prev => {
          // Handle both root comments and replies
          return prev.map(comment => {
            // If this is the comment being deleted, remove it
            if (comment.id === commentId) {
              return null; // Will be filtered out
            }
            // If this comment has replies, remove the deleted reply
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: comment.replies.filter(reply => reply.id !== commentId)
              };
            }
            return comment;
          }).filter((comment): comment is Comment => comment !== null); // Type guard
        });
        
        showMessage('success', '🗑️ Comment permanently deleted!');
        console.log('FeaturedComments: Comment removed from UI:', commentId);
      } else {
        const errorData = await response.json();
        showMessage('error', `❌ Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showMessage('error', '❌ Failed to delete comment. Please try again.');
    } finally {
      // Clear loading state
      setDeletingComments(prev => ({ ...prev, [commentId]: false }));
    }
  };

  // Handle comment added (for replies and new comments)
  const handleCommentAdded = () => {
    // Refresh comments to show new replies/comments
    fetchCommunityComments();
  };

  // Show message and auto-hide after 3 seconds
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage(null);
    }, 4000); // Increased to 4 seconds for better visibility
  };

  // Toggle replies visibility
  const toggleReplies = (commentId: string) => {
    console.log('FeaturedComments: Toggling replies for comment:', commentId);
    console.log('FeaturedComments: Current showReplies state:', showReplies);
    console.log('FeaturedComments: Current state for this comment:', showReplies[commentId]);
    
    setShowReplies(prev => {
      const newState = {
        ...prev,
        [commentId]: !prev[commentId]
      };
      console.log('FeaturedComments: New showReplies state:', newState);
      return newState;
    });
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      {/* Success/Error Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          message.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center">
            <span className="mr-2 text-lg">
              {message.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Community Discussion</CardTitle>
            <CardDescription>
              Join the conversation! Share your thoughts and connect with other users.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-500">Loading comments...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Comment Form at Top - Only for authenticated users */}
              {user && (
                <div className="mb-6">
                  <FacebookCommentForm
                    pollId={featuredPollId || "community-discussion"}
                    onCommentAdded={handleCommentAdded}
                    placeholder="Share your thoughts with the community..."
                  />
                </div>
              )}
              
              {/* Login prompt for non-authenticated users */}
              {!user && (
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

              {/* Individual User Comments */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">No comments yet</h4>
                    <p className="text-sm text-gray-500 mb-4">Be the first to share your thoughts and start the discussion!</p>
                    <div className="text-xs text-gray-400">
                      💡 <strong>Tip:</strong> Your comment will appear here once you post it
                    </div>
                  </div>
                ) : (
                  comments.slice(0, 5).map((comment) => (
                  <div key={comment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800/50 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={comment.author?.avatar_url} />
                        <AvatarFallback className="text-sm bg-gradient-to-br from-blue-400 to-blue-600 text-white font-medium">
                          {getAuthorInitial(comment)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {getAuthorName(comment)}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                          {comment.is_edited && (
                            <span className="text-xs text-gray-400">(edited)</span>
                          )}
                        </div>
                        
                        {/* Edit mode */}
                        {editingComment === comment.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-200"
                              rows={3}
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(comment.id)}
                                className="h-7 px-3 text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingComment(null);
                                  setEditContent("");
                                }}
                                className="h-7 px-3 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {comment.content}
                          </p>
                        )}

                        {/* Interactive buttons */}
                        {editingComment !== comment.id && (
                          <div className="flex items-center space-x-4 mt-3">
                            {/* Like button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVote(comment.id, 1)}
                              disabled={votingComments[comment.id]}
                              className={`h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                comment.votes?.user_vote === 1 
                                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                                  : 'text-gray-600 hover:text-blue-600'
                              }`}
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              {(comment.like_count || 0) > 0 && (comment.like_count || 0)}
                            </Button>
                            
                            {/* Dislike button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVote(comment.id, -1)}
                              disabled={votingComments[comment.id]}
                              className={`h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                comment.votes?.user_vote === -1 
                                  ? 'text-red-600 bg-red-50 dark:bg-red-900/20' 
                                  : 'text-gray-600 hover:text-red-600'
                              }`}
                            >
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              {(comment.dislike_count || 0) > 0 && (comment.dislike_count || 0)}
                            </Button>

                            {/* Reply button - Only for authenticated users */}
                            {user && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReplyToggle(comment.id)}
                                className="h-8 px-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <Reply className="h-3 w-3 mr-1" />
                                Reply
                                {(comment.replies && comment.replies.length > 0) && (
                                  <span 
                                    className="ml-1 cursor-pointer hover:text-green-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleReplies(comment.id);
                                    }}
                                  >
                                    ({comment.replies.length}) {showReplies[comment.id] ? '👁️' : '👁️‍🗨️'}
                                  </span>
                                )}
                              </Button>
                            )}

                            {/* Owner actions */}
                            {user?.id === comment.user_id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(comment)}
                                  className="h-8 px-2 text-xs text-gray-600 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(comment.id)}
                                  disabled={deletingComments[comment.id]}
                                  className="h-8 px-2 text-xs text-gray-600 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  {deletingComments[comment.id] ? 'Deleting...' : 'Delete'}
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Reply form - Only for authenticated users */}
                        {showReplyForm[comment.id] && user && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <FacebookCommentForm
                              pollId={comment.poll_id || featuredPollId || "community-discussion"}
                              parentId={comment.id}
                              onCommentAdded={() => {
                                setShowReplyForm(prev => ({ ...prev, [comment.id]: false }));
                                handleCommentAdded();
                              }}
                              placeholder={`Reply to ${getAuthorName(comment)}...`}
                            />
                          </div>
                        )}
                        
                        {/* Login prompt for reply - Only for non-authenticated users */}
                        {showReplyForm[comment.id] && !user && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                Please <a href="/auth/login" className="underline hover:no-underline">log in</a> to reply to this comment.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Render nested replies */}
                        {comment.replies && comment.replies.length > 0 && showReplies[comment.id] && (
                          <div className="mt-4 ml-8 space-y-3">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 bg-gray-50 dark:bg-gray-800/30 rounded-r-lg p-3">
                                <div className="flex items-start space-x-3">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={reply.author?.avatar_url} />
                                    <AvatarFallback className="text-xs bg-gradient-to-br from-green-400 to-green-600 text-white font-medium">
                                      {getAuthorInitial(reply)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {getAuthorName(reply)}
                                      </span>
                                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                        {formatTimeAgo(reply.created_at)}
                                      </span>
                                      {reply.is_edited && (
                                        <span className="text-xs text-gray-400">(edited)</span>
                                      )}
                                    </div>
                                    
                                    <div className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                                      {reply.content}
                                    </div>

                                    {/* Reply actions */}
                                    <div className="flex items-center space-x-4">
                                      {/* Like/Dislike for replies */}
                                      {user && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleVote(reply.id, 1)}
                                            disabled={votingComments[reply.id]}
                                            className={`h-6 px-2 text-xs ${
                                              reply.votes?.user_vote === 1 
                                                ? 'text-green-600 bg-green-50 dark:bg-green-900/20' 
                                                : 'text-gray-500 hover:text-green-600'
                                            }`}
                                          >
                                            <ThumbsUp className="h-3 w-3 mr-1" />
                                            {reply.votes?.upvotes || reply.like_count || 0}
                                          </Button>
                                          
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleVote(reply.id, -1)}
                                            disabled={votingComments[reply.id]}
                                            className={`h-6 px-2 text-xs ${
                                              reply.votes?.user_vote === -1 
                                                ? 'text-red-600 bg-red-50 dark:bg-red-900/20' 
                                                : 'text-gray-500 hover:text-red-600'
                                            }`}
                                          >
                                            <ThumbsDown className="h-3 w-3 mr-1" />
                                            {reply.votes?.downvotes || reply.dislike_count || 0}
                                          </Button>
                                        </>
                                      )}

                                      {/* Owner actions for replies */}
                                      {user?.id === reply.user_id && (
                                        <div className="flex items-center space-x-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setEditingComment(reply.id);
                                              setEditContent(reply.content);
                                            }}
                                            className="h-6 px-2 text-xs text-gray-500 hover:text-blue-600"
                                          >
                                            <Edit className="h-3 w-3 mr-1" />
                                            Edit
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(reply.id)}
                                            disabled={deletingComments[reply.id]}
                                            className="h-6 px-2 text-xs text-gray-500 hover:text-red-600"
                                          >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            {deletingComments[reply.id] ? 'Deleting...' : 'Delete'}
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>

              {/* Call to action */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Want to join the discussion?
                    </p>
                    <p className="text-xs text-gray-500">
                      Create a poll or comment on existing ones to get started.
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/polls">View All Polls</Link>
                    </Button>
                    {user && (
                      <Button asChild size="sm">
                        <Link href="/polls/create">Create Poll</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}