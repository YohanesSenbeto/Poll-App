"use client";

import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getPollById, getPollResults, getUserPolls, deletePoll } from "@/lib/database";
import { useAuth } from "@/app/auth-context";
import { useRouter } from "next/navigation";
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
    data: Array<{ name: string; pct: number }>,
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
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                            `${value}%`,
                            'Percentage'
                        ]}
                        labelFormatter={(label) => `Language: ${label}`}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                        }}
                    />
                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
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

    const [langAgg, setLangAgg] = useState<Array<{ name: string; pct: number }>>([]);
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
                const mine = await getUserPolls(user.id);
                setMyPolls(mine || []);
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

    // Compute aggregated language percentages across visible polls for selected range
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const since = new Date();
                if (range === '24h') since.setDate(since.getDate() - 1);
                else if (range === '7d') since.setDate(since.getDate() - 7);
                else if (range === '30d') since.setDate(since.getDate() - 30);
                const sinceISO = since.toISOString();

                // Count polls created in this range efficiently
                const { data: pollsInRange } = await supabase
                    .from('polls')
                    .select('id')
                    .gte('created_at', sinceISO)
                    .eq('is_active', true);
                if (!cancelled) setCreatedCount((pollsInRange || []).length);

                // Votes aggregation (all users)
                const { data: votes, error: votesError } = await supabase
                    .from('votes')
                    .select('option_id, poll_id, created_at')
                    .gte('created_at', sinceISO);

                // User's own most recent vote in range (for highlight)
                let userVotes: any[] = [];
                if (user?.id) {
                    const { data: myVotes } = await supabase
                        .from('votes')
                        .select('option_id, created_at')
                        .eq('user_id', user.id)
                        .gte('created_at', sinceISO);
                    // Keep only the latest vote
                    userVotes = (myVotes || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 1);
                }

                const ensureOptionTexts = async (optionIds: string[]) => {
                    if (optionIds.length === 0) return new Map<string, string>();
                    const { data: optionsRows } = await supabase
                        .from('options')
                        .select('id, text')
                        .in('id', optionIds);
                    const map = new Map<string, string>();
                    (optionsRows || []).forEach((o: any) => { if (o?.id && o?.text) map.set(o.id, o.text); });
                    return map;
                };

                if (votesError) {
                    if (!cancelled) { setLangAgg([]); setUserLangs(new Set()); }
                    return;
                }

                if (!votes || votes.length === 0) {
                    // Fallback 0% bars using option texts from visible polls (batched)
                    const names = new Set<string>();
                // Pull common option texts for fallback without needing poll IDs
                const { data: optsBatch } = await supabase
                    .from('options')
                    .select('text')
                    .limit(100);
                (optsBatch || []).forEach((o: any) => { if (o?.text) names.add(o.text as string); });
                    // Highlight user's languages even if no votes in range (based on their own votes in range)
                    const userOptionIds = Array.from(new Set((userVotes || []).map(v => v.option_id).filter(Boolean)));
                    const idToTextUser = await ensureOptionTexts(userOptionIds as string[]);
                    const userSet = new Set<string>();
                    idToTextUser.forEach((val) => userSet.add(String(val).trim().toLowerCase()));
                    // Fallback to latest overall vote if none in range
                    if (user?.id && userSet.size === 0) {
                        const { data: latestVote } = await supabase
                            .from('votes')
                            .select('option_id')
                            .eq('user_id', user.id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .single();
                        if (latestVote?.option_id) {
                            const { data: opt } = await supabase
                                .from('options')
                                .select('id, text')
                                .eq('id', latestVote.option_id)
                                .single();
                            if (opt?.text) {
                                userSet.add(String(opt.text).trim().toLowerCase());
                                setMyLatestLanguage(opt.text);
                                setMyVoteInRange(false);
                            }
                        }
                    }

                    const fallback = Array.from(names).slice(0, 50).map((name) => ({ name, pct: 0 }));
                    if (!cancelled) { setLangAgg(fallback); setUserLangs(userSet); }
                    return;
                }

                const optionIds = Array.from(new Set(votes.map(v => v.option_id).filter(Boolean)));
                // Include user's option ids in the mapping as well (union)
                const userOptionIds = Array.from(new Set((userVotes || []).map(v => v.option_id).filter(Boolean)));
                const allOptionIds = Array.from(new Set([...optionIds, ...userOptionIds]));
                const idToText = await ensureOptionTexts(allOptionIds as string[]);

                // Build user language set for highlighting (only latest); if none in range, fall back to latest overall
                const userSet = new Set<string>();
                let latestLabel: string | null = null;
                for (const uv of userVotes) {
                    const nm = idToText.get(uv.option_id);
                    if (nm) { userSet.add(String(nm).trim().toLowerCase()); latestLabel = String(nm); setMyLatestLanguage(nm); setMyVoteInRange(true); break; }
                }
                if (user?.id && userSet.size === 0) {
                    const { data: latestVote } = await supabase
                        .from('votes')
                        .select('option_id')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    if (latestVote?.option_id) {
                        const { data: opt } = await supabase
                            .from('options')
                            .select('id, text')
                            .eq('id', latestVote.option_id)
                            .single();
                        if (opt?.text) {
                            userSet.add(String(opt.text).trim().toLowerCase());
                            latestLabel = String(opt.text);
                            setMyLatestLanguage(opt.text);
                            setMyVoteInRange(false);
                        }
                    }
                }

                // Aggregate all users
                const langToCount = new Map<string, number>();
                let totalVotes = 0;
                for (const v of votes) {
                    const name = idToText.get(v.option_id);
                    if (!name) continue;
                    langToCount.set(name, (langToCount.get(name) || 0) + 1);
                    totalVotes += 1;
                }

                let agg = Array.from(langToCount.entries())
                    .map(([name, count]) => ({ name, pct: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0 }))
                    .sort((a, b) => b.pct - a.pct)
                    .slice(0, 50);

                // Ensure user's latest language appears even if 0% in current range
                if (latestLabel) {
                    const lower = latestLabel.toLowerCase();
                    if (!agg.some(r => String(r.name).toLowerCase() === lower)) {
                        agg = [{ name: latestLabel, pct: 0 }, ...agg];
                    }
                }

                if (!cancelled) { setLangAgg(agg); setUserLangs(userSet); }
            } catch {
                if (!cancelled) { setLangAgg([]); setUserLangs(new Set()); setCreatedCount(0); }
            }
        })();
        return () => { cancelled = true };
    }, [supabase, polls, refreshByPollId, range, user?.id]);

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
            <div className="max-w-3xl mx-auto px-4 py-6 text-left">
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
                                    <div key={p.id} className="flex items-center justify-between border rounded p-2">
                                        <div className="min-w-0">
                                            <div className="font-medium text-foreground truncate">{p.title}</div>
                                            <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/polls/${p.id}`)}>View</Button>
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/polls/${p.id}/edit`)}>Edit</Button>
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

                <div className="flex items-center gap-2 mb-4 text-sm">
                    <span className="text-muted-foreground">Showing:</span>
                    <Button variant={range==='24h'? 'default':'outline'} size="sm" onClick={() => setRange('24h')}>Last 24h</Button>
                    <Button variant={range==='7d'? 'default':'outline'} size="sm" onClick={() => setRange('7d')}>Last 7 days</Button>
                    <Button variant={range==='30d'? 'default':'outline'} size="sm" onClick={() => setRange('30d')}>Last 30 days</Button>
                    <span className="ml-auto text-muted-foreground">Polls created in range: <strong>{createdCount}</strong></span>
                            </div>

                <Card>
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                {/* Chart Visualization */}
                                <div className="bg-card border rounded-lg p-4">
                                    <h3 className="text-lg font-semibold mb-3 text-foreground">
                                        Programming Language Popularity
                                    </h3>
                                    <div
                                        role="img"
                                        aria-label={`Bar chart showing programming language popularity. ${langAgg.length} languages displayed.`}
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
                                    <h4 className="text-sm font-medium text-muted-foreground">Detailed Breakdown</h4>
                                    <div className="divide-y border rounded">
                                        {langAgg.map((row) => {
                                            const mine = user && userLangs.has(String(row.name).trim().toLowerCase());
                                            return (
                                                <div key={row.name} className={`p-3 ${mine ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-medium text-foreground">{row.name}</span>
                                                            {mine && (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                                    Your Vote
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-medium text-muted-foreground">{row.pct}%</span>
                                                    </div>
                                                    <div className={`h-2 w-full rounded-full overflow-hidden ${mine ? 'bg-green-200' : 'bg-primary/20'}`}>
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
                                </div>
                            </div>
                        </CardContent>
                    </Card>
            </div>
        </div>
    );
}
