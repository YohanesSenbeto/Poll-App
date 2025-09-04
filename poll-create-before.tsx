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

        // Validate session on page load
        const validateSession = async () => {
            if (!user) return;

            try {
                const { createClientComponentClient } = await import(
                    "@supabase/auth-helpers-nextjs"
                );
                const supabase = createClientComponentClient();
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error || !session) {
                    console.warn("Session validation failed:", error);
                    // Will be handled by the form submission logic
                }
            } catch (error) {
                console.error("Session validation error:", error);
            }
        };

        validateSession();
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

            // Double-check authentication before proceeding
            const { createClientComponentClient } = await import(
                "@supabase/auth-helpers-nextjs"
            );
            const supabase = createClientComponentClient();
            const {
                data: { user: currentUser },
                error: authCheckError,
            } = await supabase.auth.getUser();

            if (authCheckError || !currentUser) {
                console.error("Authentication check failed:", authCheckError);
                notificationManager.addNotification({
                    type: "error",
                    title: "Authentication Required",
                    message:
                        "Your session has expired. Please login again to continue.",
                    duration: 8000,
                });
                router.push("/auth/login?redirectTo=/polls/create");
                return;
            }

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

            // Handle specific auth errors
            if (
                errorMessage.includes("Auth session missing") ||
                errorMessage.includes("Authentication failed")
            ) {
                errorMessage =
                    "Your session has expired. Please login again to continue.";
                notificationManager.addNotification({
                    type: "error",
                    title: "Session Expired",
                    message: errorMessage,
                    duration: 8000,
                });
                router.push("/auth/login?redirectTo=/polls/create");
                return;
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8">
            <Card className="border-2 shadow-lg bg-card max-w-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-50/50 dark:from-blue-900/20 to-purple-50/50 dark:to-purple-900/20 border-b">
                    <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Create New Poll
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Design your poll with engaging questions and options
                    </p>
                </CardHeader>
                <CardContent className="pt-6">
                    {!user ? (
                        <div className="text-left py-8">
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mb-2" />
                                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                                    Authentication Required
                                </h3>
                                <p className="text-red-700 dark:text-red-300 mb-4">
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
                                <label className="text-sm font-medium text-foreground">
                                    Poll Title *
                                </label>
                                <Input
                                    placeholder="What's your favorite programming language?"
                                    value={title} // Using title
                                    onChange={(e) => setTitle(e.target.value)} // Using setTitle
                                    className="text-lg border-input bg-background text-foreground focus:border-blue-500 focus:ring-blue-500"
                                    disabled={loading}
                                />
                                {fieldErrors.title && (
                                    <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                                        {fieldErrors.title}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Description *
                                </label>
                                <Textarea
                                    placeholder="Add context or details about your poll..."
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    rows={3}
                                    className="border-input bg-background text-foreground focus:border-blue-500 focus:ring-blue-500"
                                    disabled={loading}
                                />
                                {fieldErrors.description && (
                                    <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                                        {fieldErrors.description}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-foreground">
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
                                                className={`pl-8 border-input bg-background text-foreground focus:border-blue-500 focus:ring-blue-500 ${
                                                    fieldErrors.options?.[index]
                                                        ? "border-red-500"
                                                        : ""
                                                }`}
                                                disabled={loading}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
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
                                                className="hover:bg-red-100 hover:text-red-600 text-muted-foreground dark:hover:bg-red-900/20"
                                                disabled={loading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}

                                {fieldErrors.options &&
                                    !Array.isArray(fieldErrors.options) && (
                                        <p className="text-sm text-red-500 dark:text-red-400">
                                            {fieldErrors.options}
                                        </p>
                                    )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addOption}
                                    disabled={options.length >= 10 || loading}
                                    className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 border-dashed text-gray-600 dark:text-gray-300"
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
