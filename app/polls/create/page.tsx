"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/protected-route";
import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import Link from "next/link";

function CreatePollForm() {
    const [question, setQuestion] = useState("");
    const [description, setDescription] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const addOption = () => {
        setOptions([...options, ""]);
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert("Please sign in to create a poll");
            return;
        }

        setLoading(true);

        // Validation
        if (!question.trim()) {
            alert("Please enter a poll question");
            setLoading(false);
            return;
        }

        const validOptions = options.filter((opt) => opt.trim());
        if (validOptions.length < 2) {
            alert("Please provide at least 2 valid options");
            setLoading(false);
            return;
        }

        try {
            // Import the createPoll function
            const { createPoll } = await import("@/lib/database");

            const poll = await createPoll({
                question: question.trim(),
                description: description.trim() || null,
                options: validOptions.map((opt) => opt.trim()),
            });

            if (poll) {
                alert("Poll created successfully!");
                // Reset form
                setQuestion("");
                setDescription("");
                setOptions(["", ""]);

                // Redirect to view the poll
                window.location.href = `/polls/${poll.id}`;
            } else {
                alert("Failed to create poll. Please try again.");
            }
        } catch (error: any) {
            console.error("=== POLL CREATION ERROR ===");
            console.error("Raw error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error string:", String(error));
            console.error("Error message:", error?.message);
            console.error("Error stack:", error?.stack);
            console.error("Error details:", error?.details);
            console.error("Error properties:", Object.getOwnPropertyNames(error));

            let errorMessage = "An unknown error occurred while creating the poll.";

            if (error?.message) {
                errorMessage = error.message;
            } else if (error?.details) {
                errorMessage = error.details;
            } else if (typeof error === "string") {
                errorMessage = error;
            } else if (error && typeof error === "object") {
                try {
                    errorMessage = JSON.stringify(error, null, 2);
                } catch (e) {
                    errorMessage = String(error);
                }
            }

            alert(`Error creating poll: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Card className="border-2">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                    <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Create New Poll
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Design your poll with engaging questions and options
                    </p>
                </CardHeader>
                <CardContent className="pt-6">
                    {!user ? (
                        <div className="text-center py-8">
                            <p className="text-lg mb-4">
                                Please sign in to create a poll
                            </p>
                            <div className="space-x-4">
                                <Link href="/auth/login">
                                    <Button variant="default">Sign In</Button>
                                </Link>
                                <Link href="/auth/register">
                                    <Button variant="outline">
                                        Create Account
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Poll Question *
                                </label>
                                <Input
                                    placeholder="What's your favorite programming language?"
                                    value={question}
                                    onChange={(e) =>
                                        setQuestion(e.target.value)
                                    }
                                    className="text-lg"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Description (optional)
                                </label>
                                <Textarea
                                    placeholder="Add context or details about your poll..."
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium">
                                    Options *
                                </label>
                                {options.map((option, index) => (
                                    <div
                                        key={index}
                                        className="flex gap-2 items-center"
                                    >
                                        <div className="flex-1 relative">
                                            <Input
                                                placeholder={`Option ${
                                                    index + 1
                                                }`}
                                                value={option}
                                                onChange={(e) =>
                                                    updateOption(
                                                        index,
                                                        e.target.value
                                                    )
                                                }
                                                className="pl-8"
                                            />
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                {String.fromCharCode(
                                                    65 + index
                                                )}
                                                .
                                            </span>
                                        </div>
                                        {options.length > 2 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    removeOption(index)
                                                }
                                                className="hover:bg-red-100 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addOption}
                                    className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-dashed"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Another Option
                                </Button>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                disabled={loading}
                            >
                                {loading ? "Creating Poll..." : "Create Poll"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function CreatePollPage() {
    return (
        <ProtectedRoute>
            <CreatePollForm />
        </ProtectedRoute>
    );
}
