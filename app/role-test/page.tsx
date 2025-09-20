"use client";

import { useAuth } from "@/app/auth-context";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RoleManagementTest() {
    const { user, userRole, userProfile, isAdmin, isModerator, hasPermission } = useAuth();
    const [permissionTests, setPermissionTests] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);

    const testPermissions = async () => {
        if (!user) return;
        
        setLoading(true);
        const tests = {
            'polls_create': await hasPermission('polls', 'polls', 'create'),
            'polls_read': await hasPermission('polls', 'polls', 'read'),
            'users_manage': await hasPermission('users', 'all_users', 'manage'),
            'roles_manage': await hasPermission('roles', 'user_roles', 'manage'),
            'moderation_manage': await hasPermission('moderation', 'content_review', 'manage'),
        };
        
        setPermissionTests(tests);
        setLoading(false);
    };

    useEffect(() => {
        testPermissions();
    }, [user]);

    if (!user) {
        return (
            <Card className="max-w-2xl mx-auto m-4">
                <CardHeader>
                    <CardTitle className="text-red-600">Not Authenticated</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Please log in to test role management.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-green-600">Role Management Test Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* User Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-semibold mb-2">User Information</h3>
                            <div className="space-y-1 text-sm">
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>User ID:</strong> {user.id}</p>
                                <p><strong>Role:</strong> <Badge variant="secondary">{userRole || 'loading...'}</Badge></p>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Profile Information</h3>
                            <div className="space-y-1 text-sm">
                                <p><strong>Username:</strong> {userProfile?.username || 'N/A'}</p>
                                <p><strong>Display Name:</strong> {userProfile?.display_name || 'N/A'}</p>
                                <p><strong>Active:</strong> {userProfile?.is_active ? 'Yes' : 'No'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Role Checks */}
                    <div>
                        <h3 className="font-semibold mb-2">Role Checks</h3>
                        <div className="flex gap-2">
                            <Badge variant={isAdmin ? "default" : "secondary"}>
                                Admin: {isAdmin ? "Yes" : "No"}
                            </Badge>
                            <Badge variant={isModerator ? "default" : "secondary"}>
                                Moderator: {isModerator ? "Yes" : "No"}
                            </Badge>
                        </div>
                    </div>

                    {/* Permission Tests */}
                    <div>
                        <h3 className="font-semibold mb-2">Permission Tests</h3>
                        <Button 
                            onClick={testPermissions} 
                            disabled={loading}
                            className="mb-2"
                        >
                            {loading ? "Testing..." : "Test Permissions"}
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(permissionTests).map(([permission, hasAccess]) => (
                                <div key={permission} className="flex items-center justify-between p-2 bg-slate-100 rounded">
                                    <span className="text-sm font-mono">{permission}</span>
                                    <Badge variant={hasAccess ? "default" : "secondary"}>
                                        {hasAccess ? "✓" : "✗"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <h3 className="font-semibold mb-2">Quick Actions</h3>
                        <div className="flex gap-2">
                            {isAdmin && (
                                <Button asChild>
                                    <a href="/admin/users">Admin Panel</a>
                                </Button>
                            )}
                            {isModerator && (
                                <Button asChild variant="outline">
                                    <a href="/moderator">Moderator Dashboard</a>
                                </Button>
                            )}
                            <Button asChild variant="outline">
                                <a href="/profile">User Profile</a>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
