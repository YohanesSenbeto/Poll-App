"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { EditPollForm } from "./edit-poll-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { notificationManager } from "@/lib/utils/notifications";
import type { Poll, PollOption } from "@/lib/types";

function EditPollPage() {
    const params = useParams();
    const router = useRouter();
    const pollId = params.id as string;

    const [poll, setPoll] = useState<Poll | null>(null);
    const [options, setOptions] = useState<PollOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPollData = async () => {
            try {
                const { getPollById } = await import("@/lib/database");
                const pollData = await getPollById(pollId);

                if (!pollData) {
                    setError("Poll not found");
                    return;
                }

                setPoll(pollData);
                setOptions(pollData.options || []);
            } catch (error: any) {
                console.error("Error fetching poll:", error);
                setError(error.message || "Failed to load poll data");
            } finally {
                setLoading(false);
            }
        };

        if (pollId) {
            fetchPollData();
        }
    }, [pollId]);

    const handlePollUpdate = (
        updatedPoll: Poll,
        updatedOptions: PollOption[]
    ) => {
        setPoll(updatedPoll);
        setOptions(updatedOptions);
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/polls">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Polls
                    </Link>
                </Button>

                <Card className="bg-card">
                    <CardContent className="text-center py-12">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2 text-foreground">
                            Error Loading Poll
                        </h2>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button asChild>
                            <Link href="/polls">Back to Polls</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!poll) {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/polls">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Polls
                    </Link>
                </Button>

                <Card className="bg-card">
                    <CardContent className="text-center py-12">
                        <h2 className="text-2xl font-bold mb-2 text-foreground">
                            Poll Not Found
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            The poll you're looking for doesn't exist or has
                            been removed.
                        </p>
                        <Button asChild>
                            <Link href="/polls">Back to Polls</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <EditPollForm
            poll={poll}
            options={options}
            onUpdate={handlePollUpdate}
        />
    );
}

export default function EditPoll() {
    return (
        <ProtectedRoute>
            <EditPollPage />
        </ProtectedRoute>
    );
}
