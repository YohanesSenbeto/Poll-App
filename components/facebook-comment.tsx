"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Reply, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FacebookCommentForm } from './facebook-comment-form';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  parent_id?: string;
  is_edited?: boolean;
  reply_count?: number;
  like_count?: number;
  dislike_count?: number;
  author?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
    email?: string;
  } | null;
  votes?: {
    upvotes: number;
    downvotes: number;
    user_vote: number | null;
  };
  replies?: Comment[];
}

interface FacebookCommentProps {
  comment: Comment;
  onReply: (parentId: string) => void;
  onEdit?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onVote?: (commentId: string, voteType: 1 | -1) => void;
  onCommentAdded?: () => void;
  isReply?: boolean;
  currentUserId?: string;
  pollId: string;
  showReplies?: boolean;
  onToggleReplies?: () => void;
}

export function FacebookComment({
  comment,
  onReply,
  onEdit,
  onDelete,
  onVote,
  onCommentAdded,
  isReply = false,
  currentUserId,
  pollId,
  showReplies = false,
  onToggleReplies
}: FacebookCommentProps) {
  const [showActions, setShowActions] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleVote = async (voteType: 1 | -1) => {
    if (!onVote || isVoting) return;
    
    setIsVoting(true);
    try {
      await onVote(comment.id, voteType);
    } finally {
      setIsVoting(false);
    }
  };

  const handleReply = () => {
    setShowReplyForm(true);
    onReply(comment.id);
  };

  const isOwner = currentUserId === comment.user_id;
  const authorName = comment.author?.display_name || 
                   comment.author?.username || 
                   comment.author?.email || 
                   'Anonymous';
  
  const authorInitial = authorName.charAt(0).toUpperCase();
  const isEdited = comment.is_edited || (comment.updated_at && comment.updated_at !== comment.created_at);
  
  const likeCount = comment.like_count || comment.votes?.upvotes || 0;
  const dislikeCount = comment.dislike_count || comment.votes?.downvotes || 0;
  const replyCount = comment.replies?.length || comment.reply_count || 0;
  const userVote = comment.votes?.user_vote;

  // Debug logging for replies
  console.log('FacebookComment: Comment', comment.id, {
    replyCount: replyCount,
    actualReplies: comment.replies?.length || 0,
    dbReplyCount: comment.reply_count || 0,
    hasReplies: !!comment.replies,
    replies: comment.replies?.map(r => ({ id: r.id, content: r.content?.substring(0, 20) }))
  });

  return (
    <div className={`${isReply ? 'ml-12 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
      <div className="flex items-start space-x-3 py-3">
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.author?.avatar_url} />
          <AvatarFallback className="bg-blue-500 text-white text-sm">
            {authorInitial}
          </AvatarFallback>
        </Avatar>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {authorName}
              </span>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {isEdited && (
                  <span className="text-blue-500">(edited)</span>
                )}
              </div>
            </div>

            {/* Actions Menu */}
            {isOwner && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActions(!showActions)}
                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                
                {showActions && (
                  <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 min-w-[120px]">
                    {onEdit && (
                      <button
                        onClick={() => {
                          onEdit(comment.id);
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          onDelete(comment.id);
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 flex items-center space-x-2"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comment Text */}
          <div className="text-sm text-gray-800 dark:text-gray-200 mb-2 whitespace-pre-wrap">
            {comment.content}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Like Button */}
            {onVote && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(1)}
                disabled={isVoting}
                className={`h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  userVote === 1 
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                {likeCount > 0 && likeCount}
              </Button>
            )}
            
            {/* Dislike Button */}
            {onVote && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(-1)}
                disabled={isVoting}
                className={`h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  userVote === -1 
                    ? 'text-red-600 bg-red-50 dark:bg-red-900/20' 
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                {dislikeCount > 0 && dislikeCount}
              </Button>
            )}

            {/* Reply Button */}
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReply}
                className="h-8 px-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}

            {/* Show Replies Button */}
            {!isReply && replyCount > 0 && onToggleReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleReplies}
                className="h-8 px-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {showReplies ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3">
              <FacebookCommentForm
                pollId={pollId}
                parentId={comment.id}
                onCommentAdded={() => {
                  setShowReplyForm(false);
                  onCommentAdded?.(); // Refresh comments
                }}
                placeholder={`Reply to ${authorName}...`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

