"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/app/auth-context";
import { MessageSquare, Send } from "lucide-react";

interface CommentFormProps {
  pollId: string;
  parentId?: string;
  onCommentSubmitted?: () => void;
  placeholder?: string;
  className?: string;
}

export function CommentForm({
  pollId,
  parentId,
  onCommentSubmitted,
  placeholder = "Write a comment...",
  className = ""
}: CommentFormProps) {
  const { user, userProfile } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    (userProfile as any)?.display_name ||
    (userProfile as any)?.username ||
    user?.email?.split("@")[0] ||
    "User";
  const avatarUrl =
    (userProfile as any)?.avatar_url ||
    (user as any)?.user_metadata?.avatar_url ||
    (user as any)?.user_metadata?.picture ||
    undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("Please log in to comment");
      return;
    }

    if (!content.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pollId,
          content: content.trim(),
          parentId: parentId || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setContent("");
        onCommentSubmitted?.();
      } else {
        setError(data.error || "Failed to submit comment");
      }
    } catch (error) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            <p>Please log in to comment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="flex gap-2 sm:gap-3">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
              <AvatarFallback className="text-xs">
                {(displayName.charAt(0) || "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">
                Comment as <span className="font-medium">{displayName}</span>
              </p>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="min-h-[70px] sm:min-h-[80px] resize-none text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="text-xs sm:text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !content.trim()}
              className="flex items-center gap-1 sm:gap-2 h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white" />
              ) : (
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="hidden sm:inline">{parentId ? "Reply" : "Comment"}</span>
              <span className="sm:hidden">{parentId ? "Reply" : "Post"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
