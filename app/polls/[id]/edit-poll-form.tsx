"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Plus, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { notificationManager } from "@/lib/utils/notifications";
import type { Poll, PollOption } from "@/lib/types";

interface EditPollFormProps {
  poll: Poll;
  options: PollOption[];
  onUpdate: (updatedPoll: Poll, updatedOptions: PollOption[]) => void;
}

export function EditPollForm({ poll, options, onUpdate }: EditPollFormProps) {
  const [title, setTitle] = useState(poll.title);
  const [description, setDescription] = useState(poll.description || "");
  const [pollOptions, setPollOptions] = useState(
    options.map(opt => opt.text)
  );
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const addOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!title.trim()) {
      errors.title = "Title is required";
    }
    
    const validOptions = pollOptions.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      errors.options = "At least 2 options are required";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      notificationManager.addNotification({
        type: "error",
        title: "Validation Error",
        message: "Please fix the errors in the form",
        duration: 5000,
      });
      return;
    }

    setLoading(true);

    try {
      const { updatePoll } = await import("@/lib/database");
      
      const updatedPoll = await updatePoll(poll.id, {
        title: title.trim(),
        description: description.trim() || null,
        options: pollOptions
          .filter(opt => opt.trim())
          .map(opt => opt.trim()),
      });

      if (updatedPoll) {
        notificationManager.addNotification({
          type: "success",
          title: "Poll Updated!",
          message: "Your poll has been updated successfully",
          duration: 5000,
        });
        
        // Update the parent component
        onUpdate(updatedPoll, updatedPoll.options || []);
        router.push(`/polls/${poll.id}`);
      } else {
        notificationManager.addNotification({
          type: "error",
          title: "Update Failed",
          message: "Failed to update poll. Please try again.",
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error("Poll update error:", error);
      notificationManager.addNotification({
        type: "error",
        title: "Update Error",
        message: error.message || "An error occurred while updating the poll",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Button asChild variant="ghost" className="mb-4">
        <Link href={`/polls/${poll.id}`}>
          <svg
            className="h-4 w-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Poll
        </Link>
      </Button>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Edit Poll</CardTitle>
          <p className="text-muted-foreground">
            Update your poll question and options
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Poll Title *
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your poll question"
                className={fieldErrors.title ? "border-red-500" : ""}
              />
              {fieldErrors.title && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription>{fieldErrors.title}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description (Optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more context to your poll..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Options *
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={pollOptions.length >= 10}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-3">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className={fieldErrors.options ? "border-red-500" : ""}
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {fieldErrors.options && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription>{fieldErrors.options}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Updating Poll...
                  </>
                ) : (
                  "Update Poll"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/polls/${poll.id}`)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}