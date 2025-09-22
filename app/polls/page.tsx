"use client";

import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getPollById, getPollResults, getUserPolls, deletePoll } from "@/lib/database";
import { useAuth } from "@/app/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  Cell
} from 'recharts';

// Custom colors for the aggregated chart
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#87ceeb', '#dda0dd', '#98fb98', '#f0e68c'];

// Aggregated Language Chart Component (Memoized)
const AggregatedLanguageChart = memo(function AggregatedLanguageChart({ data, userLangs }: {
    data: Array<{ name: string; pct: number; votes: number }>,
    userLangs: Set<string>
}) {
    // Memoize chart data to prevent unnecessary recalculations
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        return data.map((item, index) => ({
            name: item.name,
            percentage: item.pct,
            votes: Math.round((item.pct / 100) * 100), // Approximate vote count for display
            isUserVote: userLangs.has(String(item.name).trim().toLowerCase()),
            color: COLORS[index % COLORS.length],
        }));
    }, [data, userLangs]);

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data to display
                    </div>
        );
    }

    return (
        <div className="w-full h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{
                        top: 10,
                        right: 10,
                        left: 10,
                        bottom: 60,
                    }}
                >
                    <CartesianGrid strokeDasharray="2 2" />
                    <XAxis 
                        dataKey="name"
                        tick={{ fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                    />
                    <YAxis 
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 9 }}
                        width={50}
                        label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    />
                    <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                            `${value}% (${props.payload?.votes || 0} votes) - ${name}`,
                            'Community Vote Share'
                        ]}
                        labelFormatter={(label) => `🏆 ${label} Ranking`}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '11px'
                        }}
                    />
                    <Bar dataKey="percentage" radius={[3, 3, 0, 0]}>
                        {chartData.map((entry: any, index: number) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.isUserVote ? '#22c55e' : entry.color}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});

export default function PollsPage() {
    const [polls, setPolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [refreshByPollId, setRefreshByPollId] = useState<Record<string, number>>({});
    const [myPolls, setMyPolls] = useState<any[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [langAgg, setLangAgg] = useState<Array<{ name: string; pct: number; votes: number }>>([]);
    const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
    const [createdCount, setCreatedCount] = useState<number>(0);
    const [userLangs, setUserLangs] = useState<Set<string>>(new Set());
    const [myLatestLanguage, setMyLatestLanguage] = useState<string | null>(null);
    const [myVoteInRange, setMyVoteInRange] = useState<boolean>(false);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            // Defer heavy summary; only fetch user's own polls for management
            if (user?.id) {
                // Check cache first
                const cacheKey = `user_polls_${user.id}`;
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    // Cache valid for 2 minutes
                    if (Date.now() - timestamp < 2 * 60 * 1000) {
                        setMyPolls(data);
                        return;
                    }
                }

                const mine = await getUserPolls(user.id);
                const polls = mine || [];
                setMyPolls(polls);
                
                // Cache the result
                if (typeof window !== "undefined") {
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        data: polls,
                        timestamp: Date.now()
                    }));
                }
            } else {
                setMyPolls([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load polls");
        } finally {
            // keep UI responsive; no blocking spinner
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);
    // Pull last vote from localStorage as UX fallback
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const last = window.localStorage.getItem('poll-app:lastVotedOptionText');
        if (last) setMyLatestLanguage(last);
    }, []);
    // Remove forced redirect; allow viewing without login
    // useEffect(() => { if (!authLoading && !user) router.push('/auth/login?redirectTo=/polls'); }, [authLoading, user, router]);

    useEffect(() => {
        const channel = supabase
            .channel('votes-feed')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload: any) => {
                const pollId = (payload.new as any)?.poll_id as string;
                if (pollId) {
                    setRefreshByPollId((prev) => ({ ...prev, [pollId]: (prev[pollId] || 0) + 1 }));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [supabase]);

    // Function to fetch chart data
    const fetchChartData = useCallback(async () => {
        try {
            const since = new Date();
            if (range === '24h') since.setDate(since.getDate() - 1);
            else if (range === '7d') since.setDate(since.getDate() - 7);
            else if (range === '30d') since.setDate(since.getDate() - 30);
            const sinceISO = since.toISOString();

            // Get all votes for programming languages (including recent ones)
            const { data: votes, error: votesError } = await supabase
                .from('votes')
                .select('option_id, poll_id, created_at, user_id')
                .gte('created_at', sinceISO);

            if (votesError) {
                console.error('Error fetching votes:', votesError);
                return;
            }

            if (!votes || votes.length === 0) {
                setLangAgg([] as Array<{ name: string; pct: number; votes: number }>);
                setUserLangs(new Set());
                return;
            }

            // Get option texts for all vote option IDs
            const optionIds = Array.from(new Set(votes.map(v => v.option_id).filter(Boolean)));
            const { data: optionsRows } = await supabase
                .from('options')
                .select('id, text')
                .in('id', optionIds);

            const idToText = new Map<string, string>();
            (optionsRows || []).forEach((o: any) => {
                if (o?.id && o?.text) idToText.set(o.id, o.text);
            });

            // Aggregate votes by programming language
            const langToCount = new Map<string, number>();
            let totalVotes = 0;

            for (const vote of votes) {
                const optionText = idToText.get(vote.option_id);
                if (optionText) {
                    langToCount.set(optionText, (langToCount.get(optionText) || 0) + 1);
                    totalVotes += 1;
                }
            }

            // Calculate percentages and sort by vote count
            let agg = Array.from(langToCount.entries())
                .map(([name, count]) => ({
                    name,
                    pct: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
                    votes: count
                }))
                .sort((a, b) => b.votes - a.votes) // Sort by actual vote count, not percentage
                .slice(0, 8); // Top 8 most voted languages

            // Get user's votes for highlighting
            const userVotes = votes.filter(v => v.user_id === user?.id);
            const userSet = new Set<string>();
            let latestLabel: string | undefined = undefined;

            for (const uv of userVotes.slice(0, 1)) { // Get latest user vote
                const name = idToText.get(uv.option_id);
                if (name) {
                    userSet.add(String(name).trim().toLowerCase());
                    latestLabel = String(name);
                    setMyLatestLanguage(name);
                    setMyVoteInRange(true);
                }
            }

            // Ensure user's latest language appears even if 0 votes in range
            if (latestLabel && !agg.some(r => String(r.name).toLowerCase() === latestLabel.toLowerCase())) {
                agg = [{ name: latestLabel, pct: 0, votes: 0 }, ...agg];
            }

            setLangAgg(agg);
            setUserLangs(userSet);

        } catch (error) {
            console.error('Error updating chart data:', error);
        }
    }, [range, user?.id, supabase]);

    // Initial data load
    useEffect(() => {
        fetchChartData();
    }, [fetchChartData]);

    // No blocking spinner; render immediately and hydrate sections as data arrives

    // Do not block when user is null; show public aggregated view
    // if (!user) return null;

    if (error) {
        return (
            <div className="max-w-xl mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <h1 className="text-xl font-bold mb-2 text-foreground">Error Loading Polls</h1>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={fetchData}>Try Again</Button>
                            </CardContent>
                        </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 text-left">
                {user && (
                    <Card>
                        <CardContent className="p-4">
                            <h2 className="text-lg font-semibold mb-3 text-foreground">My Polls</h2>
                            {myLatestLanguage && (
                                <div className="mb-3 text-sm">
                                    <span className="text-muted-foreground">Your vote:</span>{' '}
                                    <span className={myVoteInRange ? 'text-green-600 font-medium' : 'text-foreground'}>
                                        {myLatestLanguage}
                                    </span>
                                    {!myVoteInRange && (
                                        <span className="text-muted-foreground"> (outside selected range)</span>
                                    )}
                                </div>
                            )}
                            {myPolls.length === 0 && (
                                <div className="text-sm text-muted-foreground">You haven't created any polls yet.</div>
                            )}
                            <div className="space-y-3">
                                {myPolls.map((p) => (
                                    <div key={p.id} className="border rounded p-3">
                                        <div className="mb-3">
                                            <div className="font-medium text-foreground text-sm sm:text-base">{p.title}</div>
                                            <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/polls/${p.id}`)} className="flex-1 min-w-0">
                                                View
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/polls/${p.id}/edit`)} className="flex-1 min-w-0">
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={deletingId === p.id}
                                                onClick={async () => {
                                                    if (!confirm('Delete this poll? This cannot be undone.')) return;
                                                    try {
                                                        setDeletingId(p.id);
                                                        await deletePoll(p.id, false);
                                                        await fetchData();
                                                    } catch (e) {
                                                        console.error('Failed to delete poll', e);
                                                    } finally {
                                                        setDeletingId(null);
                                                    }
                                                }}
                                                className="flex-1 min-w-0"
                                            >
                                                {deletingId === p.id ? 'Deleting...' : 'Delete'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 text-sm">
                    <span className="text-muted-foreground">Showing:</span>
                    <div className="flex flex-wrap gap-2">
                        <Button variant={range==='24h'? 'default':'outline'} size="sm" onClick={() => setRange('24h')}>Last 24h</Button>
                        <Button variant={range==='7d'? 'default':'outline'} size="sm" onClick={() => setRange('7d')}>Last 7 days</Button>
                        <Button variant={range==='30d'? 'default':'outline'} size="sm" onClick={() => setRange('30d')}>Last 30 days</Button>
                                </div>
                    <span className="text-muted-foreground text-xs sm:text-sm">Polls created in range: <strong>{createdCount}</strong></span>
                            </div>

                <Card>
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                {/* Chart Visualization */}
                                <div className="bg-card border rounded-lg p-3 sm:p-4 md:p-6 overflow-hidden">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-foreground">
                                        🏆 Programming Language Popularity Rankings
                                    </h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                                        Real-time comparison of programming languages by community votes.
                                        See how languages rank against each other and track the most popular choices!
                                    </p>
                                    <div
                                        role="img"
                                        aria-label={`Horizontal bar chart showing the top ${langAgg.length} programming languages voted by all users on this platform. Languages are ranked by percentage of total votes.`}
                                        className="overflow-x-auto"
                                    >
                                        <AggregatedLanguageChart data={langAgg} userLangs={userLangs} />
                                    </div>
                                    {langAgg.length > 0 && (
                                        <p className="sr-only">
                                            Chart data: {
                                                langAgg.map((item, index) =>
                                                    `${item.name}: ${item.pct}%${index < langAgg.length - 1 ? ', ' : ''}`
                                                ).join('')
                                            }
                                        </p>
                                    )}
                                </div>

                                {/* Detailed Breakdown Table */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">🏅 Language Comparison & Rankings</h4>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Compare vote counts and percentages. Your votes are highlighted in green!
                                    </p>
                                    <div className="divide-y border rounded overflow-x-auto">
                                        {langAgg.map((row) => {
                                            const mine = user && userLangs.has(String(row.name).trim().toLowerCase());
                                            const rank = langAgg.findIndex(r => r.name === row.name) + 1;
                                            return (
                                                <div key={row.name} className={`p-2 sm:p-3 ${mine ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
                                                            <span className="text-xs font-bold text-muted-foreground w-4">#{rank}</span>
                                                            <span className="font-medium text-foreground text-xs sm:text-sm truncate">{row.name}</span>
                                                            {mine && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 flex-shrink-0">
                                                                    ⭐ Your Choice
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-2">
                                                            <div className="text-xs sm:text-sm font-medium text-muted-foreground">{row.pct}%</div>
                                                            <div className="text-xs text-muted-foreground">({row.votes} votes)</div>
                                                        </div>
                                                    </div>
                                                    <div className={`h-1.5 sm:h-2 w-full rounded-full overflow-hidden ${mine ? 'bg-green-200' : 'bg-primary/20'}`}>
                                                        <div className={`${mine ? 'bg-green-600' : 'bg-primary'} h-full transition-all`} style={{ width: `${row.pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {langAgg.length === 0 && (
                                            <div className="p-4 text-sm text-muted-foreground text-center">
                                                No votes in this range
                                            </div>
                                        )}
                                    </div>

                                    {/* Call to Action */}
                                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
                                        <div className="text-center">
                                            <h4 className="font-semibold text-sm mb-2">🎯 Help Shape the Rankings!</h4>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Vote for your favorite programming languages on the home page and watch the rankings update in real-time!
                                            </p>
                                            <Button asChild size="sm" variant="outline" className="text-xs">
                                                <Link href="/">🏠 Vote Now</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
            </div>
        </div>
    );
}
