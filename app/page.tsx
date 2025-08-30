import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, PlusCircle, Users, Database } from "lucide-react";
import Link from "next/link";

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-foreground mb-4">
                        Poll App
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Create and participate in polls
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl  mx-25 items-center ">
                    <Card className="hover:shadow-lg transition-shadow w-65 h-70">
                        <CardHeader>
                            <div className="w-12 h-12 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <CardTitle className="text-lg">
                                Browse Polls
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-sm text-muted-foreground mb-4">
                                View and vote on existing polls
                            </CardDescription>
                            <Button asChild className="w-full">
                                <Link href="/polls">Browse</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow w-65 h-70">
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

                    <Card className="hover:shadow-lg transition-shadow w-65 h-70 ">
                        <CardHeader>
                            <div className="w-12 h-12 bg-purple-100/50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <CardTitle className="text-lg">Join</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-sm text-muted-foreground mb-4">
                                Sign up to get started
                            </CardDescription>
                            <Button asChild className="w-full ">
                                <Link href="/auth/register">Sign Up</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4">
                                <Database className="w-6 h-6 text-orange-500" />
                            </div>
                            <CardTitle className="text-lg">Test DB</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-sm text-gray-600 mb-4">
                                Check database connection
                            </CardDescription>
                            <Button asChild className="w-full my-5">
                                <Link href="/test-db">Test Connection</Link>
                            </Button>
                        </CardContent>
                    </Card> */}
                </div>
            </div>
        </div>
    );
}
