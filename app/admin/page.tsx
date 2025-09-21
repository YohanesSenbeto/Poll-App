"use client";

import { useState, useEffect, useMemo, memo } from "react";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Daily Trends Chart Component (Memoized)
const DailyTrendsChart = memo(function DailyTrendsChart({ pollStats, voteStats }: {
    pollStats: Array<{ date: string; total_value: number }>,
    voteStats: Array<{ date: string; total_value: number }>
}) {
    // Memoize chart data to prevent unnecessary recalculations
    const chartData = useMemo(() => {
        return pollStats.map((pollStat) => {
            const voteStat = voteStats.find(vote => vote.date === pollStat.date);
            return {
                date: format(new Date(pollStat.date), "MMM d"),
                polls: pollStat.total_value,
                votes: voteStat?.total_value || 0,
            };
        });
    }, [pollStats, voteStats]);

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                        }}
                        formatter={(value: number, name: string) => [
                            `${value} ${name}`,
                            name.charAt(0).toUpperCase() + name.slice(1)
                        ]}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="polls"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Polls Created"
                    />
                    <Line
                        type="monotone"
                        dataKey="votes"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name="Votes Cast"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});

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

            // Use user_profiles instead of auth.users (more reliable with RLS)
            const { count: totalUsers } = await supabase
                .from("user_profiles")
                .select("*", { count: "exact", head: true });

            // Votes count (may be restricted by RLS). We'll compute a fallback later
            const { count: totalVotesRaw } = await supabase
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

            // User breakdowns - count by role from user_profiles
            const { count: adminUsers } = await supabase
                .from("user_profiles")
                .select("*", { count: "exact", head: true })
                .eq("role", "admin");

            const { count: regularUsers } = await supabase
                .from("user_profiles")
                .select("*", { count: "exact", head: true })
                .eq("role", "user");

            // Verified users: approximate with active profiles
            const { count: verifiedUsers } = await supabase
                .from("user_profiles")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true);

            // Poll creators and engagement
            const { data: activeCreators } = await supabase
                .from("polls")
                .select("user_id")
                .not("user_id", "is", null);
            const activePollCreators = new Set(
                activeCreators?.map((p) => p.user_id)
            ).size;

            // Language analytics (best-effort if tables exist)
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

            // Daily stats
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

            // Recent activity (use user_profiles instead of profiles)
            const { data: recentPolls } = await supabase
                .from("polls")
                .select(
                    `
                    *,
                    user_profiles:user_id (username, display_name, role),
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
                    user_profiles:user_id (username, display_name),
                    polls:poll_id (title, user_id)
                `
                )
                .order("created_at", { ascending: false })
                .limit(20);

            // User statistics from profiles
            let allUsers: any[] = [];
            let usersWithStats: User[] = [];
            try {
                const { data: profileUsers, error: profileErr } = await supabase
                    .from("user_profiles")
                    .select("user_id, username, display_name, role, created_at");

                if (!profileErr && profileUsers) {
                    allUsers = profileUsers.map((u) => ({
                        id: u.user_id,
                        email: "", // email not in user_profiles
                        username: u.display_name || u.username || `user_${String(u.user_id).slice(0,8)}`,
                        role: u.role || "user",
                        created_at: u.created_at,
                    }));
                }

                usersWithStats = await Promise.all(
                    allUsers.map(async (u) => {
                        const { count: pollsCount } = await supabase
                            .from("polls")
                            .select("*", { count: "exact", head: true })
                            .eq("user_id", u.id);
                        const { count: votesCount } = await supabase
                            .from("votes")
                            .select("*", { count: "exact", head: true })
                            .eq("user_id", u.id);
                        return {
                            ...u,
                            polls_count: pollsCount || 0,
                            votes_count: votesCount || 0,
                        } as User;
                    })
                );

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
                recentPolls?.map((poll: any) => ({
                    id: poll.id,
                    title: poll.title,
                    description: poll.description,
                    created_at: poll.created_at,
                    user_id: poll.user_id,
                    is_active: poll.is_active,
                    creator_email: "", // not available
                    creator_username:
                        poll.user_profiles?.display_name ||
                        poll.user_profiles?.username ||
                        `user_${String(poll.user_id).slice(0, 8)}`,
                    creator_role: poll.user_profiles?.role || "user",
                    vote_count:
                        poll.options?.reduce(
                            (sum: number, opt: any) =>
                                sum + (opt.votes_count || 0),
                            0
                        ) || 0,
                    option_count: poll.options?.length || 0,
                    options: poll.options || [],
                })) || [];

            // Fallback computed totals
            const computedTotalVotes = enrichedPolls.reduce(
                (sum, p) => sum + (p.vote_count || 0),
                0
            );

            setPolls(enrichedPolls);
            setUsers(usersWithStats);

            setAnalytics({
                total_polls: totalPolls || enrichedPolls.length || 0,
                total_users: totalUsers || (allUsers?.length || 0),
                total_votes: totalVotesRaw ?? computedTotalVotes,
                active_polls: activePolls || 0,
                inactive_polls: inactivePolls || Math.max((totalPolls || 0) - (activePolls || 0), 0),
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
                                    Daily Activity Trends
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Poll creation and voting activity over the last 7 days
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Chart Visualization */}
                                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                                        <div
                                            role="img"
                                            aria-label={`Line chart showing daily activity trends over the last 7 days, comparing poll creation and voting activity`}
                                        >
                                            <DailyTrendsChart
                                                pollStats={analytics?.daily_poll_stats || []}
                                                voteStats={analytics?.daily_vote_stats || []}
                                            />
                                        </div>
                                        {(analytics?.daily_poll_stats?.length || 0) > 0 && (
                                            <p className="sr-only">
                                                Daily activity data: {
                                                    (analytics?.daily_poll_stats || []).map((stat, index) => {
                                                        const voteStat = analytics?.daily_vote_stats?.find(
                                                            vote => vote.date === stat.date
                                                        );
                                                        return `${format(new Date(stat.date), "MMM d")}: ${stat.total_value} polls, ${voteStat?.total_value || 0} votes${index < (analytics?.daily_poll_stats?.length || 0) - 1 ? ', ' : ''}`;
                                                    }).join('')
                                                }
                                            </p>
                                        )}
                                    </div>

                                    {/* Detailed Breakdown */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-slate-300">Recent Activity</h4>
                                        {analytics?.daily_poll_stats &&
                                        analytics.daily_poll_stats.length > 0 ? (
                                            <div className="space-y-2">
                                                {analytics.daily_poll_stats.map((stat) => {
                                                    const voteStat = analytics.daily_vote_stats?.find(
                                                        vote => vote.date === stat.date
                                                    );
                                                    return (
                                                        <div
                                                            key={stat.date}
                                                            className="flex justify-between items-center p-2 bg-slate-900/30 rounded"
                                                        >
                                                            <span className="text-sm text-slate-300">
                                                                {format(new Date(stat.date), "MMM d")}
                                                            </span>
                                                            <div className="flex gap-3">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {stat.total_value} polls
                                                                </Badge>
                                                                {voteStat && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {voteStat.total_value} votes
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400">
                                                No daily data available
                                            </p>
                                        )}
                                    </div>
                                </div>
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
