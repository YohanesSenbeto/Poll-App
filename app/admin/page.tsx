"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../auth-context";
import { supabase } from "@/lib/supabase";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BarChart3,
    Users,
    MessageSquare,
    Shield,
    Trash2,
    Eye,
    Activity,
    TrendingUp,
    Code,
    Database,
    Calendar,
} from "lucide-react";
import { format } from "date-fns";

interface Poll {
    id: string;
    title: string;
    description: string;
    created_at: string;
    user_id: string;
    is_active: boolean;
    creator_email: string;
    creator_username: string;
    vote_count: number;
    option_count: number;
    options: Array<{
        id: string;
        option_text: string;
        votes_count: number;
    }>;
}

interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    created_at: string;
    polls_count: number;
    votes_count: number;
}

interface Analytics {
    total_polls: number;
    total_users: number;
    total_votes: number;
    active_polls: number;
    inactive_polls: number;
    admin_users: number;
    regular_users: number;
    verified_users: number;
    active_poll_creators: number;
    latest_poll: string;
    trending_languages: Array<{ language_name: string; total_value: number }>;
    language_mentions: Array<{ language_name: string; mention_count: number }>;
    all_languages: Array<{ id: number; name: string; category: string }>;
    daily_poll_stats: Array<{ date: string; total_value: number }>;
    daily_vote_stats: Array<{ date: string; total_value: number }>;
    recent_votes: Array<any>;
}

export default function AdminDashboard() {
    const { user, isAdmin } = useAuth();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    const loadAdminData = async () => {
        try {
            // Get comprehensive analytics using new tables
            const today = new Date().toISOString().split("T")[0];

            // Basic counts with detailed breakdowns
            const { count: totalPolls } = await supabase
                .from("polls")
                .select("*", { count: "exact", head: true });

            const { count: totalUsers } = await supabase
                .from("auth.users")
                .select("*", { count: "exact", head: true });

            const { count: totalVotes } = await supabase
                .from("votes")
                .select("*", { count: "exact", head: true });

            const { count: activePolls } = await supabase
                .from("polls")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true);

            const { count: inactivePolls } = await supabase
                .from("polls")
                .select("*", { count: "exact", head: true })
                .eq("is_active", false);

            // User breakdowns - use auth.users for counts
            const { count: adminUsers } = await supabase
                .from("auth.users")
                .select("*", { count: "exact", head: true })
                .eq("role", "admin");

            const { count: regularUsers } = await supabase
                .from("auth.users")
                .select("*", { count: "exact", head: true })
                .eq("role", "user");

            // Count verified users (email confirmed)
            const { count: verifiedUsers } = await supabase
                .from("auth.users")
                .select("*", { count: "exact", head: true })
                .not("email_confirmed_at", "is", null);

            // Poll creators and engagement
            const { data: activeCreators } = await supabase
                .from("polls")
                .select("user_id")
                .not("user_id", "is", null);
            const activePollCreators = new Set(
                activeCreators?.map((p) => p.user_id)
            ).size;

            // Language analytics
            const { data: trendingLanguages } = await supabase
                .from("daily_analytics")
                .select("language_name, total_value")
                .eq("metric_type", "poll_creation")
                .order("total_value", { ascending: false })
                .limit(10);

            const { data: languageMentions } = await supabase
                .from("language_mentions")
                .select("language_name, mention_count")
                .order("mention_count", { ascending: false })
                .limit(15);

            const { data: allLanguages } = await supabase
                .from("common_programming_languages")
                .select("*")
                .order("name");

            // Daily stats with both polls and votes
            const { data: dailyPollStats } = await supabase
                .from("daily_analytics")
                .select("date, total_value")
                .eq("metric_type", "poll_creation")
                .order("date", { ascending: false })
                .limit(14);

            const { data: dailyVoteStats } = await supabase
                .from("daily_analytics")
                .select("date, total_value")
                .eq("metric_type", "votes_cast")
                .order("date", { ascending: false })
                .limit(14);

            // Recent activity
            const { data: recentPolls } = await supabase
                .from("polls")
                .select(
                    `
                    *,
                    profiles:user_id (email, username, role),
                    options (
                        id,
                        option_text,
                        votes_count
                    )
                `
                )
                .order("created_at", { ascending: false })
                .limit(50);

            const { data: recentVotes } = await supabase
                .from("votes")
                .select(
                    `
                    *,
                    profiles:user_id (email, username),
                    polls:poll_id (title, user_id)
                `
                )
                .order("created_at", { ascending: false })
                .limit(20);

            // User statistics - handle missing profiles table
            let allUsers: any[] = [];
            let usersWithStats: User[] = [];

            try {
                // Try to fetch users with the new RLS policy
                const { data: authUsers, error: authError } = await supabase
                    .from("auth.users")
                    .select("id, email, created_at, email_confirmed_at")
                    .order("created_at", { ascending: false });

                if (authError) {
                    console.warn(
                        "Cannot access auth.users, using fallback:",
                        authError.message
                    );

                    // Fallback: reconstruct users from polls and votes
                    const { data: pollUsers } = await supabase
                        .from("polls")
                        .select("user_id, created_at")
                        .not("user_id", "is", null);

                    const { data: voteUsers } = await supabase
                        .from("votes")
                        .select("user_id, created_at")
                        .not("user_id", "is", null);

                    const userSet = new Set();
                    const userTimestamps = new Map();

                    pollUsers?.forEach((poll) => {
                        if (poll.user_id) {
                            userSet.add(poll.user_id);
                            userTimestamps.set(poll.user_id, poll.created_at);
                        }
                    });

                    voteUsers?.forEach((vote) => {
                        if (vote.user_id) {
                            userSet.add(vote.user_id);
                            userTimestamps.set(vote.user_id, vote.created_at);
                        }
                    });

                    allUsers = Array.from(userSet).map((userId: any) => ({
                        id: userId,
                        email: `${userId.slice(0, 8)}@user.com`,
                        username: `user_${userId.slice(0, 8)}`,
                        role: "user",
                        created_at:
                            userTimestamps.get(userId) ||
                            new Date().toISOString(),
                        email_confirmed: false,
                    }));
                } else {
                    // Successfully fetched from auth.users
                    allUsers = authUsers.map((user) => ({
                        id: user.id,
                        email: user.email || "Unknown",
                        username: user.email?.split("@")[0] || "user",
                        role: "user",
                        created_at: user.created_at,
                        email_confirmed: !!user.email_confirmed_at,
                    }));
                }

                // Get user statistics
                usersWithStats = await Promise.all(
                    allUsers.map(async (user) => {
                        const { count: pollsCount } = await supabase
                            .from("polls")
                            .select("*", { count: "exact", head: true })
                            .eq("user_id", user.id);

                        const { count: votesCount } = await supabase
                            .from("votes")
                            .select("*", { count: "exact", head: true })
                            .eq("user_id", user.id);

                        return {
                            ...user,
                            polls_count: pollsCount || 0,
                            votes_count: votesCount || 0,
                        };
                    })
                );

                // Sort by creation date
                usersWithStats.sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                );
            } catch (error) {
                console.error("Error loading users:", error);
                usersWithStats = [];
            }

            const enrichedPolls =
                recentPolls?.map((poll) => ({
                    id: poll.id,
                    title: poll.title,
                    description: poll.description,
                    created_at: poll.created_at,
                    user_id: poll.user_id,
                    is_active: poll.is_active,
                    creator_email: poll.profiles?.email || "Unknown",
                    creator_username:
                        poll.profiles?.username ||
                        poll.profiles?.email?.split("@")[0] ||
                        "user",
                    creator_role: poll.profiles?.role || "user",
                    vote_count:
                        poll.options?.reduce(
                            (sum: number, opt: any) =>
                                sum + (opt.votes_count || 0),
                            0
                        ) || 0,
                    option_count: poll.options?.length || 0,
                    options: poll.options || [],
                })) || [];

            setPolls(enrichedPolls);
            setUsers(usersWithStats);

            setAnalytics({
                total_polls: totalPolls || 0,
                total_users: totalUsers || 0,
                total_votes: totalVotes || 0,
                active_polls: activePolls || 0,
                inactive_polls: inactivePolls || 0,
                admin_users: adminUsers || 0,
                regular_users: regularUsers || 0,
                verified_users: verifiedUsers || 0,
                active_poll_creators: activePollCreators,
                trending_languages: trendingLanguages || [],
                language_mentions: languageMentions || [],
                all_languages: allLanguages || [],
                daily_poll_stats: dailyPollStats || [],
                daily_vote_stats: dailyVoteStats || [],
                recent_votes: recentVotes || [],
                latest_poll:
                    enrichedPolls[0]?.created_at || new Date().toISOString(),
            });
        } catch (error) {
            console.error("Error loading admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePoll = async (pollId: string) => {
        if (
            confirm(
                "Are you sure you want to delete this poll? This action cannot be undone."
            )
        ) {
            try {
                const { deletePoll } = await import("@/lib/database");

                await supabase.from("votes").delete().eq("poll_id", pollId);
                await supabase.from("options").delete().eq("poll_id", pollId);
                await deletePoll(pollId, true);

                await supabase.from("admin_actions").insert({
                    admin_id: user?.id,
                    action_type: "delete_poll",
                    target_id: pollId,
                    target_type: "poll",
                    action_details: { reason: "Admin deletion" },
                });

                loadAdminData();
            } catch (error) {
                console.error("Error deleting poll:", error);
                alert(
                    "Failed to delete poll: " +
                        (error instanceof Error
                            ? error.message
                            : "Unknown error")
                );
            }
        }
    };

    useEffect(() => {
        if (isAdmin) {
            loadAdminData();
        }
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <div className="container mx-auto p-8">
                <Card className="max-w-md mx-auto bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-red-400 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Access Denied
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400">
                            You do not have admin privileges to access this
                            dashboard.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-slate-100">
                    <Shield className="w-8 h-8 text-blue-400" />
                    Admin Dashboard
                </h1>
                <p className="text-slate-400">
                    Complete system overview with programming language insights
                </p>
            </div>

            {/* Main Analytics */}
            {analytics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-slate-200">
                                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                                Total Polls
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-white">
                                {analytics.total_polls}
                            </div>
                            <p className="text-xs text-slate-400">
                                Active polls in system
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-slate-200">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                                Total Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-white">
                                {analytics.total_users}
                            </div>
                            <p className="text-xs text-slate-400">
                                {analytics.active_poll_creators} active creators
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-slate-200">
                                <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                                Total Votes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-white">
                                {analytics.total_votes}
                            </div>
                            <p className="text-xs text-slate-400">
                                Across all polls
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-slate-200">
                                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                                Engagement
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-white">
                                {analytics.total_polls > 0
                                    ? Math.round(
                                          analytics.total_votes /
                                              analytics.total_polls
                                      )
                                    : 0}
                            </div>
                            <p className="text-xs text-slate-400">
                                Avg votes per poll
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Programming Language Analytics */}
            {analytics && (
                <div className="grid gap-6 md:grid-cols-2 mb-6 sm:mb-8">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-slate-100">
                                <Code className="w-5 h-5 text-blue-400" />
                                Trending Languages
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Most popular programming languages in polls
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analytics.trending_languages &&
                            analytics.trending_languages.length > 0 ? (
                                <div className="space-y-3">
                                    {analytics.trending_languages.map(
                                        (lang, index) => (
                                            <div
                                                key={lang.language_name}
                                                className="flex items-center justify-between"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-slate-300">
                                                        {index + 1}.
                                                    </span>
                                                    <span className="text-sm text-slate-200">
                                                        {lang.language_name}
                                                    </span>
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs"
                                                >
                                                    {lang.total_value} polls
                                                </Badge>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">
                                    No language data available
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-slate-100">
                                <Database className="w-5 h-5 text-green-400" />
                                Language Mentions
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Most mentioned programming languages
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analytics.language_mentions &&
                            analytics.language_mentions.length > 0 ? (
                                <div className="space-y-3">
                                    {analytics.language_mentions
                                        .slice(0, 5)
                                        .map((lang, index) => (
                                            <div
                                                key={lang.language_name}
                                                className="flex items-center justify-between"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-slate-300">
                                                        {index + 1}.
                                                    </span>
                                                    <span className="text-sm text-slate-200">
                                                        {lang.language_name}
                                                    </span>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {lang.mention_count}{" "}
                                                    mentions
                                                </Badge>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">
                                    No mentions yet
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs defaultValue="polls" className="space-y-3 sm:space-y-4">
                <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
                    <TabsTrigger
                        value="polls"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                        <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                        Polls ({polls.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="users"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        Users ({users.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="insights"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                        <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                        Insights
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="polls">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-slate-100">
                                All Polls
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Complete list of all polls in the system with
                                real-time data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 sm:space-y-4">
                                {polls.map((poll) => (
                                    <div
                                        key={poll.id}
                                        className="border border-slate-700 rounded-lg p-3 sm:p-4 bg-slate-900/50"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-100 text-sm sm:text-base">
                                                    {poll.title}
                                                </h3>
                                                <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-2">
                                                    {poll.description}
                                                </p>
                                                <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
                                                    <span className="text-slate-300">
                                                        By:{" "}
                                                        <span className="text-slate-400 truncate">
                                                            {
                                                                poll.creator_username
                                                            }
                                                        </span>
                                                    </span>
                                                    <span className="text-slate-300">
                                                        {poll.vote_count} votes
                                                    </span>
                                                    <span className="text-slate-300">
                                                        {poll.option_count}{" "}
                                                        options
                                                    </span>
                                                    <span className="text-slate-400">
                                                        {format(
                                                            new Date(
                                                                poll.created_at
                                                            ),
                                                            "MMM d, yyyy"
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Badge
                                                    variant={
                                                        poll.is_active
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {poll.is_active
                                                        ? "Active"
                                                        : "Inactive"}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDeletePoll(
                                                            poll.id
                                                        )
                                                    }
                                                    className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-slate-100">
                                User Management
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Manage user roles and view activity statistics
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 sm:space-y-4">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="border border-slate-700 rounded-lg p-3 sm:p-4 bg-slate-900/50"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-100 text-sm sm:text-base">
                                                    {user.username}
                                                </h3>
                                                <p className="text-xs sm:text-sm text-slate-400 truncate">
                                                    {user.email}
                                                </p>
                                                <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 text-xs sm:text-sm">
                                                    <span className="text-slate-300">
                                                        {user.polls_count} polls
                                                        created
                                                    </span>
                                                    <span className="text-slate-300">
                                                        {user.votes_count} votes
                                                        cast
                                                    </span>
                                                    <span className="text-slate-400">
                                                        {format(
                                                            new Date(
                                                                user.created_at
                                                            ),
                                                            "MMM d, yyyy"
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={
                                                        user.role === "admin"
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {user.role}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="insights">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-slate-100 flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Daily Activity
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Poll creation trends over the last 7 days
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analytics?.daily_poll_stats &&
                                analytics.daily_poll_stats.length > 0 ? (
                                    <div className="space-y-2">
                                        {analytics.daily_poll_stats.map(
                                            (stat) => (
                                                <div
                                                    key={stat.date}
                                                    className="flex justify-between items-center"
                                                >
                                                    <span className="text-sm text-slate-300">
                                                        {format(
                                                            new Date(stat.date),
                                                            "MMM d"
                                                        )}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        {stat.total_value} polls
                                                    </Badge>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">
                                        No daily data available
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-slate-100 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    System Health
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Key performance indicators
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-300">
                                            User Engagement Rate
                                        </span>
                                        <Badge
                                            variant="default"
                                            className="text-xs"
                                        >
                                            {analytics &&
                                            analytics.total_users > 0
                                                ? Math.round(
                                                      (analytics.active_poll_creators /
                                                          analytics.total_users) *
                                                          100
                                                  )
                                                : 0}
                                            %
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-300">
                                            Average Votes per Poll
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {analytics &&
                                            analytics.total_polls > 0
                                                ? Math.round(
                                                      analytics.total_votes /
                                                          analytics.total_polls
                                                  )
                                                : 0}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-300">
                                            Active Languages
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            {analytics?.trending_languages
                                                ?.length || 0}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
