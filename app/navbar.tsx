'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, PlusCircle, BarChart3 } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { PollLogo } from "@/components/poll-logo";

export function Navbar() {
    const { user, signOut } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

    return (
        <header className="border-b bg-background shadow-sm">
            <nav className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 flex items-center justify-between py-3 sm:py-4">
                <div className="flex items-center space-x-4 sm:space-x-8">
                    <Link
                        href="/"
                        className="flex items-center space-x-2"
                    >
                        <PollLogo className="h-8 w-8" />
                        <span className="text-xl font-bold text-primary">Poll App</span>
                    </Link>
                    <div className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/polls"
                            className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                        >
                            <BarChart3 className="inline-block w-4 h-4 mr-2" />
                            Browse Polls
                        </Link>
                        {user && (
                            <Link
                                href="/polls/create"
                                className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                            >
                                <PlusCircle className="inline-block w-4 h-4 mr-2" />
                                Create Poll
                            </Link>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <ThemeToggle />
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="relative h-8 w-8 rounded-full"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-primary text-white">
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
                                    <Link href="/profile">Profile Settings</Link>
                                </DropdownMenuItem>
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
                        <div className="flex items-center space-x-2">
                            <Button variant="ghost" asChild>
                                <Link href="/auth/login">Login</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/auth/register">
                                    Register
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
}