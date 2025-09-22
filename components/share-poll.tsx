"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, Copy, ExternalLink } from "lucide-react";

interface SharePollProps {
    pollId: string;
    pollTitle: string;
    className?: string;
}

export function SharePoll({ pollId, pollTitle, className = "" }: SharePollProps) {
    const [copied, setCopied] = useState(false);
    const pollUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/polls/${pollId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(pollUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed:", err);
            alert("Failed to copy link to clipboard");
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: pollTitle,
                    text: `Check out this poll: ${pollTitle}`,
                    url: pollUrl,
                });
            } catch (err) {
                console.error("Share failed:", err);
                handleCopy();
            }
        } else {
            handleCopy();
        }
    };

    return (
        <Card className={`w-full ${className}`}>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share Poll
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground truncate">
                    {pollUrl}
                </p>

                <div className="flex gap-2">
                    <Button
                        onClick={handleShare}
                        variant="default"
                        size="sm"
                        className="flex-1"
                    >
                        <Share2 className="w-3 h-3 mr-1" />
                        Share
                    </Button>

                    <Button
                        onClick={handleCopy}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                    >
                        {copied ? (
                            <>
                                <span className="w-3 h-3 mr-1">✅</span>
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                            </>
                        )}
                    </Button>
                </div>

                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                >
                    <a href={pollUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open Poll
                    </a>
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                    💡 Share this poll with others to get more votes!
                </p>
            </CardContent>
        </Card>
    );
}
