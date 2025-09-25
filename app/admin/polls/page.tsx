import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

interface PollOption {
    id: string;
    text: string;
    votes_count: number;
}

interface Poll {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    user_id: string;
    options: PollOption[];
    votes?: { id: string; option_id: string }[];
}

export default async function AdminPollsPage() {
    // Use cookie-based server client; admin access is enforced by middleware
    const supabase = createServerComponentClient({ cookies });

    // Get all polls with vote statistics
    const { data: pollsRaw, error } = await supabase
        .from("polls")
        .select(`
            id, title, description, created_at, user_id,
            options ( id, text ),
            votes: votes ( id, option_id )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching polls:", error);
        return <div className="text-red-500 p-4">Error loading polls</div>;
    }

    const polls: Poll[] = (pollsRaw || []).map((poll: any) => {
        const optionsWithCounts = (poll.options || []).map((option: any) => ({
            id: option.id,
            text: option.text,
            votes_count: (poll.votes || []).filter((v: any) => v.option_id === option.id).length,
        }));
        return { ...poll, options: optionsWithCounts } as Poll;
    });

    // Calculate statistics
    const totalPolls = polls.length || 0;
    const totalVotes =
        polls?.reduce(
            (sum, poll) =>
                sum +
                (poll.options?.reduce(
                    (optionSum: number, option: PollOption) =>
                        optionSum + (option.votes_count || 0),
                    0
                ) || 0),
            0
        ) || 0;

    // Analyze programming language demand with actual user vote percentages
    const programmingLanguages = [
        "JavaScript", "Python", "Java", "TypeScript", "C#", "C++", "PHP", "Ruby", 
        "Go", "Rust", "Swift", "Kotlin", "SQL", "HTML/CSS", "React", "Vue", 
        "Angular", "Node.js", "Django", "Flask", "Spring", "Laravel", "Express"
    ];

    // Get individual votes (no legacy profiles join)
    const { data: allVotes } = await supabase
        .from('votes')
        .select('option_id, user_id');

    const { data: allOptions } = await supabase
        .from('options')
        .select('id, text, poll_id');

    // Optional: language mentions table may not exist in all setups
    const { data: languageMentions } = { data: [] as any[] } as any;

    const languageStats = programmingLanguages.map(lang => {
        let totalVotes = 0;
        let userVotes = new Set(); // Track unique users who voted for this language
        
        allOptions?.forEach(option => {
            if (option.text.toLowerCase().includes(lang.toLowerCase())) {
                // Find all votes for this option
                const votesForOption = allVotes?.filter(vote => vote.option_id === option.id) || [];
                totalVotes += votesForOption.length;
                
                // Track unique users
                votesForOption.forEach(vote => {
                    if ((vote as any).user_id) {
                        userVotes.add((vote as any).user_id);
                    }
                });
            }
        });

        const mention = languageMentions?.find?.((m: any) => m.language_name === lang);
        
        return {
            language: lang,
            votes: totalVotes,
            users: userVotes.size,
            mentions: mention?.mention_count || 0,
            percentage: 0 // Will calculate after getting totals
        };
    }).filter(lang => lang.votes > 0 || lang.mentions > 0);

    // Calculate progressive percentages
    const totalLanguageVotes = languageStats.reduce((sum, lang) => sum + lang.votes, 0);
    const languageDemand = languageStats
        .map(lang => ({
            ...lang,
            percentage: totalLanguageVotes > 0 ? Math.round((lang.votes / totalLanguageVotes) * 100) : 0
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10);

    // Prepare chart data
    const pollChartData =
        polls?.slice(0, 10).map((poll) => ({
            name:
                poll.title.length > 20
                    ? poll.title.substring(0, 20) + "..."
                    : poll.title,
            votes:
                poll.options?.reduce(
                    (sum: number, option: PollOption) => sum + (option.votes_count || 0),
                    0
                ) || 0,
            options: poll.options?.length || 0,
        })) || [];

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Admin Polls Dashboard</h1>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Polls</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalPolls}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Total Votes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalVotes}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Average Votes per Poll</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {totalPolls > 0
                                ? Math.round(totalVotes / totalPolls)
                                : 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Language Demand Dashboard */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Programming Language Demand Trends</CardTitle>
                    <p className="text-sm text-gray-600">Real-time demand based on poll engagement</p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {languageDemand.map((lang, index) => {
                            const totalDemand = languageDemand.reduce((sum, l) => sum + l.votes, 0);
                            const percentage = Math.round((lang.votes / totalDemand) * 100);
                            const colorIntensity = Math.max(20, 100 - (index * 8));
                            
                            return (
                                <div key={lang.language} className="group">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-lg font-bold text-gray-400 w-6">
                                                {index + 1}
                                            </span>
                                            <span className="font-medium text-gray-800">
                                                {lang.language}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                ({lang.mentions} mentions, {lang.votes} votes)
                                            </span>
                                        </div>
                                        <div className="text-right">
                                        <span className="text-lg font-bold text-blue-600">
                                            {percentage}%
                                        </span>
                                        <div className="text-xs text-gray-500">
                                            {lang.users} users
                                        </div>
                                    </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="h-3 rounded-full transition-all duration-500 ease-out"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: `hsl(221, ${colorIntensity}%, ${Math.max(40, 70 - index * 5)}%)`
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t text-center">
                        <p className="text-sm text-gray-600">
                            Total votes: <span className="font-semibold">{languageDemand.reduce((sum, l) => sum + l.votes, 0)}</span> • 
                            Unique voters: <span className="font-semibold">{new Set(languageDemand.flatMap(l => Array(l.users).fill(0))).size}</span>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Polls List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Polls ({totalPolls})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {polls?.map((poll: Poll) => {
                            const pollTotalVotes =
                                poll.options?.reduce(
                                    (sum, option) =>
                                        sum + (option.votes_count || 0),
                                    0
                                ) || 0;

                            return (
                                <div
                                    key={poll.id}
                                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold">
                                    {poll.title}
                                </h3>
                                <Link
                                    href={`/polls/${poll.id}`}
                                    className="text-sm text-primary hover:underline"
                                >
                                    View
                                </Link>
                            </div>

                                    {poll.description && (
                                        <p className="text-sm text-gray-600 mb-3">
                                            {poll.description}
                                        </p>
                                    )}

                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-gray-700">
                                            Total Votes: {pollTotalVotes}
                                        </div>
                                        {poll.options?.map((option) => {
                                            const percentage =
                                                pollTotalVotes > 0
                                                    ? Math.round(
                                                          (option.votes_count /
                                                              pollTotalVotes) *
                                                              100
                                                      )
                                                    : 0;
                                            return (
                                                <div
                                                    key={option.id}
                                                    className="flex items-center gap-3 py-1"
                                                >
                                                    <span className="text-sm flex-1">
                                                        {option.text}
                                                    </span>
                                                    <span className="text-sm text-gray-500 min-w-[60px]">
                                                        {option.votes_count}{" "}
                                                        votes
                                                    </span>
                                                    <span className="text-sm text-gray-500 min-w-[50px]">
                                                        ({percentage}%)
                                                    </span>
                                                    <div className="w-24">
                                                        <Progress
                                                            value={percentage}
                                                            className="h-2"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-3 text-xs text-gray-400">
                                        Created:{" "}
                                        {new Date(
                                            poll.created_at
                                        ).toLocaleDateString()}
                                    </div>
                                </div>
                            );
                        })}

                        {polls?.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No polls found
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
