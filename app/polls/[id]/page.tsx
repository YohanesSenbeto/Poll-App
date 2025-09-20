"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ProtectedRoute } from "@/components/protected-route";
import {
    getPollById,
    voteOnPoll,
    getPollResults,
    hasUserVoted,
} from "@/lib/database";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Users, Edit } from "lucide-react";
import type { Poll, PollOption } from "@/lib/types";

function PollView() {
    const params = useParams();
    const pollId = params.id as string;

    const [poll, setPoll] = useState<any>(null);
    const [selectedOption, setSelectedOption] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);
    const [userVoted, setUserVoted] = useState(false);
    const [myOptionId, setMyOptionId] = useState<string | null>(null);
    const [results, setResults] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isOwner, setIsOwner] = useState(false);

    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const {
                    data: { user: currentUser },
                } = await supabase.auth.getUser();
                setUser(currentUser);

                const pollData = await getPollById(pollId);
                setPoll(pollData);

                if (currentUser) {
                    const voted = await hasUserVoted(pollId, currentUser.id);
                    setUserVoted(!!voted);

                    // Fetch which option the user voted for (if any)
                    if (voted) {
                        const { data: myVote } = await supabase
                            .from('votes')
                            .select('option_id')
                            .eq('poll_id', pollId)
                            .eq('user_id', currentUser.id)
                            .single();
                        setMyOptionId(myVote?.option_id || null);
                    } else {
                        setMyOptionId(null);
                    }

                    if (pollData && pollData.user_id === currentUser.id) {
                        setIsOwner(true);
                    }
                }

                const resultsData = await getPollResults(pollId);
                setResults(resultsData);
            } catch (error) {
                console.error("Error fetching poll:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [pollId, supabase.auth]);

    const handleVote = async () => {
        if (!selectedOption || !user) return;

        setVoting(true);
        try {
            await voteOnPoll(pollId, selectedOption);

            const [updatedPoll, updatedResults, voted] = await Promise.all([
                getPollById(pollId),
                getPollResults(pollId),
                hasUserVoted(pollId, user.id),
            ]);

            setPoll(updatedPoll);
            setResults(updatedResults);
            setUserVoted(!!voted);
            setSelectedOption("");
            // Refresh which option id the user voted for
            if (voted) {
                const { data: myVote } = await supabase
                    .from('votes')
                    .select('option_id')
                    .eq('poll_id', pollId)
                    .eq('user_id', user.id)
                    .single();
                setMyOptionId(myVote?.option_id || null);
            }
        } catch (error: any) {
            console.error("Error voting:", error);
        } finally {
            setVoting(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8">
                <div className="flex justify-start items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
            </div>
        );
    }

    if (!poll) {
        return (
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8">
                <Card className="bg-card">
                    <CardContent className="text-left py-12">
                        <h2 className="text-2xl font-bold mb-2 text-foreground">Poll Not Found</h2>
                        <p className="text-muted-foreground mb-4">The poll you're looking for doesn't exist or has been removed.</p>
                        <Button asChild>
                            <Link href="/polls">Back to Polls</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Derive total votes from results if available
    const totalVotes = Array.isArray(results)
        ? results.reduce((sum: number, r: any) => sum + (r.vote_count || 0), 0)
        : results?.total_votes || 0;

    const canSeeResults = isOwner || userVoted;

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8">
            <Button asChild variant="ghost" className="mb-4">
                <Link href="/polls">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Polls
                </Link>
            </Button>

            <Card className="bg-card max-w-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl text-foreground">{poll.title}</CardTitle>
                        <div className="flex items-center gap-2">
                            {userVoted && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Voted
                                </span>
                            )}
                            {isOwner && (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/polls/${pollId}/edit`}>
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    {poll.description && <p className="text-muted-foreground">{poll.description}</p>}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(poll.created_at).toLocaleDateString()}
                        </span>
                        {canSeeResults && (
                            <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {canSeeResults ? (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Results</h3>
                            {poll.options?.map((option: any) => {
                                // Support results shape from RPC returning rows with option_id/vote_count
                                const optionRow = Array.isArray(results)
                                    ? results.find((r: any) => r.option_id === option.id)
                                    : null;
                                const optionVotes = optionRow?.vote_count || 0;
                                const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;

                                return (
                                    <div key={option.id} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-foreground">{option.text}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {isOwner ? `${optionVotes} (${percentage}%)` : `${percentage}%`}
                                            </span>
                                        </div>
                                        <Progress
                                            value={percentage}
                                            className={`h-2 ${myOptionId === option.id ? 'bg-green-200' : ''}`}
                                            indicatorClassName={myOptionId === option.id ? 'bg-green-600' : undefined}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Cast Your Vote</h3>
                            <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-3">
                                {poll.options?.map((option: any) => (
                                    <div key={option.id} className="flex items-center space-x-2">
                                        <RadioGroupItem value={option.id} id={option.id} />
                                        <Label htmlFor={option.id} className="cursor-pointer">{option.text}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            <Button onClick={handleVote} disabled={!selectedOption || !user || voting} className="w-full">
                                {voting ? "Submitting..." : "Submit Vote"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function PollPage() {
    return (
        <ProtectedRoute>
            <PollView />
        </ProtectedRoute>
    );
}
