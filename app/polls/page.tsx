"use client"

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const totalPolls = polls.length;
    const totalVotes = statistics?.total_votes || 0;
    const averageVotes =
        totalPolls > 0 ? Math.round(totalVotes / totalPolls) : 0;

    // Calculate myPolls count (you'll need to implement proper user filtering)
    const myPollsCount = 0; // Replace with actual logic to filter polls by current user

    return (
        <div className="space-y-8">
            {/* Header with create button */}
            <div className="flex justify-between items-center">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-700">
                                    Total Polls
                                </p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {totalPolls}
                                </p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-700">
                                    Total Votes
                                </p>
                                <p className="text-2xl font-bold text-purple-900">
                                    {totalVotes}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-700">
                                    Avg Votes
                                </p>
                                <p className="text-2xl font-bold text-green-900">
                                    {averageVotes}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-700">
                                    My Polls
                                </p>
                                <p className="text-2xl font-bold text-orange-900">
                                    {myPollsCount}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* All Polls section */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">All Polls</h2>
                {polls.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <h3 className="text-lg font-medium mb-2">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
                                >
                                    <CardHeader>
                                        <CardTitle className="text-lg">
                                            {poll.question}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                                                <span className="text-sm font-medium">
                                                    Total Votes
                                                </span>
                                                <span className="text-lg font-bold text-blue-600">
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
                                            className="w-full hover:bg-blue-50"
                                        >
                                            <Link href={`/polls/${poll.id}`}>
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
    );
}
