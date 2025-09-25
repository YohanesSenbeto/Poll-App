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
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

    if (!user && !guestName.trim()) {
      setError("Please enter your name to comment as a guest");
      return;
    }

    if (!content.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

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
          guestName: user ? null : guestName.trim(),
        }),
      });

      const data = await response.json();
      console.log('CommentForm: Response status:', response.status);
      console.log('CommentForm: Response data:', data);

      if (response.ok) {
        console.log('CommentForm: Comment submitted successfully, calling callback');
        setContent("");
        if (!user) {
          setGuestName("");
        }
        setSuccess(true);
        onCommentSubmitted?.();
        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(false), 2000);
      } else {
        console.error('CommentForm: Submission failed:', data.error);
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
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2 sm:gap-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium">👤</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    Comment as a guest
                  </p>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="min-h-[70px] sm:min-h-[80px] resize-none text-sm"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-xs sm:text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="text-xs sm:text-sm text-green-600 bg-green-50 p-2 rounded">
                ✓ Comment posted successfully!
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || !content.trim() || !guestName.trim()}
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

          {success && (
            <div className="text-xs sm:text-sm text-green-600 bg-green-50 p-2 rounded">
              ✓ Comment posted successfully!
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
