"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from "@/components/protected-route";
import { Trash2, Plus, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import Link from "next/link";
import {
    createPollSchema,
    type CreatePollInput,
} from "@/lib/schemas/poll.schema";
import { notificationManager } from "@/lib/utils/notifications";

function CreatePollForm() {
    const [title, setTitle] = useState(""); // Changed from question to title
    const [description, setDescription] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const addOption = () => {
        if (options.length < 10) {
            setOptions([...options, ""]);
        }
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

    useEffect(() => {
        const authRequired = searchParams.get("authRequired");
        if (authRequired === "true" && !user) {
            notificationManager.addNotification({
                type: "warning",
                title: "Authentication Required",
                message: "Please register or login to create polls",
                duration: 5000,
            });
        }
    }, [searchParams, user]);

    const validateForm = () => {
        try {
            const pollData = {
                title: title, // Using title
                description,
                options: options.filter((opt) => opt.trim()),
            };

            console.log("Validating data:", pollData);

            createPollSchema.parse(pollData);
            setFieldErrors({});
            return true;
        } catch (error: any) {
            console.log("Validation error:", error);

            if (error.errors) {
                const errors: Record<string, string> = {};
                error.errors.forEach((err: any) => {
                    const field = err.path[0];
                    errors[field] = err.message;
                    console.log(`Field error: ${field} - ${err.message}`);
                });
                setFieldErrors(errors);
            }
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            notificationManager.addNotification({
                type: "warning",
                title: "Authentication Required",
                message: "Please login to create polls",
                duration: 5000,
            });
            router.push("/auth/login?redirectTo=/polls/create");
            return;
        }

        console.log("Form data before validation:", {
            title, // Using title
            description,
            options: options.filter((opt) => opt.trim()),
        });

        if (!validateForm()) {
            console.log("Form validation failed with errors:", fieldErrors);
            notificationManager.addNotification({
                type: "error",
                title: "Validation Error",
                message:
                    "Please fix the errors in the form. Check console for details.",
                duration: 5000,
            });
            return;
        }

        setLoading(true);

        try {
            console.log("Creating poll with data:", {
                title: title.trim(), // Using title
                description: description.trim() || null,
                options: options
                    .filter((opt) => opt.trim())
                    .map((opt) => opt.trim()),
            });

            const { createPoll } = await import("@/lib/database");

            const poll = await createPoll({
                title: title.trim(), // Using title
                description: description.trim() || null,
                options: options
                    .filter((opt) => opt.trim())
                    .map((opt) => opt.trim()),
            });

            if (poll) {
                notificationManager.addNotification({
                    type: "success",
                    title: "Poll Created!",
                    message: "Your poll has been created successfully",
                    duration: 5000,
                });
                setTitle(""); // Reset title
                setDescription("");
                setOptions(["", ""]);
                router.push(`/polls/${poll.id}`);
            } else {
                notificationManager.addNotification({
                    type: "error",
                    title: "Creation Failed",
                    message: "Failed to create poll. Please try again.",
                    duration: 5000,
                });
            }
        } catch (error: any) {
            console.error("Poll creation error:", error);

            let errorMessage = "Failed to create poll. Please try again.";

            if (error.message) {
                errorMessage = error.message;
            }

            if (error.details) {
                errorMessage += ` Details: ${error.details}`;
            }

            notificationManager.addNotification({
                type: "error",
                title: "Error Creating Poll",
                message: errorMessage,
                duration: 8000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
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
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                                <h3 className="text-lg font-semibold text-red-800 mb-2">
                                    Authentication Required
                                </h3>
                                <p className="text-red-700 mb-4">
                                    Please register or login to create polls and
                                    engage with our community.
                                </p>
                            </div>
                            <div className="space-x-4">
                                <Link href="/auth/login?redirectTo=/polls/create">
                                    <Button variant="default" size="lg">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/auth/register?redirectTo=/polls/create">
                                    <Button variant="outline" size="lg">
                                        Create Account
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Poll Title *
                                </label>
                                <Input
                                    placeholder="What's your favorite programming language?"
                                    value={title} // Using title
                                    onChange={(e) => setTitle(e.target.value)} // Using setTitle
                                    className="text-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    disabled={loading}
                                />
                                {fieldErrors.title && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {fieldErrors.title}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Description *
                                </label>
                                <Textarea
                                    placeholder="Add context or details about your poll..."
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    rows={3}
                                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    disabled={loading}
                                />
                                {fieldErrors.description && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {fieldErrors.description}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700">
                                        Options *
                                    </label>
                                    <span className="text-xs text-muted-foreground">
                                        {options.length}/10 options
                                    </span>
                                </div>

                                {options.map((option, index) => (
                                    <div
                                        key={index}
                                        className="flex gap-2 items-start"
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
                                                className={`pl-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
                                                    fieldErrors.options?.[index]
                                                        ? "border-red-500"
                                                        : ""
                                                }`}
                                                disabled={loading}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                                                {String.fromCharCode(
                                                    65 + index
                                                )}
                                                .
                                            </span>
                                            {fieldErrors.options?.[index] && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    {fieldErrors.options[index]}
                                                </p>
                                            )}
                                        </div>
                                        {options.length > 2 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    removeOption(index)
                                                }
                                                className="hover:bg-red-100 hover:text-red-600 text-gray-500"
                                                disabled={loading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}

                                {fieldErrors.options &&
                                    !Array.isArray(fieldErrors.options) && (
                                        <p className="text-sm text-red-500">
                                            {fieldErrors.options}
                                        </p>
                                    )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addOption}
                                    disabled={options.length >= 10 || loading}
                                    className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-dashed text-gray-600"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Another Option
                                </Button>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Creating Poll...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-5 w-5" />
                                        Create Poll
                                    </>
                                )}
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
