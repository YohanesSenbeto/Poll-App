"use client";

import { useState } from "react";
import { useAuth } from "@/app/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AdminSetup() {
    const { user, userRole } = useAuth();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const assignAdminRole = async () => {
        if (!email) {
            setMessage("Please enter an email address");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            // First, get the user ID from email
            const { data: authUsers, error: authError } = await supabase
                .from('auth.users')
                .select('id, email')
                .eq('email', email)
                .single();

            if (authError || !authUsers) {
                setMessage("User not found with that email");
                setLoading(false);
                return;
            }

            // Check if profile exists
            const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('user_id', authUsers.id)
                .single();

            if (existingProfile) {
                // Update existing profile
                const { error: updateError } = await supabase
                    .from('user_profiles')
                    .update({ role: 'admin' })
                    .eq('user_id', authUsers.id);

                if (updateError) {
                    setMessage(`Error updating role: ${updateError.message}`);
                } else {
                    setMessage(`Successfully assigned admin role to ${email}`);
                }
            } else {
                // Create new profile with admin role
                const { error: insertError } = await supabase
                    .from('user_profiles')
                    .insert({
                        user_id: authUsers.id,
                        username: `admin_${authUsers.id.slice(0, 8)}`,
                        display_name: email,
                        role: 'admin',
                        is_active: true
                    });

                if (insertError) {
                    setMessage(`Error creating profile: ${insertError.message}`);
                } else {
                    setMessage(`Successfully created admin profile for ${email}`);
                }
            }
        } catch (error) {
            setMessage(`Error: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-blue-600">Admin Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">Current User</h3>
                        <div className="space-y-1 text-sm">
                            <p><strong>Email:</strong> {user?.email}</p>
                            <p><strong>Role:</strong> <Badge variant="secondary">{userRole || 'loading...'}</Badge></p>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Assign Admin Role</h3>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="Enter email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1"
                            />
                            <Button 
                                onClick={assignAdminRole}
                                disabled={loading}
                            >
                                {loading ? "Assigning..." : "Assign Admin"}
                            </Button>
                        </div>
                        {message && (
                            <p className={`text-sm mt-2 ${
                                message.includes('Successfully') ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {message}
                            </p>
                        )}
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Quick Actions</h3>
                        <div className="flex gap-2">
                            <Button asChild>
                                <a href="/role-test">Test Dashboard</a>
                            </Button>
                            <Button asChild variant="outline">
                                <a href="/admin/users">Admin Panel</a>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
