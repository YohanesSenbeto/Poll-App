"use client";

import { useState } from "react";
import { useAuth } from "@/app/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function APIDebug() {
    const { user } = useAuth();
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const testAPI = async () => {
        if (!user) {
            setDebugInfo({ error: "Not logged in" });
            return;
        }

        setLoading(true);
        try {
            // Get session token
            const { data: session } = await supabase.auth.getSession();
            const token = session.session?.access_token;

            console.log("Token:", token);
            console.log("User:", user);

            // Test API call
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const responseText = await response.text();
            console.log("Response:", responseText);

            setDebugInfo({
                status: response.status,
                statusText: response.statusText,
                response: responseText,
                token: token ? "Present" : "Missing",
                userId: user.id
            });

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setDebugInfo({ error: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-orange-600">API Debug</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">Debug API Call</h3>
                        <Button onClick={testAPI} disabled={loading}>
                            {loading ? "Testing..." : "Test Admin API"}
                        </Button>
                    </div>

                    {debugInfo && (
                        <div>
                            <h3 className="font-semibold mb-2">Debug Results</h3>
                            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                                {JSON.stringify(debugInfo, null, 2)}
                            </pre>
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold mb-2">Quick Links</h3>
                        <div className="flex gap-2">
                            <Button asChild variant="outline">
                                <a href="/direct-users">Direct User Management</a>
                            </Button>
                            <Button asChild variant="outline">
                                <a href="/role-test">Role Test Dashboard</a>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
