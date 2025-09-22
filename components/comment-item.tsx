"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CommentForm } from "./comment-form";
import { useAuth } from "@/app/auth-context";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Reply,
  Flag
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  poll_id: string;
  parent_id: string | null;
  author?: {
    email?: string;
    display_name?: string;
    username?: string;
  } | null;
  votes?: {
    upvotes: number;
    downvotes: number;
    user_vote: number | null;
  };
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  level?: number;
  onVote?: (commentId: string, voteType: 1 | -1) => void;
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onReport?: (commentId: string) => void;
}

export function CommentItem({
  comment,
  level = 0,
  onVote,
  onReply,
  onEdit,
  onDelete,
  onReport
}: CommentItemProps) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(level < 2); // Show first 2 levels by default

  const isAuthor = user?.id === comment.user_id;
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'moderator';

  const handleVote = (voteType: 1 | -1) => {
    if (!user) return;
    onVote?.(comment.id, voteType);
  };

  if (comment.is_deleted) {
    return (
      <div className="text-sm text-muted-foreground italic py-2">
        Comment deleted {isAuthor && "(by you)"}
      </div>
    );
  }

  const maxLevel = 3; // Maximum nesting level

  return (
    <div className={`space-y-3 ${level > 0 ? 'ml-8' : ''}`}>
      <Card className={`transition-all hover:shadow-md ${level > 0 ? 'border-l-4 border-l-primary/30' : ''}`}>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 flex-shrink-0">
              {/* Use avatar from author if present; else fallback */}
              {comment.author && (comment as any).author?.avatar_url ? (
                <AvatarImage src={(comment as any).author.avatar_url} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {comment.author?.display_name?.charAt(0).toUpperCase() || comment.author?.username?.charAt(0).toUpperCase() || comment.author?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs sm:text-sm">
                    {comment.author?.display_name || comment.author?.username || comment.author?.email || `User ${comment.user_id?.substring(0, 8)}`}
                  </span>
                  {isAuthor && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">You</Badge>
                  )}
                  {isAdmin && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-primary text-primary">Admin</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                  {comment.is_edited && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs px-1 py-0">Edited</Badge>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Vote buttons */}
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(1)}
                      disabled={!user}
                      className={`h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium transition-colors ${
                        comment.votes?.user_vote === 1
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">{comment.votes?.upvotes || 0}</span>
                      <span className="sm:hidden">{comment.votes?.upvotes || 0}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(-1)}
                      disabled={!user}
                      className={`h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium transition-colors ${
                        comment.votes?.user_vote === -1
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">{comment.votes?.downvotes || 0}</span>
                      <span className="sm:hidden">{comment.votes?.downvotes || 0}</span>
                    </Button>
                  </div>

                  {/* Reply button */}
                  {level < maxLevel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReplyForm(!showReplyForm)}
                      className="h-8 px-3 text-xs hover:bg-primary/10 hover:text-primary"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  )}
                </div>

                {/* Action menu */}
                <div className="flex items-center gap-1">
                  {isAuthor && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Reply form */}
              {showReplyForm && (
                <div className="mt-4">
                  <CommentForm
                    pollId={comment.poll_id}
                    parentId={comment.id}
                    onCommentSubmitted={() => setShowReplyForm(false)}
                    placeholder={`Reply to ${comment.user_id?.substring(0, 8) || 'user'}...`}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-muted-foreground"
          >
            {showReplies ? "Hide" : "Show"} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </Button>

          {showReplies && (
            <div className="space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  level={level + 1}
                  onVote={onVote}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReport={onReport}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

