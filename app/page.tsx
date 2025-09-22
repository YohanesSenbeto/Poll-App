
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, PlusCircle, Users, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useAuth } from "./auth-context";
import { Suspense } from "react";
import { CommentList } from "@/components/comment-list";
import { useState, useEffect } from "react";

// Featured Poll Comments Component
function FeaturedPollComments() {
    const [featuredPollId, setFeaturedPollId] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        // Get a featured poll ID - you can modify this to get a specific poll
        // For now, we'll use a placeholder that users can replace
        const pollId = "950cd588-0ffc-4cdb-8fdf-039318533ada"; // Replace with your featured poll ID
        setFeaturedPollId(pollId);
    }, []);

    if (!featuredPollId) {
        return (
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="w-12 h-12 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                        <MessageSquare className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <CardTitle className="text-lg">
                        Community Discussion
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="text-sm text-muted-foreground mb-4">
                        Join the conversation and share your thoughts
                    </CardDescription>
                    <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                            Loading discussion...
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="w-12 h-12 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                        <MessageSquare className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <CardTitle className="text-lg">
                        Community Discussion
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="text-sm text-muted-foreground mb-4">
                        Join the conversation and share your thoughts about programming languages
                    </CardDescription>
                </CardContent>
            </Card>
            
            <CommentList pollId={featuredPollId} className="max-h-96 overflow-y-auto" />
        </div>
    );
}

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
        if (!user) return;

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
                    pollId: '950cd588-0ffc-4cdb-8fdf-039318533ada', // Programming languages poll
                    optionText: language,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit vote');
            }

            const result = await response.json();
            setSelectedLanguage(language);
            setVoted(true);

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
                        Sign up to vote for your favorite programming language
                    </CardDescription>
                    <Button asChild className="w-full">
                        <Link href="/auth/register">Sign Up to Vote</Link>
                    </Button>
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
                    Choose your favorite programming language from the options below
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    {/* Left Column - Main Actions */}
                    <div className="space-y-4 sm:space-y-6">
                    {user && (
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="w-12 h-12 bg-green-100/50 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                                <PlusCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <CardTitle className="text-lg">
                                Create Poll
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-sm text-muted-foreground mb-4">
                                Create your own poll questions
                            </CardDescription>
                            <Button asChild className="w-full">
                                <Link href="/polls/create">Create</Link>
                            </Button>
                        </CardContent>
                    </Card>
                        )}

                        <ProgrammingLanguageVoting />
                    </div>

                    {/* Right Column - Comments */}
                    <div className="space-y-4 sm:space-y-6">
                        <FeaturedPollComments />
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
