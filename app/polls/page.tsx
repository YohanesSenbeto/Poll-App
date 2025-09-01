"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { BarChart3, Clock, Users, TrendingUp } from "lucide-react";
import { getAllPolls, getPollStatistics } from "@/lib/database";
import { useEffect, useState } from "react";

export default function PollsPage() {
    const [polls, setPolls] = useState<any[]>([]);
    const [statistics, setStatistics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [allPolls, stats] = await Promise.all([
                    getAllPolls(),
                    getPollStatistics(),
                ]);
                setPolls(allPolls || []);
                setStatistics(stats);
            } catch (error) {
                console.error("Error fetching polls:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    const totalPolls = polls.length;
    const totalVotes = statistics?.total_votes || 0;
    const averageVotes =
        totalPolls > 0 ? Math.round(totalVotes / totalPolls) : 0;

    // Calculate myPolls count (you'll need to implement proper user filtering)
    const myPollsCount = 0; // TODO: implement user-based filtering once auth is ready

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 text-left">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Poll Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage and track your polls with real-time insights
                        </p>
                    </div>
                    <Button
                        asChild
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                        <Link href="/polls/create">Create New Poll</Link>
                    </Button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 justify-start">
                    <Card className="bg-gradient-to-br from-blue-100/50 dark:from-blue-900/20 to-blue-200/30 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        Total Polls
                                    </p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                        {totalPolls}
                                    </p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-100/50 dark:from-purple-900/20 to-purple-200/30 dark:to-purple-800/10 border-purple-200 dark:border-purple-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                        Total Votes
                                    </p>
                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                        {totalVotes}
                                    </p>
                                </div>
                                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-100/50 dark:from-green-900/20 to-green-200/30 dark:to-green-800/10 border-green-200 dark:border-green-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                        Avg Votes
                                    </p>
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                        {averageVotes.toFixed(1)}
                                    </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-100/50 dark:from-orange-900/20 to-orange-200/30 dark:to-orange-800/10 border-orange-200 dark:border-orange-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                        My Polls
                                    </p>
                                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                                        {myPollsCount}
                                    </p>
                                </div>
                                <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* All Polls section */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">All Polls</h2>
                    {polls.length === 0 ? (
                        <Card className="text-center py-12 bg-card">
                            <CardContent>
                                <h3 className="text-lg font-medium mb-2 text-foreground">
                                    No polls yet
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    Be the first to create a poll!
                                </p>
                                <Button asChild>
                                    <Link href="/polls/create">
                                        Create Your First Poll
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-start">
                            {polls.map((poll) => {
                                const totalVotes =
                                    poll.options?.reduce(
                                        (sum: number, option: any) =>
                                            sum + (option.votes_count || 0),
                                        0
                                    ) || 0;
                                return (
                                    <Card
                                        key={poll.id}
                                        className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500 bg-card"
                                    >
                                        <CardHeader>
                                            <CardTitle className="text-lg text-foreground">
                                                {poll.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                    Active
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(
                                                        poll.created_at
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-foreground">
                                                        Total Votes
                                                    </span>
                                                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                        {totalVotes}
                                                    </span>
                                                </div>
                                                {poll.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {poll.description}
                                                    </p>
                                                )}
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="w-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                                <Link
                                                    href={`/polls/${poll.id}`}
                                                >
                                                    View & Vote
                                                </Link>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
