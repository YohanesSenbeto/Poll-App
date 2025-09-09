"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../auth-context";
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
import { Input } from "@/components/ui/input";
import {
    Search,
    Shield,
    User,
    Mail,
    Calendar,
    Trash2,
    UserPlus,
    Users,
    MessageSquare,
    BarChart3,
} from "lucide-react";
import { format } from "date-fns";

interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    created_at: string;
    updated_at: string;
    polls_count: number;
    votes_count: number;
    last_activity: string;
}

export default function AdminUsers() {
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAdmin) {
            loadUsers();
        }
    }, [isAdmin]);

    useEffect(() => {
        const filtered = users.filter(
            (user) =>
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                user.role.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [users, searchTerm]);

    const loadUsers = async () => {
        try {
            // Get user data from polls and votes without profiles table
            const { data: allPolls } = await supabase
                .from("polls")
                .select("user_id, created_at");

            const { data: allVotes } = await supabase
                .from("votes")
                .select("user_id, created_at");

            // Create user stats from polls and votes
            const userStats = new Map();

            allPolls?.forEach((poll) => {
                if (poll.user_id) {
                    const stats = userStats.get(poll.user_id) || {
                        polls_count: 0,
                        votes_count: 0,
                        created_at: poll.created_at,
                        last_activity: poll.created_at,
                        role: "user",
                    };
                    stats.polls_count += 1;
                    // Update last_activity to the most recent activity
                    if (
                        new Date(poll.created_at) >
                        new Date(stats.last_activity)
                    ) {
                        stats.last_activity = poll.created_at;
                    }
                    userStats.set(poll.user_id, stats);
                }
            });

            allVotes?.forEach((vote) => {
                if (vote.user_id) {
                    const stats = userStats.get(vote.user_id) || {
                        polls_count: 0,
                        votes_count: 0,
                        created_at: vote.created_at,
                        last_activity: vote.created_at,
                        role: "user",
                    };
                    stats.votes_count += 1;
                    // Update last_activity to the most recent activity
                    if (
                        new Date(vote.created_at) >
                        new Date(stats.last_activity)
                    ) {
                        stats.last_activity = vote.created_at;
                    }
                    userStats.set(vote.user_id, stats);
                }
            });

            // Get actual user emails from auth.users (if accessible)
            let userEmails = new Map();
            try {
                const { data: authUsers } = await supabase
                    .from("auth.users")
                    .select("id, email, created_at");

                authUsers?.forEach((user) => {
                    userEmails.set(user.id, user.email);
                });
            } catch (error) {
                console.log("Cannot access auth.users, using fallback data");
            }

            // Convert to array format with all required properties
            const usersWithCounts = Array.from(userStats.entries()).map(
                ([user_id, stats]) => ({
                    id: user_id,
                    email: userEmails.get(user_id) || "unknown@example.com",
                    username: `user_${user_id.slice(0, 8)}`,
                    polls_count: stats.polls_count,
                    votes_count: stats.votes_count,
                    created_at: stats.created_at || new Date().toISOString(),
                    updated_at: stats.last_activity || new Date().toISOString(),
                    last_activity:
                        stats.last_activity || new Date().toISOString(),
                    role: stats.role,
                })
            );

            setUsers(usersWithCounts);
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        alert(
            "User role management is temporarily disabled due to profiles table removal"
        );
    };

    const handleDeleteUser = async (userId: string) => {
        alert(
            "User deletion is temporarily disabled due to profiles table removal"
        );
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "admin":
                return "destructive";
            case "moderator":
                return "warning";
            default:
                return "secondary";
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
                            page.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mx-auto p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
                    <Users className="w-8 h-8 text-indigo-400" />
                    User Management
                </h1>
                <p className="text-slate-300">Manage all users in the system</p>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-white">
                                All Users
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                {users.length} total users
                            </CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400 w-64"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="border border-slate-700 rounded-lg p-4 bg-slate-800/30"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-slate-300" />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-semibold text-white">
                                                    {user.email}
                                                </h3>
                                                <Badge
                                                    variant={
                                                        getRoleColor(
                                                            user.role
                                                        ) as any
                                                    }
                                                >
                                                    {user.role}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-400">
                                                @
                                                {user.username || "No username"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className="text-sm text-slate-300 space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <MessageSquare className="w-4 h-4" />
                                                <span>
                                                    {user.polls_count} polls
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <BarChart3 className="w-4 h-4" />
                                                <span>
                                                    {user.votes_count} votes
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-sm text-slate-400">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>
                                                    Joined:{" "}
                                                    {format(
                                                        new Date(
                                                            user.created_at
                                                        ),
                                                        "MMM d, yyyy"
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>
                                                    Active:{" "}
                                                    {format(
                                                        new Date(
                                                            user.last_activity
                                                        ),
                                                        "MMM d, yyyy"
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <select
                                                value={user.role}
                                                onChange={(e) =>
                                                    handleRoleChange(
                                                        user.id,
                                                        e.target.value
                                                    )
                                                }
                                                className="bg-slate-700 border-slate-600 text-white rounded px-2 py-1 text-sm"
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

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleDeleteUser(user.id)
                                                }
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
