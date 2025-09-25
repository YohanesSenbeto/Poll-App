"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/app/auth-context';
import { supabase } from '@/lib/supabase';
import { Send, Loader2, MessageCircle, AlertCircle, User } from 'lucide-react';

interface FacebookCommentFormProps {
  pollId: string;
  parentId?: string;
  onCommentAdded: () => void;
  className?: string;
  placeholder?: string;
}

export function FacebookCommentForm({ 
  pollId, 
  parentId, 
  onCommentAdded, 
  className = "",
  placeholder = "Write a comment..."
}: FacebookCommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, userProfile, loading } = useAuth();

  // Debug auth state
  useEffect(() => {
    console.log('Comment Form Auth State:', {
      user: user ? { id: user.id, email: user.email } : null,
      userProfile: userProfile,
      loading: loading,
      isAuthenticated: !!user
    });
  }, [user, userProfile, loading]);

  // Get display name for the user
  const getDisplayName = () => {
    if (!user) return null;
    
    // Priority: display_name > username > email
    return userProfile?.display_name || 
           userProfile?.username || 
           user.user_metadata?.display_name ||
           user.user_metadata?.username ||
           user.email;
  };

  // Get avatar URL for the user
  const getAvatarUrl = () => {
    if (!user) return null;
    
    // Priority: profile avatar > user metadata avatar > null
    return userProfile?.avatar_url || 
           user.user_metadata?.avatar_url || 
           null;
  };

  // Get user initial for fallback
  const getUserInitial = () => {
    if (!user) return 'U';
    const displayName = getDisplayName();
    return displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only allow authenticated users
    if (!user) {
      setError('Please log in to post comments');
      return;
    }
    
    console.log('Form submission:', {
      user: { id: user.id, email: user.email },
      userProfile: userProfile,
      content: content.trim(),
      pollId,
      isAuthenticated: true
    });
    
    if (!content.trim()) {
      setError('Please enter a comment');
      return;
    }

    if (content.length > 1000) {
      setError('Comment must be less than 1000 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Submitting comment:', {
        pollId,
        content: content.trim(),
        parentId: parentId || null,
        user: { 
          id: user.id, 
          email: user.email,
          displayName: getDisplayName(),
          avatarUrl: getAvatarUrl(),
          profile: userProfile
        }
      });

      // Refresh the session before making the API call
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session refresh result:', { 
        hasSession: !!session, 
        sessionError: sessionError?.message,
        userId: session?.user?.id 
      });

      // Manually sync session to cookies if we have a session
      if (session && typeof window !== 'undefined') {
        const sessionData = JSON.stringify(session);
        document.cookie = `poll-app-auth=${encodeURIComponent(sessionData)}; path=/; max-age=31536000; SameSite=Lax`;
        console.log('Manual session sync to cookies completed');
      }

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pollId,
          content: content.trim(),
          parentId: parentId || null
        }),
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorData;
        try {
          const responseText = await response.text();
          console.log('Raw response text:', responseText);
          
          if (responseText) {
            errorData = JSON.parse(responseText);
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('API Error:', errorData);
        console.error('Response status:', response.status);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Provide more specific error messages
        let errorMessage = errorData.error || 'Failed to post comment';
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`;
        }
        
        throw new Error(errorMessage);
      }

      // Reset form
      setContent('');
      onCommentAdded();
      
    } catch (error) {
      console.error('Error posting comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCharacterCountColor = () => {
    const length = content.length;
    if (length > 900) return 'text-red-500';
    if (length > 700) return 'text-yellow-500';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* User Info */}
        <div className="flex items-start space-x-3">
          {user ? (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={getAvatarUrl()} />
              <AvatarFallback className="bg-blue-500 text-white text-sm">
                {getUserInitial()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-gray-500" />
            </div>
          )}
          
          <div className="flex-1">
            {/* Debug info for authenticated users */}
            {user && (
              <div className="text-xs text-gray-500 mb-2">
                Posting as: {getDisplayName()}
              </div>
            )}
            {/* Show login prompt for unauthenticated users */}
            {!user && (
              <div className="text-xs text-red-500 mb-2">
                Please log in to post comments
              </div>
            )}
            
            {/* Comment input */}
            <div className="relative">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="min-h-[40px] max-h-[120px] resize-none pr-12"
                maxLength={1000}
              />
              
              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting || !content.trim() || !user}
                size="sm"
                className="absolute bottom-2 right-2 h-8 w-8 p-0"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Character count and error */}
            <div className="flex justify-between items-center mt-1">
              <div className={`text-xs ${getCharacterCountColor()}`}>
                {content.length}/1000
              </div>
              {error && (
                <div className="flex items-center text-red-500 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {error}
                </div>
              )}
            </div>
            
          </div>
        </div>
      </form>
    </div>
  );
}
