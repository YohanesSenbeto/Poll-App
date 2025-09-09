"use client";

import Link from "next/link";
import { useAuth } from "../auth-context";
import { useTheme } from "../theme-context";
import { Button } from "@/components/ui/button";
import {
    Shield,
    Home,
    Users,
    BarChart3,
    Settings,
    LogOut,
    ArrowLeft,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";

export default function AdminNavbar() {
    const { user, signOut } = useAuth();
    // Remove duplicate theme declaration since it's already declared below
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { href: "/admin", icon: Home, label: "Dashboard" },
        { href: "/admin/polls", icon: BarChart3, label: "Polls" },
        { href: "/admin/users", icon: Users, label: "Users" },
        { href: "/admin/settings", icon: Settings, label: "Settings" },
    ];

    const { theme } = useTheme();

    return (
        <nav
            className={`${
                theme === "light"
                    ? "bg-slate-800 border-b border-slate-700"
                    : "bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50"
            }`}
        >
            <div className="container mx-auto px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-6">
                        <Link
                            href="/admin"
                            className="flex items-center space-x-2"
                        >
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                            <span className="text-white font-semibold text-sm sm:text-base">
                                Admin Panel
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center space-x-1 px-2 py-2 rounded-md text-xs lg:text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                                >
                                    <item.icon className="w-3 h-3 lg:w-4 lg:h-4" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
                        <Link
                            href="/"
                            className="hidden sm:flex items-center space-x-1 px-2 py-2 rounded-md text-xs lg:text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3 lg:w-4 lg:h-4" />
                            <span className="hidden lg:inline">
                                Back to Site
                            </span>
                        </Link>

                        {user && (
                            <div className="flex items-center space-x-1 sm:space-x-2">
                                <span className="hidden sm:inline text-xs lg:text-sm text-slate-300 truncate max-w-[120px] lg:max-w-[200px]">
                                    {user.email}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={signOut}
                                    className="text-slate-300 hover:text-white h-7 w-7 p-0 sm:h-auto sm:w-auto sm:px-2"
                                >
                                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="hidden lg:inline ml-1">
                                        Logout
                                    </span>
                                </Button>
                            </div>
                        )}

                        <button
                            className="md:hidden p-1 rounded-md text-slate-300 hover:bg-slate-700/50"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? (
                                <X className="w-4 h-4" />
                            ) : (
                                <Menu className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-700 mt-3 pt-3">
                        <div className="space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                            <Link
                                href="/"
                                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back to Site</span>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
