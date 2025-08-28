import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default function PollsPage() {
    // Sample poll data
    const myPolls = [
        { id: 1, question: "My Favorite Project", votes: 120 },
        { id: 2, question: "Team Preferences", votes: 85 },
    ];

    const categoryPolls = {
        "Favorite Programming Language": [
            {
                id: 3,
                question: "JavaScript vs TypeScript",
                votes: 250,
                totalVotes: 500,
            },
            { id: 4, question: "Python vs Go", votes: 180, totalVotes: 400 },
        ],
        "Best Frontend Framework": [
            { id: 5, question: "React vs Vue", votes: 320, totalVotes: 600 },
            {
                id: 6,
                question: "Next.js vs Remix",
                votes: 210,
                totalVotes: 450,
            },
        ],
        "Preferred Database": [
            {
                id: 7,
                question: "PostgreSQL vs MySQL",
                votes: 190,
                totalVotes: 380,
            },
            {
                id: 8,
                question: "MongoDB vs Firebase",
                votes: 140,
                totalVotes: 300,
            },
        ],
    };

    return (
        <div className="space-y-8">
            {/* Header with create button */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Poll Dashboard</h1>
                <Button asChild>
                    <Link href="/polls/create">Create New Poll</Link>
                </Button>
            </div>

            {/* My Polls section */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">My Polls</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myPolls.map((poll) => (
                        <Card
                            key={poll.id}
                            className="hover:shadow-lg transition-shadow"
                        >
                            <CardHeader>
                                <CardTitle>{poll.question}</CardTitle>
                            </CardHeader>
                            <CardFooter>
                                <div className="w-full">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {poll.votes} total votes
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                    >
                                        View Results
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Category sections */}
            {Object.entries(categoryPolls).map(([category, polls]) => (
                <div key={category} className="space-y-4">
                    <h2 className="text-2xl font-semibold">{category}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {polls.map((poll) => (
                            <Card
                                key={poll.id}
                                className="hover:shadow-lg transition-shadow"
                            >
                                <CardHeader>
                                    <CardTitle>{poll.question}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Progress
                                        value={
                                            (poll.votes / poll.totalVotes) * 100
                                        }
                                        className="h-2"
                                    />
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {poll.votes} votes (
                                        {Math.round(
                                            (poll.votes / poll.totalVotes) * 100
                                        )}
                                        %)
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full">Vote Now</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
