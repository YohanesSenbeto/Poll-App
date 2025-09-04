// components/admin-route.tsx
"use client";

import { useAuth } from "../app/auth-context";
import LoadingSpinner from "./loading-spinner";

interface AdminRouteProps {
    children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
    const { isAdmin, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!isAdmin) {
        return (
            <div className="container mx-auto p-8">
                <div className="max-w-md mx-auto bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">
                        Access Denied
                    </h2>
                    <p className="text-red-300">
                        You do not have administrator privileges to access this
                        page.
                    </p>
                    <a
                        href="/"
                        className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Return to Home
                    </a>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
