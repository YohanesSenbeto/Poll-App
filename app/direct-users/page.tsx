"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    created_at: string;
}

export default function DirectUserManagement() {
    const { user, userRole, isAdmin } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (user && user.email === 'asterdugasa@gmail.com') {
            loadUsers();
        }
    }, [user]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            
            // Direct database query instead of API
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading users:', error);
                setMessage(`Error: ${error.message}`);
            } else {
                const usersWithEmails = data?.map(profile => ({
                    id: profile.user_id,
                    email: 'user@example.com', // We'll get this from auth context
                    username: profile.username,
                    role: profile.role,
                    created_at: profile.created_at
                })) || [];
                
                setUsers(usersWithEmails);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            setMessage(`Error: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ role: newRole })
                .eq('user_id', userId);

            if (error) {
                setMessage(`Error updating role: ${error.message}`);
            } else {
                setMessage(`Successfully updated role to ${newRole}`);
                await loadUsers(); // Reload users
            }
        } catch (error) {
            setMessage(`Error: ${error}`);
        }
    };

    const makeMeAdmin = async () => {
        if (!user) {
            setMessage("Please log in first");
            return;
        }

        try {
            // Check if profile exists
            const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('id, role')
                .eq('user_id', user.id)
                .single();

            if (existingProfile) {
                // Update existing profile to admin
                const { error: updateError } = await supabase
                    .from('user_profiles')
                    .update({ role: 'admin' })
                    .eq('user_id', user.id);

                if (updateError) {
                    setMessage(`Error: ${updateError.message}`);
                } else {
                    setMessage("✅ Successfully assigned admin role! Please refresh the page.");
                }
            } else {
                // Create new profile with admin role
                const { error: insertError } = await supabase
                    .from('user_profiles')
                    .insert({
                        user_id: user.id,
                        username: `admin_${user.id.slice(0, 8)}`,
                        display_name: user.email || 'Admin User',
                        role: 'admin',
                        is_active: true
                    });

                if (insertError) {
                    setMessage(`Error: ${insertError.message}`);
                } else {
                    setMessage("✅ Successfully created admin profile! Please refresh the page.");
                }
            }
        } catch (error) {
            setMessage(`Error: ${error}`);
        }
    };

    // Restrict access to only asterdugasa@gmail.com
    if (!user || user.email !== 'asterdugasa@gmail.com') {
        return (
            <div className="max-w-2xl mx-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            This page is restricted to the system administrator only.
                        </p>
                        <div className="mt-4">
                            <Button asChild>
                                <a href="/admin/users">Go to Admin Panel</a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-blue-600">🔧 System Administrator Panel</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Direct database access for system administration
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">Current User</h3>
                        <div className="space-y-1 text-sm">
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Role:</strong> <Badge variant="secondary">{userRole || 'loading...'}</Badge></p>
                            <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Quick Actions</h3>
                        <Button onClick={makeMeAdmin} className="mr-2">
                            Make Me Admin
                        </Button>
                        <Button onClick={loadUsers} variant="outline">
                            Refresh Users
                        </Button>
                        {message && (
                            <p className={`text-sm mt-2 ${
                                message.includes('✅') ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {message}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold">{user.username}</h3>
                                            <p className="text-sm text-gray-600">ID: {user.id}</p>
                                            <p className="text-sm text-gray-600">
                                                Created: {new Date(user.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="secondary">{user.role}</Badge>
                                            <select
                                                value={user.role}
                                                onChange={(e) => updateUserRole(user.id, e.target.value)}
                                                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                                            >
                                                <option value="user">User</option>
                                                <option value="moderator">Moderator</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}