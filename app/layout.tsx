"use client";
import { useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [userInitial, setUserInitial] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const email = localStorage.getItem("userEmail");
            if (email) {
                setUserInitial(email.charAt(0).toUpperCase());
                setIsLoggedIn(true);
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("userEmail");
        setUserInitial("");
        setIsLoggedIn(false);
    };

    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <header className="border-b bg-background shadow-sm">
                    <nav className="container flex items-center justify-between p-4">
                        <div className="flex items-center space-x-8">
                            <Link
                                href="/"
                                className="text-xl font-bold text-primary"
                            >
                                Poll App
                            </Link>
                            <div className="hidden md:flex items-center space-x-6">
                                <Link
                                    href="/polls"
                                    className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                                >
                                    <BarChart3 className="inline-block w-4 h-4 mr-2" />
                                    Browse Polls
                                </Link>
                                {isLoggedIn && (
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
                            {isLoggedIn ? (
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
                                                    {typeof window !==
                                                    "undefined"
                                                        ? localStorage.getItem(
                                                              "userEmail"
                                                          ) || "User"
                                                        : "User"}
                                                </p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href="/polls">My Polls</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/auth/login">
                                                Profile Settings
                                            </Link>
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
                <main className="container py-8">{children}</main>
            </body>
        </html>
    );
}
