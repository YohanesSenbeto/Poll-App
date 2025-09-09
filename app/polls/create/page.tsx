"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPoll } from "@/lib/database";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
    createPollSchema,
    programmingLanguages,
} from "@/lib/schemas/poll.schema";
import { notificationManager } from "@/lib/utils/notifications";
import { useAuth } from "@/app/auth-context";
import { ProtectedRoute } from "@/components/protected-route";

function CreatePollForm() {
    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    /* ------------------------------------------------------------------ */
    /*                             Validation                             */
    /* ------------------------------------------------------------------ */
    const isValid = () => {
        try {
            createPollSchema.parse({
                title,
                description,
                languages: selectedLanguages,
            });
            setFieldErrors({});
            return true;
        } catch (err: any) {
            if (err.errors) {
                const errors: Record<string, string> = {};
                err.errors.forEach((e: any) => {
                    if (e.path[0] === "languages") {
                        errors["languages"] = e.message;
                    } else {
                        errors[e.path[0]] = e.message;
                    }
                });
                setFieldErrors(errors);
            }
            return false;
        }
    };

    /* ------------------------------------------------------------------ */
    /*                           Submit Handler                           */
    /* ------------------------------------------------------------------ */
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
        if (selectedLanguages.length !== 4) {
            notificationManager.addNotification({
                type: "error",
                title: "Validation Error",
                message: "Please select exactly 4 programming languages",
                duration: 5000,
            });
            return;
        }

        const payload = {
            title: title.trim(),
            description: description.trim() || null,
            options: selectedLanguages,
        };

        setLoading(true);
        try {
            // Create poll and navigate immediately
            const poll = await createPoll(payload);

            if (poll && poll.id) {
                // Immediate navigation with prefetch
                router.prefetch(`/polls/${poll.id}`);
                router.push(`/polls/${poll.id}`);

                // Show notification after navigation starts
                setTimeout(() => {
                    notificationManager.addNotification({
                        type: "success",
                        title: "Poll Created!",
                        message: "Your poll has been created successfully",
                        duration: 5000,
                    });
                }, 100);
            } else {
                throw new Error("Failed to create poll");
            }
        } catch (err: any) {
            console.error(err);
            notificationManager.addNotification({
                type: "error",
                title: "Error Creating Poll",
                message: err.message ?? "Unexpected error",
                duration: 8000,
            });
        } finally {
            setLoading(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*                        Authentication Notice                       */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        if (searchParams.get("authRequired") === "true" && !user) {
            notificationManager.addNotification({
                type: "warning",
                title: "Authentication Required",
                message: "Please register or login to create polls",
                duration: 5000,
            });
        }
    }, [searchParams, user]);

    /* ------------------------------------------------------------------ */
    /*                                 JSX                                */
    /* ------------------------------------------------------------------ */
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Card className="max-w-2xl mx-auto border-2 shadow-lg">
                <CardHeader>
                    <CardTitle>Create New Poll</CardTitle>
                </CardHeader>
                <CardContent>
                    {!user ? (
                        <div className="py-8 text-center">
                            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                            <p className="mb-4">
                                Please register or login to create polls.
                            </p>
                            <div className="space-x-4">
                                <Link href="/auth/login?redirectTo=/polls/create">
                                    <Button>Sign In</Button>
                                </Link>
                                <Link href="/auth/register?redirectTo=/polls/create">
                                    <Button variant="outline">
                                        Create Account
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Title */}
                            <div className="space-y-1">
                                <Label>Poll Title *</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="What's your favourite language?"
                                />
                                {fieldErrors.title && (
                                    <p className="text-sm text-red-600">
                                        {fieldErrors.title}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-1">
                                <Label>Description *</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    placeholder="(optional) Provide more context for voters"
                                    rows={3}
                                />
                                {fieldErrors.description && (
                                    <p className="text-sm text-red-600">
                                        {fieldErrors.description}
                                    </p>
                                )}
                            </div>

                            {/* Language Checkboxes */}
                            <div className="space-y-2">
                                <Label>
                                    Select exactly 4 programming languages *
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {programmingLanguages.map((lang) => {
                                        const checked =
                                            selectedLanguages.includes(lang);
                                        return (
                                            <div
                                                key={lang}
                                                className="flex items-center space-x-2"
                                            >
                                                <Checkbox
                                                    id={lang}
                                                    checked={checked}
                                                    disabled={
                                                        !checked &&
                                                        selectedLanguages.length >=
                                                            4
                                                    }
                                                    onCheckedChange={(val) => {
                                                        setSelectedLanguages(
                                                            (prev) => {
                                                                if (val) {
                                                                    return prev.length <
                                                                        4
                                                                        ? [
                                                                              ...prev,
                                                                              lang,
                                                                          ]
                                                                        : prev;
                                                                }
                                                                return prev.filter(
                                                                    (l) =>
                                                                        l !==
                                                                        lang
                                                                );
                                                            }
                                                        );
                                                    }}
                                                />
                                                <Label
                                                    htmlFor={lang}
                                                    className="capitalize"
                                                >
                                                    {lang}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                                {fieldErrors.languages && (
                                    <p className="text-sm text-red-600">
                                        {fieldErrors.languages}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={
                                    loading || selectedLanguages.length !== 4
                                }
                            >
                                {loading ? "Creating…" : "Create Poll"}
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
