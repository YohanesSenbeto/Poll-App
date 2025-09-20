"use client";

import { useState } from "react";
import { useAuth } from "@/app/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function QuickAdminSetup() {
    const { user, userRole } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const makeMeAdmin = async () => {
        setLoading(true);
        setMessage("");

        try {
            if (!user) {
                setMessage("Please log in first");
                setLoading(false);
                return;
            }

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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-green-600">Quick Admin Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">Current Status</h3>
                        <div className="space-y-1 text-sm">
                            <p><strong>Email:</strong> {user?.email || 'Not logged in'}</p>
                            <p><strong>Role:</strong> <Badge variant="secondary">{userRole || 'loading...'}</Badge></p>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Make Me Admin</h3>
                        <p className="text-sm text-gray-600 mb-2">
                            Click the button below to assign admin role to your current account.
                        </p>
                        <Button 
                            onClick={makeMeAdmin}
                            disabled={loading || !user}
                            className="w-full"
                        >
                            {loading ? "Assigning Admin Role..." : "Make Me Admin"}
                        </Button>
                        {message && (
                            <p className={`text-sm mt-2 ${
                                message.includes('✅') ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {message}
                            </p>
                        )}
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Next Steps</h3>
                        <div className="space-y-2 text-sm">
                            <p>1. Click "Make Me Admin" above</p>
                            <p>2. Refresh this page</p>
                            <p>3. Go to <a href="/admin/users" className="text-blue-600 underline">Admin Panel</a></p>
                            <p>4. Test role management features</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
