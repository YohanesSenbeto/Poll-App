
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, PlusCircle, Users, MessageSquare, TrendingUp, Star, Zap, Target } from "lucide-react";
import Link from "next/link";
import { useAuth } from "./auth-context";
import { Suspense } from "react";
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { FeaturedComments } from "@/components/featured-comments";

// Featured Poll Comments Component - REMOVED (comments moved to bottom section)

// Loading skeleton component
function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
                <div className="text-left mb-8 sm:mb-12">
                    <div className="h-8 bg-muted rounded w-48 mb-4 animate-pulse"></div>
                    <div className="h-6 bg-muted rounded w-64 animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 justify-start">
                    {[1, 2].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="w-12 h-12 bg-muted rounded-lg mb-4"></div>
                                <div className="h-6 bg-muted rounded w-32"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-4 bg-muted rounded w-full mb-4"></div>
                                <div className="h-10 bg-muted rounded w-full"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Programming Language Voting Component
function ProgrammingLanguageVoting() {
    const { user } = useAuth();
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [guestName, setGuestName] = useState("");
    const [voting, setVoting] = useState(false);
    const [voted, setVoted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const programmingLanguages = [
        { name: "JavaScript", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
        { name: "Python", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
        { name: "TypeScript", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
        { name: "React", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300" },
        { name: "Java", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
        { name: "C++", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
        { name: "C#", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
        { name: "PHP", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
        { name: "Ruby", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
        { name: "Go", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
        { name: "Rust", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
        { name: "Swift", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" }
    ];

    const [showAllLanguages, setShowAllLanguages] = useState(false);
    const initialLanguages = programmingLanguages.slice(0, 6);
    const displayedLanguages = showAllLanguages ? programmingLanguages : initialLanguages;

    const handleVote = async (language: string) => {
        if (!user && !guestName.trim()) {
            setError("Please enter your name to vote as a guest");
            return;
        }

        setVoting(true);
        setError(null);

        try {
            // Submit vote to our programming language poll
            const response = await fetch('/api/polls/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pollId: '724a499d-dd5d-4758-af5f-47d771f242a9', // This is my Mention poll
                    optionText: language,
                    guestName: user ? null : guestName.trim(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit vote');
            }

            const result = await response.json();
            setSelectedLanguage(language);
            setVoted(true);
            if (!user) {
                setGuestName("");
            }

            // Small delay to let the database update, then refresh the page with charts
            setTimeout(() => {
                window.location.href = '/polls';
            }, 1500);

        } catch (error) {
            console.error('Error voting:', error);
            setError(error instanceof Error ? error.message : 'Failed to submit vote');
        } finally {
            setVoting(false);
        }
    };

    if (!user) {
        return (
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="w-12 h-12 bg-purple-100/50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <CardTitle className="text-lg">
                        Vote Your Favorite Language
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="text-sm text-muted-foreground mb-4">
                        Vote on "This is my Mention" poll - choose your favorite programming language
                    </CardDescription>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Your Name (for guest voting)</label>
                            <input
                                type="text"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                placeholder="Enter your name..."
                                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            />
                        </div>
                        
                        {error && (
                            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        {displayedLanguages.map((lang) => (
                            <Button
                                key={lang.name}
                                variant="outline"
                                className={`w-full justify-start h-12 text-left ${
                                    selectedLanguage === lang.name
                                        ? 'border-primary bg-primary/10'
                                        : 'hover:bg-muted'
                                }`}
                                onClick={() => handleVote(lang.name)}
                                disabled={voting || !guestName.trim()}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-medium">{lang.name}</span>
                                    {voting && selectedLanguage === lang.name && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                    )}
                                </div>
                            </Button>
                        ))}

                        {!showAllLanguages && programmingLanguages.length > 6 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllLanguages(true)}
                                className="w-full text-xs"
                            >
                                See More Languages ({programmingLanguages.length - 6} more)
                            </Button>
                        )}

                        {showAllLanguages && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllLanguages(false)}
                                className="w-full text-xs"
                            >
                                Show Less
                            </Button>
                        )}

                        <div className="pt-2 border-t pt-3">
                            <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                                <Link href="/polls">View Live Charts & Vote Counts</Link>
                    </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="w-12 h-12 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg">
                    Vote Your Favorite Language
                </CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="text-sm text-muted-foreground mb-4">
                    Vote on "This is my Mention" poll - choose your favorite programming language
                </CardDescription>
                
                {!voted ? (
                    <div className="space-y-3">
                        {error && (
                            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        {displayedLanguages.map((lang) => (
                            <Button
                                key={lang.name}
                                variant="outline"
                                className={`w-full justify-start h-12 text-left ${
                                    selectedLanguage === lang.name
                                        ? 'border-primary bg-primary/10'
                                        : 'hover:bg-muted'
                                }`}
                                onClick={() => handleVote(lang.name)}
                                disabled={voting}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-medium">{lang.name}</span>
                                    {voting && selectedLanguage === lang.name && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                    )}
                                </div>
                            </Button>
                        ))}

                        {!showAllLanguages && programmingLanguages.length > 6 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllLanguages(true)}
                                className="w-full text-xs"
                            >
                                See More Languages ({programmingLanguages.length - 6} more)
                            </Button>
                        )}

                        {showAllLanguages && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllLanguages(false)}
                                className="w-full text-xs"
                            >
                                Show Less
                            </Button>
                        )}

                        <div className="pt-2 border-t pt-3">
                            <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                                <Link href="/polls">View Live Charts & Vote Counts</Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                            <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-300" />
                        </div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                            ✅ Vote Submitted Successfully!
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                            You voted for <strong>{selectedLanguage}</strong>
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg mb-4">
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                📊 Your vote has been counted!
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                See how {selectedLanguage} compares to other languages in real-time charts.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setVoted(false);
                                    setSelectedLanguage(null);
                                }}
                                className="w-full"
                            >
                                Vote Again
                            </Button>
                            <Button asChild variant="default" size="sm" className="w-full">
                                <Link href="/polls">
                                    📊 View Real-time Charts & Compare Languages
                                </Link>
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                See live percentages and how your vote affected the rankings!
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Main content component
function HomeContent() {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
                <div className="text-left mb-8 sm:mb-12">
                    <h1 className="text-4xl font-bold text-foreground mb-4">
                        Poll App
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Create and participate in polls
                    </p>
                </div>

                {/* Community Comments Section - Moved to Top */}
                <FeaturedComments />

                <div className="grid grid-cols-1 gap-6 lg:gap-8">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">1,234</p>
                                        <p className="text-sm text-gray-500">Total Polls</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-green-100/50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                        <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">5,678</p>
                                        <p className="text-sm text-gray-500">Total Votes</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-purple-100/50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">2,345</p>
                                        <p className="text-sm text-gray-500">Comments</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">89%</p>
                                        <p className="text-sm text-gray-500">Engagement</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Actions */}
                    <div className="space-y-4 sm:space-y-6">
                        <ProgrammingLanguageVoting />
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                                        <Star className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Featured Polls</h3>
                                        <p className="text-sm text-gray-500">Discover trending polls</p>
                                    </div>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/polls">Explore</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-pink-100/50 dark:bg-pink-900/20 rounded-lg flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Quick Vote</h3>
                                        <p className="text-sm text-gray-500">Vote on recent polls</p>
                                    </div>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/polls">Vote Now</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <HomeContent />
        </Suspense>
    );
}
