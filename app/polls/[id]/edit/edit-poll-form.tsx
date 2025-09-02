"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Plus, Trash2, ArrowLeft } from "lucide-react";
import { notificationManager } from "@/lib/utils/notifications";
import type { Poll, PollOption } from "@/lib/types";

interface EditPollFormProps {
    poll: Poll;
    options: PollOption[];
    onUpdate: (updatedPoll: Poll, updatedOptions: PollOption[]) => void;
}

export function EditPollForm({ poll, options, onUpdate }: EditPollFormProps) {
    const router = useRouter();
    const [title, setTitle] = useState(poll.title);
    const [description, setDescription] = useState(poll.description || "");
    const [pollOptions, setPollOptions] = useState<PollOption[]>(options);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleAddOption = () => {
        const newOption: PollOption = {
            id: `temp-${Date.now()}`,
            text: "",
            poll_id: poll.id,
            created_at: new Date().toISOString(),
        };
        setPollOptions([...pollOptions, newOption]);
    };

    const handleRemoveOption = (optionId: string) => {
        setPollOptions(pollOptions.filter(option => option.id !== optionId));
    };

    const handleOptionChange = (optionId: string, text: string) => {
        setPollOptions(
            pollOptions.map(option =>
                option.id === optionId ? { ...option, text } : option
            )
        );
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = "Title is required";
        } else if (title.length > 200) {
            newErrors.title = "Title must be 200 characters or less";
        }

        if (description.length > 1000) {
            newErrors.description = "Description must be 1000 characters or less";
        }

        if (pollOptions.length < 2) {
            newErrors.options = "At least 2 options are required";
        }

        const emptyOptions = pollOptions.filter(option => !option.text.trim());
        if (emptyOptions.length > 0) {
            newErrors.options = "All options must have text";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const { updatePoll } = await import("@/lib/database");
            
            const updatedPoll = await updatePoll(poll.id, {
                title: title.trim(),
                description: description.trim(),
                options: pollOptions.map(option => option.text.trim()).filter(text => text !== ""),
            });

            if (updatedPoll) {
                notificationManager.addNotification({
                    type: "success",
                    title: "Poll Updated!",
                    message: "Your poll has been updated successfully",
                    duration: 5000,
                });

                onUpdate(updatedPoll, pollOptions);
                router.push(`/polls/${poll.id}`);
            }
        } catch (error: any) {
            console.error("Error updating poll:", error);
            notificationManager.addNotification({
                type: "error",
                title: "Update Failed",
                message: error.message || "Failed to update poll",
                duration: 8000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Button
                variant="ghost"
                className="mb-4"
                onClick={() => router.push(`/polls/${poll.id}`)}
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Poll
            </Button>

            <Card className="bg-card">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-foreground">
                        Edit Poll
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What's your poll about?"
                                maxLength={200}
                                className={errors.title ? "border-red-500" : ""}
                            />
                            {errors.title && (
                                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add context or details about your poll..."
                                maxLength={1000}
                                rows={4}
                                className={errors.description ? "border-red-500" : ""}
                            />
                            {errors.description && (
                                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                            )}
                        </div>

                        <div>
                            <Label>Options</Label>
                            <div className="space-y-3">
                                {pollOptions.map((option, index) => (
                                    <div key={option.id} className="flex items-center gap-2">
                                        <Input
                                            value={option.text}
                                            onChange={(e) =>
                                                handleOptionChange(option.id, e.target.value)
                                            }
                                            placeholder={`Option ${index + 1}`}
                                            className="flex-1"
                                        />
                                        {pollOptions.length > 2 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveOption(option.id)}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {errors.options && (
                                <p className="text-sm text-red-500 mt-1">{errors.options}</p>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddOption}
                                className="mt-2"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Option
                            </Button>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? "Updating..." : "Update Poll"}
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