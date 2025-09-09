"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import {
    BarChart3,
    Clock,
    Users,
    TrendingUp,
    PieChart,
    Activity,
} from "lucide-react";
import { getAllPolls, getPollStatistics } from "@/lib/database";
import { useAuth } from "@/app/auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";

// Memoize the poll card component for better performance - MOVE THIS FIRST!
const PollCard = React.memo(
    ({ poll, isMyPoll }: { poll: any; isMyPoll: boolean }) => {
        // Calculate total votes once
        const totalVotes = React.useMemo(() => {
            return (
                poll.options?.reduce(
                    (sum: number, option: any) =>
                        sum + (option.votes_count || 0),
                    0
                ) || 0
            );
        }, [poll.options]);

        // Format date once
        const formattedDate = React.useMemo(() => {
            return new Date(poll.created_at).toLocaleDateString();
        }, [poll.created_at]);

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
                            {isMyPoll ? "My Poll" : "Active"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {formattedDate}
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
                        <Link href={`/polls/${poll.id}`}>View & Vote</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }
);

PollCard.displayName = "PollCard";

// Helper function to render poll cards - MOVE THIS SECOND!
// Remove the old PollCard component - it's now replaced by PollCardWithStats

// Now define the main component
export default function PollsPage() {
    const [polls, setPolls] = useState<any[]>([]);
    const [myPolls, setMyPolls] = useState<any[]>([]);
    const [otherPolls, setOtherPolls] = useState<any[]>([]);
    const [statistics, setStatistics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // DEBUG: Log auth status
    useEffect(() => {
        console.log("=== DEBUG: User authentication status:", {
            user,
            authLoading,
        });
    }, [authLoading, user]);

    // Memoize the data fetching function
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [allPolls, stats] = await Promise.all([
                getAllPolls(),
                getPollStatistics(),
            ]);

            setPolls(allPolls || []);
            setStatistics(stats);

            // Process data
            if (user) {
                const userPolls: any[] = [];
                const otherPolls: any[] = [];

                allPolls?.forEach((poll) => {
                    if (poll.user_id === user.id) {
                        userPolls.push(poll);
                    } else {
                        otherPolls.push(poll);
                    }
                });

                setMyPolls(userPolls);
                setOtherPolls(otherPolls);
            } else {
                setMyPolls([]);
                setOtherPolls(allPolls || []);
            }
        } catch (error) {
            console.error("Error fetching polls:", error);
            setError(
                error instanceof Error ? error.message : "Failed to load polls"
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Main data fetching useEffect
    useEffect(() => {
        if (!authLoading) {
            fetchData();
        }
    }, [fetchData, authLoading]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login?redirectTo=/polls');
        }
    }, [authLoading, user, router]);

    if (authLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 text-left">
                    <div className="flex flex-col items-center justify-center py-12">
                        <Card className="w-full max-w-md text-center">
                            <CardContent className="py-8">
                                <div className="mb-4">
                                    <svg
                                        className="w-16 h-16 text-red-500 mx-auto"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    Error Loading Polls
                                </h1>
                                <p className="text-muted-foreground mb-4">
                                    {error}
                                </p>
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    Try Again
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    const totalPolls = polls.length;
    const totalVotes = statistics?.total_votes || 0;
    const averageVotes =
        totalPolls > 0 ? Math.round(totalVotes / totalPolls) : 0;

    const myPollsCount = myPolls.length;

    // Calculate detailed statistics for charts
    const voteDistributionData = [
        {
            name: "My Polls",
            value: myPolls.reduce(
                (sum, poll) =>
                    sum +
                    (poll.options?.reduce(
                        (optionSum, option) =>
                            optionSum + (option.votes_count || 0),
                        0
                    ) || 0),
                0
            ),
        },
        {
            name: "Other Polls",
            value: otherPolls.reduce(
                (sum, poll) =>
                    sum +
                    (poll.options?.reduce(
                        (optionSum, option) =>
                            optionSum + (option.votes_count || 0),
                        0
                    ) || 0),
                0
            ),
        },
    ];

    const topPollsData = polls
        .map((poll) => ({
            name:
                poll.title.length > 15
                    ? poll.title.substring(0, 15) + "..."
                    : poll.title,
            votes:
                poll.options?.reduce(
                    (sum, option) => sum + (option.votes_count || 0),
                    0
                ) || 0,
            isMine: user && poll.user_id === user.id,
        }))
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 5);

    const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

    // Calculate voting trends by day
    const votingTrends = polls
        .reduce((acc: any[], poll) => {
            const date = new Date(poll.created_at).toLocaleDateString();
            const existing = acc.find((item) => item.date === date);
            const votes =
                poll.options?.reduce(
                    (sum, option) => sum + (option.votes_count || 0),
                    0
                ) || 0;

            if (existing) {
                existing.polls += 1;
                existing.votes += votes;
            } else {
                acc.push({ date, polls: 1, votes });
            }
            return acc;
        }, [])
        .slice(-7); // Last 7 days

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
                {/* My Polls section */}
                // Replace the old PollCard usage with PollCardWithStats
                {myPolls.length > 0 && (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            My Polls
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {myPolls.map((poll) => (
                                <PollCardWithStats
                                    key={poll.id}
                                    poll={poll}
                                    isMyPoll={true}
                                />
                            ))}
                        </div>
                    </>
                )}
                {otherPolls.length > 0 && (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            {user ? "Other Users' Polls" : "All Polls"}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {otherPolls.map((poll) => (
                                <PollCardWithStats
                                    key={poll.id}
                                    poll={poll}
                                    isMyPoll={false}
                                />
                            ))}
                        </div>
                    </>
                )}
                {otherPolls.length === 0 && myPolls.length === 0 && (
                    <Card className="text-center py-12 bg-card">
                        <CardContent>
                            <h3 className="text-lg font-medium mb-2 text-foreground">
                                No polls available
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {user
                                    ? "No polls to view"
                                    : "Be the first to create a poll!"}
                            </p>
                            <Button asChild>
                                <Link href="/polls/create">
                                    Create Your First Poll
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// Add voting statistics to each poll card
const PollCardWithStats = React.memo(
    ({ poll, isMyPoll }: { poll: any; isMyPoll: boolean }) => {
        const totalVotes = React.useMemo(() => {
            return (
                poll.options?.reduce(
                    (sum: number, option: any) =>
                        sum + (option.votes_count || 0),
                    0
                ) || 0
            );
        }, [poll.options]);

        const formattedDate = React.useMemo(() => {
            return new Date(poll.created_at).toLocaleDateString();
        }, [poll.created_at]);

        // Calculate percentages for each option
        const optionsWithPercentages = React.useMemo(() => {
            return (
                poll.options?.map((option: any) => ({
                    ...option,
                    percentage:
                        totalVotes > 0
                            ? Math.round(
                                  (option.votes_count / totalVotes) * 100
                              )
                            : 0,
                })) || []
            );
        }, [poll.options, totalVotes]);

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
                            {isMyPoll ? "My Poll" : "Active"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {formattedDate}
                        </span>
                        <span className="text-sm font-bold text-green-600">
                            {totalVotes} votes
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
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

                        {/* Voting Options with Progress Bars */}
                        {optionsWithPercentages.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Options:
                                </h4>
                                {optionsWithPercentages.map((option: any) => (
                                    <div key={option.id} className="text-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {option.text}
                                            </span>
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                {option.votes_count} (
                                                {option.percentage}%)
                                            </span>
                                        </div>
                                        <Progress
                                            value={option.percentage}
                                            className="h-2"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        asChild
                        variant="outline"
                        className="w-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                        <Link href={`/polls/${poll.id}`}>View & Vote</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }
);

PollCardWithStats.displayName = "PollCardWithStats";
