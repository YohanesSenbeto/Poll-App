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
    AlertTriangle,
    CheckCircle,
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
    active_poll_creators: number;
    latest_poll: string;
    latest_vote: string;
}

export default function AdminDashboard() {
    const { user, isAdmin } = useAuth();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPoll, setSelectedPoll] = useState<string | null>(null);

    useEffect(() => {
        if (isAdmin) {
            loadAdminData();
        }
    }, [isAdmin]);

    const loadAdminData = async () => {
        try {
            // Load analytics
            const { data: analyticsData } = await supabase
                .from("admin_analytics")
                .select("*")
                .single();

            if (analyticsData) {
                setAnalytics(analyticsData);
            }

            // Load all polls with user details
            const { data: pollsData } = await supabase
                .from("user_polls_detailed")
                .select("*")
                .order("created_at", { ascending: false });

            if (pollsData) {
                setPolls(pollsData);

                // Extract unique user information from polls
                const userMap = new Map();
                const userPollCounts = new Map();
                const userVoteCounts = new Map();

                // Count polls per user
                pollsData.forEach((poll) => {
                    if (poll.user_id) {
                        userPollCounts.set(
                            poll.user_id,
                            (userPollCounts.get(poll.user_id) || 0) + 1
                        );

                        if (!userMap.has(poll.user_id)) {
                            userMap.set(poll.user_id, {
                                id: poll.user_id,
                                email: poll.creator_email || "Unknown",
                                username:
                                    poll.creator_username ||
                                    poll.creator_email?.split("@")[0] ||
                                    "user",
                                created_at: poll.created_at,
                                role: poll.creator_role || "user",
                            });
                        }
                    }
                });

                // Get vote counts per user (separate query)
                const { data: votesData } = await supabase
                    .from("votes")
                    .select("user_id");

                if (votesData) {
                    votesData.forEach((vote) => {
                        if (vote.user_id) {
                            userVoteCounts.set(
                                vote.user_id,
                                (userVoteCounts.get(vote.user_id) || 0) + 1
                            );
                        }
                    });
                }

                // Combine user data with counts
                const usersWithStats = Array.from(userMap.values()).map(
                    (user) => ({
                        ...user,
                        polls_count: userPollCounts.get(user.id) || 0,
                        votes_count: userVoteCounts.get(user.id) || 0,
                    })
                );

                setUsers(usersWithStats);
            }
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
                // First delete votes and options (to maintain referential integrity)
                await supabase.from("votes").delete().eq("poll_id", pollId);
                await supabase.from("options").delete().eq("poll_id", pollId);

                // Then delete the poll
                await supabase.from("polls").delete().eq("id", pollId);

                // Log admin action
                await supabase.from("admin_actions").insert({
                    admin_id: user?.id,
                    action_type: "delete_poll",
                    target_id: pollId,
                    target_type: "poll",
                    action_details: { reason: "Admin deletion" },
                });

                // Reload data
                loadAdminData();
            } catch (error) {
                console.error("Error deleting poll:", error);
            }
        }
    };

    const handleChangeUserRole = async (userId: string, newRole: string) => {
        try {
            // Use the promote_user_to_admin function for role changes
            if (newRole === "admin") {
                const { error } = await supabase.rpc("promote_user_to_admin", {
                    target_user_id: userId,
                });

                if (error) {
                    console.error("Error promoting user:", error);
                    alert(
                        "Error promoting user to admin. You may not have sufficient permissions."
                    );
                } else {
                    alert("User promoted to admin successfully!");
                    loadAdminData();
                }
            } else {
                alert(
                    "Only admin role changes are currently supported. For other role changes, please use the database directly."
                );
            }
        } catch (error) {
            console.error("Error changing user role:", error);
            alert("Error changing user role.");
        }
    };

    if (!isAdmin) {
        return (
            <div className="container mx-auto p-8">
                <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Access Denied
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
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
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Shield className="w-8 h-8 text-primary" />
                    Admin Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Complete system overview and management panel
                </p>
            </div>

            {/* Analytics Cards */}
            {analytics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <Card className="bg-slate-800/50 border-slate-700">
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
                                Latest:{" "}
                                {format(
                                    new Date(analytics.latest_poll),
                                    "MMM d, yyyy"
                                )}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-slate-700">
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

                    <Card className="bg-slate-800/50 border-slate-700">
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
                                Latest:{" "}
                                {format(
                                    new Date(analytics.latest_vote),
                                    "MMM d, yyyy"
                                )}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-slate-700">
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
                        value="actions"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                        <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                        Actions
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="polls">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-slate-100">
                                All Polls
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Complete list of all polls in the system
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 sm:space-y-4">
                                {polls.map((poll) => (
                                    <div
                                        key={poll.id}
                                        className="border border-slate-700 rounded-lg p-3 sm:p-4 bg-slate-800/30"
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
                                                            {poll.creator_email}
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
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-slate-100">
                                User Management
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Manage user roles and permissions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 sm:space-y-4">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="border border-slate-700 rounded-lg p-3 sm:p-4 bg-slate-800/30"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-slate-100 text-sm sm:text-base">
                                                    {user.email}
                                                </h3>
                                                <p className="text-xs sm:text-sm text-slate-400">
                                                    @{user.username} •{" "}
                                                    <span className="capitalize">
                                                        {user.role}
                                                    </span>
                                                </p>
                                                <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 text-xs sm:text-sm">
                                                    <span className="text-slate-300">
                                                        {user.polls_count} polls
                                                    </span>
                                                    <span className="text-slate-300">
                                                        {user.votes_count} votes
                                                    </span>
                                                    <span className="text-slate-400">
                                                        Joined:{" "}
                                                        {format(
                                                            new Date(
                                                                user.created_at
                                                            ),
                                                            "MMM d, yyyy"
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) =>
                                                        handleChangeUserRole(
                                                            user.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="border border-slate-600 rounded px-2 py-1 text-xs sm:text-sm bg-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                >
                                                    <option value="user">
                                                        User
                                                    </option>
                                                    <option value="moderator">
                                                        Moderator
                                                    </option>
                                                    <option value="admin">
                                                        Admin
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="actions">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-slate-100">
                                Recent Admin Actions
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Track all administrative actions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <Activity className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                                <p className="text-slate-400">
                                    Admin action logging will appear here
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
