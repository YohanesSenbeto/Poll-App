"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/auth-context";
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
    MessageSquare,
    BarChart3,
    AlertTriangle,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Poll {
    id: string;
    title: string;
    description: string;
    user_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    options: Array<{
        id: string;
        text: string;
    }>;
    votes_count: number;
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

export default function ModeratorDashboard() {
    const { isModerator, user } = useAuth();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredPolls, setFilteredPolls] = useState<Poll[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'polls' | 'users'>('polls');

    useEffect(() => {
        if (isModerator) {
            loadData();
        }
    }, [isModerator]);

    useEffect(() => {
        if (activeTab === 'polls') {
            const filtered = polls.filter(
                (poll) =>
                    poll.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    poll.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredPolls(filtered);
        } else {
            const filtered = users.filter(
                (user) =>
                    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [polls, users, searchTerm, activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Load polls
            const { data: pollsData, error: pollsError } = await supabase
                .from('polls')
                .select(`
                    *,
                    options (*),
                    votes_count:votes(count)
                `)
                .order('created_at', { ascending: false });

            if (pollsError) {
                console.error('Error loading polls:', pollsError);
            } else {
                setPolls(pollsData || []);
            }

            // Load users
            const { data: usersData, error: usersError } = await supabase
                .from('user_profiles')
                .select(`
                    *,
                    polls_count:polls(count),
                    votes_count:votes(count)
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (usersError) {
                console.error('Error loading users:', usersError);
            } else {
                setUsers(usersData || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePollAction = async (pollId: string, action: 'activate' | 'deactivate') => {
        try {
            const { error } = await (supabase.from('polls') as any)
                .update({ is_active: action === 'activate' })
                .eq('id', pollId);

            if (error) {
                console.error('Error updating poll:', error);
                alert('Error updating poll. Please try again.');
            } else {
                // Reload data
                await loadData();
            }
        } catch (error) {
            console.error('Error updating poll:', error);
            alert('Error updating poll. Please try again.');
        }
    };

    const handleUserAction = async (userId: string, action: 'activate' | 'deactivate') => {
        try {
            const { error } = await (supabase.from('user_profiles') as any)
                .update({ is_active: action === 'activate' })
                .eq('user_id', userId);

            if (error) {
                console.error('Error updating user:', error);
                alert('Error updating user. Please try again.');
            } else {
                // Reload data
                await loadData();
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error updating user. Please try again.');
        }
    };

    if (!isModerator) {
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
                            You do not have moderator privileges to access this page.
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
                    <Shield className="w-8 h-8 text-blue-400" />
                    Moderator Dashboard
                </h1>
                <p className="text-slate-300">Manage content and users in the system</p>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6">
                <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('polls')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'polls'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Polls Management
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'users'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Users Management
                    </button>
                </div>
            </div>

            {/* Search */}
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Content */}
            {activeTab === 'polls' ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Polls Management</CardTitle>
                        <CardDescription className="text-slate-400">
                            {filteredPolls.length} polls found
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {filteredPolls.map((poll) => (
                                <div
                                    key={poll.id}
                                    className="border border-slate-700 rounded-lg p-4 bg-slate-800/30"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <h3 className="font-semibold text-white">{poll.title}</h3>
                                                <Badge variant={poll.is_active ? "default" : "secondary"}>
                                                    {poll.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-400 mb-2">{poll.description}</p>
                                            <div className="flex items-center space-x-4 text-sm text-slate-300">
                                                <div className="flex items-center space-x-1">
                                                    <MessageSquare className="w-4 h-4" />
                                                    <span>{poll.options?.length || 0} options</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <BarChart3 className="w-4 h-4" />
                                                    <span>{poll.votes_count || 0} votes</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{format(new Date(poll.created_at), "MMM d, yyyy")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            {poll.is_active ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePollAction(poll.id, 'deactivate')}
                                                    className="text-orange-400 border-orange-400 hover:bg-orange-900/20"
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Deactivate
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePollAction(poll.id, 'activate')}
                                                    className="text-green-400 border-green-400 hover:bg-green-900/20"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Activate
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Users Management</CardTitle>
                        <CardDescription className="text-slate-400">
                            {filteredUsers.length} users found
                        </CardDescription>
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
                                                    <h3 className="font-semibold text-white">{user.email}</h3>
                                                    <Badge variant="secondary">{user.role}</Badge>
                                                </div>
                                                <p className="text-sm text-slate-400">@{user.username}</p>
                                                <div className="flex items-center space-x-4 text-sm text-slate-300 mt-1">
                                                    <div className="flex items-center space-x-1">
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span>{user.polls_count || 0} polls</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <BarChart3 className="w-4 h-4" />
                                                        <span>{user.votes_count || 0} votes</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{format(new Date(user.created_at), "MMM d, yyyy")}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleUserAction(user.id, 'deactivate')}
                                                className="text-red-400 border-red-400 hover:bg-red-900/20"
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Suspend
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
