// app/unauthorized/page.tsx
import Link from "next/link";

export default function Unauthorized() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="text-center max-w-md mx-auto p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
                <h1 className="text-2xl font-bold text-red-400 mb-4">
                    Access Denied
                </h1>
                <p className="text-gray-300 mb-6">
                    You don't have permission to access this page. Please
                    contact an administrator if you believe this is an error.
                </p>
                <Link
                    href="/"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Return to Home
                </Link>
            </div>
        </div>
    );
}
