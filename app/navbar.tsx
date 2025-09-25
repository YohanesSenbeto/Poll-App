"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, PlusCircle, BarChart3, Menu, X, Shield, Users, MessageSquare } from "lucide-react";
import { useState, useCallback } from "react";
import { useAuth } from "@/app/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { PollLogo } from "@/components/poll-logo";
import { useRouter } from "next/navigation";

export function Navbar() {
    const { user, userProfile, signOut, isAdmin } = useAuth();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleMobileMenu = useCallback(() => {
        setMobileMenuOpen(prev => !prev);
    }, []);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
    // Prefer avatar_url from user_profiles, then user_metadata, else fallback letter
    const avatarUrl = (userProfile as any)?.avatar_url
        || (user as any)?.user_metadata?.avatar_url
        || (user as any)?.user_metadata?.picture
        || undefined;

    return (
        <header className="border-b bg-background shadow-sm">
            <nav className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
                <div className="flex items-center justify-between py-2 sm:py-4">
                    <div className="flex items-center space-x-2 sm:space-x-8">
                        <Link
                            href="/"
                            className="flex items-center space-x-1 sm:space-x-2"
                        >
                            <PollLogo className="h-6 w-6 sm:h-8 sm:w-8" />
                            <span className="text-base sm:text-lg md:text-xl font-bold text-primary">
                                Poll App
                            </span>
                        </Link>
                        <div className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/polls"
                            className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                        >
                            <BarChart3 className="inline-block w-4 h-4 mr-1" />
                            Browse Polls
                        </Link>
                        {user && (
                            <>
                                <Link
                                    href="/polls/create"
                                    className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                                >
                                    <PlusCircle className="inline-block w-4 h-4 mr-1" />
                                    Create Poll
                                </Link>
                                {isAdmin && (
                                    <>
                                        <Link
                                            href="/admin"
                                            className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                                        >
                                            <Shield className="inline-block w-4 h-4 mr-1" />
                                            Admin Dashboard
                                        </Link>
                                        <Link
                                            href="/admin/users"
                                            className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                                        >
                                            <Users className="inline-block w-4 h-4 mr-1" />
                                            Users
                                        </Link>
                                        <Link
                                            href="/admin/polls"
                                            className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                                        >
                                            <MessageSquare className="inline-block w-4 h-4 mr-1" />
                                            All Polls
                                        </Link>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <ThemeToggle />
                        <button
                            className="md:hidden p-1 rounded-md hover:bg-muted transition-colors"
                            onClick={toggleMobileMenu}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? (
                                <X className="h-4 w-4" />
                            ) : (
                                <Menu className="h-4 w-4" />
                            )}
                        </button>
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="relative h-6 w-6 sm:h-8 sm:w-8 rounded-full p-0"
                                        title="Edit profile"
                                        onClick={() => router.push('/profile')}
                                    >
                                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                                            {avatarUrl && (
                                                <AvatarImage src={avatarUrl} alt="Profile" />
                                            )}
                                            <AvatarFallback className="bg-primary text-white text-xs">
                                                {userInitial}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-56"
                                    align="end"
                                >
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                My Account
                                            </p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/polls">My Polls</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile">
                                            Profile Settings
                                        </Link>
                                    </DropdownMenuItem>
                                    {isAdmin && (
                                        <DropdownMenuItem asChild>
                                            <Link href="/admin">
                                                Admin Dashboard
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {/* Removed Auth & DB Test button */}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleLogout}
                                        className="text-destructive"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="hidden md:flex items-center space-x-1 sm:space-x-2">
                                <Button variant="ghost" asChild size="sm">
                                    <Link href="/auth/login">Login</Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link href="/auth/register">Register</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-border">
                        <div className="px-2 py-3 space-y-2">
                            {user && (
                                <>
                                    <Link
                                        href="/polls/create"
                                        className="flex items-center text-sm font-medium text-foreground/70 hover:text-foreground transition-colors py-2"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Create Poll
                                    </Link>
                                    {isAdmin && (
                                        <>
                                            <Link
                                                href="/admin"
                                                className="flex items-center text-sm font-medium text-foreground/70 hover:text-foreground transition-colors py-2"
                                                onClick={() =>
                                                    setMobileMenuOpen(false)
                                                }
                                            >
                                                <Shield className="w-4 h-4 mr-2" />
                                                Admin
                                            </Link>
                                            <Link
                                                href="/admin/polls"
                                                className="flex items-center text-sm font-medium text-foreground/70 hover:text-foreground transition-colors py-2"
                                                onClick={() =>
                                                    setMobileMenuOpen(false)
                                                }
                                            >
                                                <BarChart3 className="w-4 h-4 mr-2" />
                                                All Polls
                                            </Link>
                                        </>
                                    )}
                                </>
                            )}
                            {!user && (
                                <div className="space-y-3 pt-2 border-t border-border">
                                    <Button
                                        variant="ghost"
                                        asChild
                                        className="w-full justify-start"
                                    >
                                        <Link
                                            href="/auth/login"
                                            onClick={() =>
                                                setMobileMenuOpen(false)
                                            }
                                        >
                                            Login
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        className="w-full justify-start"
                                    >
                                        <Link
                                            href="/auth/register"
                                            onClick={() =>
                                                setMobileMenuOpen(false)
                                            }
                                        >
                                            Register
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
