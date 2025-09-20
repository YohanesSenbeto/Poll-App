"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPoll, getLanguageCatalog } from "@/lib/database";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { notificationManager } from "@/lib/utils/notifications";
import { useAuth } from "@/app/auth-context";
import { ProtectedRoute } from "@/components/protected-route";

const FALLBACK_LANGS = [
    'Python', 'JavaScript', 'TypeScript', 'Java', 'C#', 'C', 'C++', 'Go', 'Rust', 'PHP', 'Ruby',
    'Swift', 'Kotlin', 'Objective-C', 'Scala', 'Dart', 'R', 'SQL', 'HTML/CSS', 'Shell', 'PowerShell',
    'Elixir', 'Erlang', 'Haskell', 'Clojure', 'Lua', 'Perl', 'MATLAB', 'Solidity'
];

function CreatePollForm() {
    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [languages, setLanguages] = useState<string[]>([]);
    const [catalog, setCatalog] = useState<string[]>(FALLBACK_LANGS);
    const [loading, setLoading] = useState<boolean>(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        (async () => {
            const langs = await getLanguageCatalog();
            if (langs && langs.length > 0) setCatalog(langs);
        })();
    }, []);

    const isFormValid = useMemo(() => {
        const titleOk = title.trim().length >= 5;
        const descOk = !description || description.trim().length >= 5;
        const langsOk = languages.length === 5 && new Set(languages).size === 5;
        return titleOk && descOk && langsOk;
    }, [title, description, languages]);

    useEffect(() => {
        const errors: Record<string, string> = {};
        if (title && title.trim().length < 5) errors.title = "Title must be at least 5 characters";
        if (description && description.trim().length < 5) errors.description = "Description must be at least 5 characters";
        if (languages.length !== 5) errors.languages = "Select exactly 5 programming languages";
        setFieldErrors(errors);
    }, [title, description, languages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            notificationManager.addNotification({ type: "warning", title: "Authentication Required", message: "Please login to create polls", duration: 5000 });
            router.push("/auth/login?redirectTo=/polls/create");
            return;
        }
        if (!isFormValid) return;

        const payload = {
            title: title.trim(),
            description: description.trim() || null,
            options: languages,
        };

        setLoading(true);
        try {
            const poll = await createPoll(payload);
            if (poll?.id) {
                router.prefetch(`/polls/${poll.id}`);
                router.push(`/polls/${poll.id}`);
                setTimeout(() => notificationManager.addNotification({ type: "success", title: "Poll Created!", message: "Your poll has been created successfully", duration: 5000 }), 100);
            } else {
                throw new Error("Failed to create poll");
            }
        } catch (err: any) {
            notificationManager.addNotification({ type: "error", title: "Error Creating Poll", message: err?.message ?? "Unexpected error", duration: 8000 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchParams.get("authRequired") === "true" && !user) {
            notificationManager.addNotification({ type: "warning", title: "Authentication Required", message: "Please register or login to create polls", duration: 5000 });
        }
    }, [searchParams, user]);

    const toggleLanguage = (lang: string) => {
        setLanguages(prev => {
            if (prev.includes(lang)) return prev.filter(l => l !== lang);
            if (prev.length >= 5) return prev; // limit to 5
            return [...prev, lang];
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Card className="max-w-2xl mx-auto border-2 shadow-lg">
                <CardHeader>
                    <CardTitle>Create New Poll</CardTitle>
                </CardHeader>
                <CardContent>
                    {!user ? (
                        <div className="py-8 text-center">
                            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                            <p className="mb-4">Please register or login to create polls.</p>
                            <div className="space-x-4">
                                <Link href="/auth/login?redirectTo=/polls/create"><Button>Sign In</Button></Link>
                                <Link href="/auth/register?redirectTo=/polls/create"><Button variant="outline">Create Account</Button></Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-1">
                                <Label>Poll Title *</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your question?" />
                                {fieldErrors.title && <p className="text-sm text-red-600">{fieldErrors.title}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label>Description</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(optional) Provide more context for voters" rows={3} />
                                {fieldErrors.description && <p className="text-sm text-red-600">{fieldErrors.description}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Select exactly 5 programming languages *</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto p-2 border rounded">
                                    {catalog.map((lang) => {
                                        const checked = languages.includes(lang);
                                        return (
                                            <button
                                                type="button"
                                                key={lang}
                                                onClick={() => toggleLanguage(lang)}
                                                className={`text-left px-3 py-2 rounded border ${checked ? 'bg-blue-600 text-white border-blue-600' : 'bg-background text-foreground border-border'}`}
                                            >
                                                {lang}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="text-sm text-muted-foreground">Selected: {languages.length} / 5</div>
                                {fieldErrors.languages && <p className="text-sm text-red-600">{fieldErrors.languages}</p>}
                            </div>

                            <Button type="submit" disabled={loading || !isFormValid}>{loading ? "Creating…" : "Create Poll"}</Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function CreatePollPage() {
    return (
        <ProtectedRoute>
            <CreatePollForm />
        </ProtectedRoute>
    );
}
