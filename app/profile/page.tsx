"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { NotificationPreferencesComponent } from "@/components/notification-preferences";
import {
    Trash2,
    Upload,
    User,
    Mail,
    Calendar,
    Edit3,
    Lock,
    Eye,
    EyeOff,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';

// Custom colors for the pie chart
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#87ceeb', '#dda0dd', '#98fb98', '#f0e68c'];

// User Voting Distribution Chart Component (Memoized)
const VotingDistributionChart = memo(function VotingDistributionChart({ data }: { data: LangAggRow[] }) {
    // Memoize chart data to prevent unnecessary recalculations
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        return data.map((item, index) => ({
            name: item.name,
            value: item.count,
            percentage: item.pct,
            color: COLORS[index % COLORS.length],
        }));
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
                No voting data to display
            </div>
        );
    }

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize="12"
                fontWeight="bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                            `${value} votes (${props.payload?.percentage}%)`,
                            'Votes'
                        ]}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: string, entry: any) => (
                            <span style={{ color: entry.color }}>
                                {value}
                            </span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
});

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    username: string;
    avatar_url: string;
    bio: string;
    created_at: string;
    updated_at: string;
}

interface LangAggRow { name: string; pct: number; count: number }

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [storageStatus, setStorageStatus] = useState<string>("checking");
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [showDebug, setShowDebug] = useState(false);

    // Form states
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const [myLangAgg, setMyLangAgg] = useState<LangAggRow[]>([]);

    // User statistics state
    const [totalVotes, setTotalVotes] = useState(0);
    const [uniqueLanguages, setUniqueLanguages] = useState(0);
    const [pollsParticipated, setPollsParticipated] = useState(0);
    const [commentsCount, setCommentsCount] = useState(0);

    // Function to fetch user statistics
    const fetchUserStatistics = useCallback(async () => {
        if (!user?.id) return;

        try {
            const { data: votes, error: votesError } = await supabase
                .from('votes')
                .select('option_id, created_at')
                .eq('user_id', user.id);

            if (votesError) {
                console.error('Error fetching user votes:', votesError);
                return;
            }

            if (votes && votes.length > 0) {
                // Get option texts
                const optionIds = Array.from(new Set(votes.map(v => v.option_id).filter(Boolean)));
                const { data: options } = await supabase
                    .from('options')
                    .select('id, text')
                    .in('id', optionIds);

                const idToText = new Map<string, string>();
                (options || []).forEach((o: any) => {
                    if (o?.id && o?.text) idToText.set(o.id, o.text);
                });

                // Calculate statistics
                const uniqueLangs = new Set<string>();
                votes.forEach(vote => {
                    const lang = idToText.get(vote.option_id);
                    if (lang) uniqueLangs.add(lang);
                });

                setTotalVotes(votes.length);
                setUniqueLanguages(uniqueLangs.size);
                setPollsParticipated(new Set(votes.map(v => v.option_id)).size);
            } else {
                setTotalVotes(0);
                setUniqueLanguages(0);
                setPollsParticipated(0);
            }

            // Get comments count
            const { count: commentsCount } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            setCommentsCount(commentsCount || 0);

        } catch (error) {
            console.error('Error fetching user statistics:', error);
        }
    }, [user?.id, supabase]);

    // Function to get user achievements
    const getAchievements = useCallback(() => {
        const achievements = [];

        if (totalVotes >= 1) achievements.push({ name: "First Vote", icon: "🗳️" });
        if (totalVotes >= 10) achievements.push({ name: "Vote Enthusiast", icon: "📊" });
        if (totalVotes >= 50) achievements.push({ name: "Poll Master", icon: "🏆" });
        if (uniqueLanguages >= 3) achievements.push({ name: "Language Explorer", icon: "🌍" });
        if (uniqueLanguages >= 5) achievements.push({ name: "Polyglot Voter", icon: "💻" });
        if (commentsCount >= 1) achievements.push({ name: "Community Voice", icon: "💬" });
        if (commentsCount >= 10) achievements.push({ name: "Discussion Leader", icon: "🎤" });

        return achievements;
    }, [totalVotes, uniqueLanguages, commentsCount]);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchProfile();
            checkStorageStatus();
            fetchUserStatistics();
        }
    }, [user]);

    useEffect(() => {
        const fetchMyVotesAgg = async () => {
            try {
                if (!user?.id) return;
                // 1) Fetch user's votes (all time)
                const { data: myVotes, error: votesError } = await supabase
                    .from('votes')
                    .select('option_id')
                    .eq('user_id', user.id);
                if (votesError || !myVotes || myVotes.length === 0) {
                    setMyLangAgg([]);
                    return;
                }
                const optionIds = Array.from(new Set(myVotes.map(v => v.option_id).filter(Boolean)));
                // 2) Map option id -> text (language)
                const { data: optionsRows, error: optsError } = await supabase
                    .from('options')
                    .select('id, text')
                    .in('id', optionIds);
                if (optsError || !optionsRows) {
                    setMyLangAgg([]);
                    return;
                }
                const idToText = new Map<string, string>();
                optionsRows.forEach((o: any) => { if (o?.id && o?.text) idToText.set(o.id, o.text); });
                // 3) Aggregate counts
                const langToCount = new Map<string, number>();
                let total = 0;
                for (const v of myVotes) {
                    const name = idToText.get(v.option_id);
                    if (!name) continue;
                    langToCount.set(name, (langToCount.get(name) || 0) + 1);
                    total += 1;
                }
                const rows: LangAggRow[] = Array.from(langToCount.entries())
                    .map(([name, count]) => ({ name, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
                    .sort((a, b) => b.count - a.count);
                setMyLangAgg(rows);
            } catch {
                setMyLangAgg([]);
            }
        };
        fetchMyVotesAgg();
    }, [user?.id]);

    const checkStorageStatus = async () => {
        try {
            // First, try to access the avatars bucket directly
            const { data: bucket, error } = await supabase.storage
                .from("avatars")
                .list("");

            if (error) {
                console.error("Storage check error:", error);

                // Check if the error indicates the bucket doesn't exist
                const errorMessage = error.message?.toLowerCase() || "";
                const isBucketMissing =
                    errorMessage.includes("bucket not found") ||
                    errorMessage.includes("404") ||
                    errorMessage.includes("does not exist") ||
                    errorMessage.includes("not found");

                if (isBucketMissing) {
                    setStorageStatus("missing");
                } else {
                    // Other errors (permission issues, etc.) - bucket likely exists
                    setStorageStatus("ready");
                }
                return;
            }

            // If we can list the bucket, it's ready
            setStorageStatus("ready");
        } catch (error) {
            console.error("Storage check failed:", error);
            // On any error, assume bucket exists but there might be other issues
            setStorageStatus("ready");
        }
    };

    const fetchProfile = async () => {
        try {
            if (!user?.id) {
                throw new Error("No user ID found");
            }

            // Load profile from user_profiles; bootstrap if missing
            const { data, error } = await supabase
                .from('user_profiles')
                .select('display_name, username, bio, avatar_url')
                .eq('id', user.id)
                .maybeSingle();

            // Non-fatal: proceed to bootstrap/defaults if select failed or returned null
            if (error) {
                console.warn('profile select error (non-fatal):', error);
            }

            if (!data) {
                // Create a minimal row so later updates work seamlessly
                await supabase
                    .from('user_profiles')
                    .upsert({ id: user.id }, { onConflict: 'id' });

                const basicProfile: UserProfile = {
                    id: user.id,
                    email: user.email || '',
                    full_name: '',
                    username: '',
                    avatar_url: '',
                    bio: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                setProfile(basicProfile);
                setFullName('');
                setUsername('');
                setBio('');
                setLoadingProfile(false);
                return;
            }

            // Map DB to form/local state
            setProfile((prev) => ({
                id: user.id,
                email: user.email || '',
                full_name: data.display_name || '',
                username: data.username || '',
                avatar_url: data.avatar_url || '',
                bio: data.bio || '',
                created_at: prev?.created_at || '',
                updated_at: new Date().toISOString(),
            }));
            setFullName(data.display_name || '');
            setUsername(data.username || '');
            setBio(data.bio || '');
            setLoadingProfile(false);
            return;
        } catch (error: any) {
            console.error("Error fetching profile:", error);

            let errorMessage = error.message || "Failed to load profile";

            // Handle specific error types
            if (
                error.message?.includes("fetch") ||
                error.message?.includes("network")
            ) {
                errorMessage =
                    "Network error: Please check your internet connection and try again.";
            } else if (
                error.message?.includes("permission") ||
                error.message?.includes("policy")
            ) {
                errorMessage =
                    "Permission denied: Please check your Supabase RLS policies.";
            } else if (error.message?.includes("connection")) {
                errorMessage =
                    "Database connection error: Please check your Supabase configuration.";
            } else if (error.code === "ECONNREFUSED") {
                errorMessage =
                    "Connection refused: Please check your Supabase URL and API key configuration.";
            } else if (!error.code) {
                errorMessage =
                    "Database query failed. This usually indicates the profiles table doesn't exist or there's a configuration issue.";
            }

            setError(errorMessage);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadAvatar = async (): Promise<boolean> => {
        if (!avatarFile || !user) {
            setError("No file selected or user not logged in");
            return false;
        }

        // Validate file
        const validTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(avatarFile.type)) {
            setError("Please select a valid image file (JPEG, PNG, or WebP)");
            return false;
        }

        if (avatarFile.size > maxSize) {
            setError("File size must be less than 5MB");
            return false;
        }

        setUploadingAvatar(true);
        setError(null);

        try {
            // Check if avatars bucket exists
            const { data: buckets, error: bucketError } =
                await supabase.storage.listBuckets();
            if (bucketError) {
                console.error("Bucket list error:", bucketError);
                throw new Error(
                    "Storage service unavailable. Please check your Supabase storage configuration."
                );
            }

            // Skip bucket existence check since avatars bucket already exists
            // This prevents the "bucket not found" error when bucket exists but isn't listed
            console.log("Available buckets:", buckets);

            const fileExt = avatarFile.name.split(".").pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            console.log("Starting avatar upload process:", {
                fileName,
                filePath,
                fileType: avatarFile.type,
                fileSize: avatarFile.size,
                bucket: "avatars",
                userId: user.id,
                timestamp: new Date().toISOString(),
            });

            // Check if user already has an avatar and delete it
            if (profile?.avatar_url) {
                try {
                    const oldPath = profile.avatar_url.split("/").pop();
                    if (oldPath) {
                        const oldFilePath = `${user.id}/${oldPath}`;
                        console.log("Removing old avatar:", oldFilePath);
                        await supabase.storage
                            .from("avatars")
                            .remove([oldFilePath]);
                    }
                } catch (removeError) {
                    console.warn("Failed to remove old avatar:", removeError);
                    // Continue with upload even if old avatar removal fails
                }
            }

            // Upload new avatar (upsert + content type)
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, avatarFile, {
                    cacheControl: "3600",
                    upsert: true,
                    contentType: avatarFile.type || "image/*",
                });

            if (uploadError) {
                console.error("Upload error details:", {
                    message: uploadError.message,
                    error: uploadError,
                    stack: uploadError.stack,
                    fullError: JSON.stringify(uploadError, null, 2),
                });

                if (uploadError.message?.includes("Bucket not found")) {
                    throw new Error(
                        "Storage bucket 'avatars' not found. Please ensure the bucket exists in Supabase."
                    );
                }
                throw new Error(
                    `Upload failed: ${uploadError.message || "Unknown error"}`
                );
            }

            // Get public URL
            const {
                data: { publicUrl },
            } = supabase.storage.from("avatars").getPublicUrl(filePath);

            // Persist avatar URL into profile table for consistency
            const { error: avatarSaveError } = await supabase
                .from('user_profiles')
                .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            if (avatarSaveError) {
                console.warn("Avatar URL DB save warning:", avatarSaveError);
            }

            // Update local state
            setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
            setSuccess("Avatar updated successfully!");
            return true;
        } catch (error: any) {
            console.error("Avatar upload error:", error);
            setError(error.message || "Failed to upload avatar");
            return false;
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setUpdating(true);
        setError(null);
        setSuccess(null);

        try {
            // Persist profile to user_profiles
            const updatesDb: any = {
                id: user.id,
                display_name: fullName || null,
                username: username || null,
                bio: bio || null,
                updated_at: new Date().toISOString(),
            };

            // Upload avatar first if provided
            if (avatarFile) {
                const avatarSuccess = await uploadAvatar();
                if (!avatarSuccess) return;
                // use profile?.avatar_url which uploadAvatar sets locally
                if (profile?.avatar_url) updatesDb.avatar_url = profile.avatar_url;
            }

            // Check if a profile row exists
            const { data: existing, error: selErr } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (selErr && ((selErr as any).code || (selErr as any).message)) {
                console.warn('profile select error (non-fatal):', JSON.stringify(selErr, null, 2));
            }

            let writeError: any = null;
            if (existing?.id) {
                const { error: updErr } = await supabase
                    .from('user_profiles')
                    .update(updatesDb)
                    .eq('id', user.id);
                writeError = updErr;
            } else {
                const { error: insErr } = await supabase
                    .from('user_profiles')
                    .insert({ id: user.id, ...updatesDb });
                writeError = insErr;
            }

            if (writeError) {
                console.error('profile write error:', JSON.stringify(writeError, null, 2));
                throw writeError;
            }

            // Update local state
            setProfile((prev) => (prev ? {
                ...prev,
                full_name: fullName,
                username,
                bio,
                updated_at: updatesDb.updated_at,
              } : prev));

            setSuccess("Profile updated successfully!");

            // Reset avatar state after successful update
            if (avatarFile) {
                setAvatarFile(null);
                setAvatarPreview(null);
                // Reset file input
                const fileInput = document.getElementById(
                    "avatar-upload"
                ) as HTMLInputElement;
                if (fileInput) fileInput.value = "";
            }
        } catch (error: any) {
            console.error("Error updating profile:", error);
            setError(error.message || "Failed to update profile");
        } finally {
            setUpdating(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (newPassword !== confirmPassword) {
            setError("New passwords don't match");
            return;
        }

        setUpdating(true);
        setError(null);
        setSuccess(null);

        try {
            // First verify current password
            const { error: signInError } =
                await supabase.auth.signInWithPassword({
                    email: user.email!,
                    password: currentPassword,
                });

            if (signInError) {
                setError("Current password is incorrect");
                return;
            }

            // Then update password
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            setSuccess("Password changed successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            console.error("Error changing password:", error);
            setError(error.message || "Failed to change password");
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (
            !window.confirm(
                "Are you sure you want to delete your account? This action cannot be undone."
            )
        ) {
            return;
        }

        try {
            const { error } = await supabase.rpc("delete_user");

            if (error) throw error;

            await supabase.auth.signOut();
            router.push("/");
        } catch (error) {
            console.error("Error deleting account:", error);
            setError("Failed to delete account");
        }
    };

    if (loading || loadingProfile) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Progress value={33} className="w-64" />
                    <p className="mt-4 text-muted-foreground">
                        Loading profile...
                    </p>
                </div>
            </div>
        );
    }

    if (error && error.includes("Database schema not found")) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md">
                    <Alert variant="destructive">
                        <AlertTitle>Database Schema Missing</AlertTitle>
                        <AlertDescription>
                            The profiles table doesn't exist. Please run the SQL
                            schema updates in your Supabase dashboard:
                            <br />
                            <br />
                            1. Go to your Supabase Dashboard → SQL Editor 2.
                            Copy and paste the contents of{" "}
                            <code>supabase_schema_updated.sql</code>
                            3. Click "Run" to execute the SQL
                            <br />
                            <br />
                            After running the SQL, refresh this page.
                            <br />
                            <br />
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setError(null);
                                    fetchProfile();
                                }}
                            >
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">
                            Profile Settings
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your account settings and preferences
                        </p>
                    </div>

                    {/* User Statistics */}
                    <Card>
                        <CardHeader>
                            <CardTitle>📊 Your Voting Statistics</CardTitle>
                            <CardDescription>Your activity and impact on the platform</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-primary">{totalVotes}</div>
                                    <div className="text-sm text-muted-foreground">Total Votes</div>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{uniqueLanguages}</div>
                                    <div className="text-sm text-muted-foreground">Languages Voted</div>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{pollsParticipated}</div>
                                    <div className="text-sm text-muted-foreground">Polls Joined</div>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">{commentsCount}</div>
                                    <div className="text-sm text-muted-foreground">Comments</div>
                                </div>
                            </div>

                            {/* Achievements */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm">🏆 Achievements</h4>
                                <div className="flex flex-wrap gap-2">
                                    {getAchievements().map((achievement, index) => (
                                        <div key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 dark:from-yellow-900/30 dark:to-orange-900/30 dark:text-yellow-300">
                                            {achievement.icon} {achievement.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* My Voting Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>📈 Your Language Preferences</CardTitle>
                            <CardDescription>Languages you have voted for (all time)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {myLangAgg.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground mb-4">You haven't voted yet.</p>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/">🗳️ Cast Your First Vote</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Chart Visualization */}
                                    <div className="bg-card border rounded-lg p-4">
                                        <div
                                            role="img"
                                            aria-label={`Pie chart showing your voting distribution across ${myLangAgg.length} programming languages`}
                                        >
                                            <VotingDistributionChart data={myLangAgg} />
                                        </div>
                                        {myLangAgg.length > 0 && (
                                            <p className="sr-only">
                                                Your voting distribution: {
                                                    myLangAgg.map((item, index) =>
                                                        `${item.name}: ${item.count} votes (${item.pct}%)${index < myLangAgg.length - 1 ? ', ' : ''}`
                                                    ).join('')
                                                }
                                            </p>
                                        )}
                                    </div>

                                    {/* Detailed Breakdown */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-muted-foreground">Vote Breakdown</h4>
                                        <div className="divide-y border rounded">
                                            {myLangAgg.map((row, index) => (
                                                <div key={row.name} className="p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center space-x-3">
                                                            <div
                                                                className="w-4 h-4 rounded-full"
                                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                            />
                                                            <span className="font-medium text-foreground">{row.name}</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-muted-foreground">
                                                            {row.count} {row.count === 1 ? 'vote' : 'votes'} ({row.pct}%)
                                                        </span>
                                                    </div>
                                                    <Progress value={row.pct} className="h-2" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>📋 Recent Activity</CardTitle>
                            <CardDescription>Your latest votes and interactions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {totalVotes > 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                                    <span className="text-green-600 dark:text-green-400 text-sm">🗳️</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Active Voter</p>
                                                    <p className="text-xs text-muted-foreground">You have cast {totalVotes} votes across {uniqueLanguages} programming languages</p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {pollsParticipated} polls participated
                                            </div>
                                        </div>

                                        {commentsCount > 0 && (
                                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                        <span className="text-blue-600 dark:text-blue-400 text-sm">💬</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">Community Contributor</p>
                                                        <p className="text-xs text-muted-foreground">You have posted {commentsCount} comments in discussions</p>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Discussion leader
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                                    <span className="text-purple-600 dark:text-purple-400 text-sm">📊</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Platform Impact</p>
                                                    <p className="text-xs text-muted-foreground">Your votes help shape programming language popularity rankings</p>
                                                </div>
                                            </div>
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href="/polls">View Rankings</Link>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                            <span className="text-muted-foreground text-lg">🗳️</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">No activity yet</p>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href="/">Start Voting</Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {error && (
                        <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                {error}
                                {error.includes("bucket not found") && (
                                    <div className="mt-2 text-sm">
                                        <p>To fix this:</p>
                                        <ol className="list-decimal list-inside mt-1 space-y-1">
                                            <li>
                                                Go to your Supabase Dashboard
                                            </li>
                                            <li>
                                                Navigate to Storage → Buckets
                                            </li>
                                            <li>
                                                Create a new bucket named
                                                "avatars"
                                            </li>
                                            <li>Set bucket to public</li>
                                            <li>
                                                Or run the SQL schema updates
                                                provided
                                            </li>
                                        </ol>
                                    </div>
                                )}
                                {error.includes("Database") && (
                                    <div className="mt-4 space-y-2">
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setError(null);
                                                    setDebugInfo(null);
                                                    fetchProfile();
                                                }}
                                            >
                                                Retry
                                            </Button>
                                            <button
                                                onClick={() =>
                                                    setShowDebug(!showDebug)
                                                }
                                                className="text-sm underline text-blue-400 hover:text-blue-300"
                                            >
                                                {showDebug ? "Hide" : "Show"}{" "}
                                                technical details
                                            </button>
                                        </div>
                                        {showDebug && debugInfo && (
                                            <div className="mt-2 text-xs bg-muted p-2 rounded font-mono">
                                                <p>
                                                    <strong>Code:</strong>{" "}
                                                    {debugInfo.code || "N/A"}
                                                </p>
                                                <p>
                                                    <strong>Message:</strong>{" "}
                                                    {debugInfo.message || "N/A"}
                                                </p>
                                                <p>
                                                    <strong>Details:</strong>{" "}
                                                    {debugInfo.details || "N/A"}
                                                </p>
                                                <p>
                                                    <strong>Hint:</strong>{" "}
                                                    {debugInfo.hint || "N/A"}
                                                </p>
                                                <p>
                                                    <strong>Timestamp:</strong>{" "}
                                                    {debugInfo.timestamp ||
                                                        "N/A"}
                                                </p>
                                                <p>
                                                    <strong>User ID:</strong>{" "}
                                                    {debugInfo.userId || "N/A"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert>
                            <AlertTitle>Success</AlertTitle>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {/* Avatar Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Picture</CardTitle>
                            <CardDescription>
                                Update your profile picture
                            </CardDescription>
                            {storageStatus === "missing" && (
                                <Alert variant="destructive" className="mt-2">
                                    <AlertTitle>
                                        Storage Not Configured
                                    </AlertTitle>
                                    <AlertDescription>
                                        The avatars storage bucket is missing.
                                        Please run the SQL schema updates to
                                        create it, or check your Supabase
                                        dashboard to ensure it exists.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {storageStatus === "error" && (
                                <Alert variant="destructive" className="mt-2">
                                    <AlertTitle>Storage Error</AlertTitle>
                                    <AlertDescription>
                                        Unable to access storage. This might be
                                        a permission issue. Please check your
                                        Supabase RLS policies and ensure the
                                        avatars bucket exists.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-border">
                                    <AvatarImage
                                        src={
                                            avatarPreview || profile.avatar_url
                                        }
                                        alt={profile.full_name || "Profile"}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="text-2xl sm:text-3xl bg-muted">
                                        {profile.full_name
                                            ?.charAt(0)
                                            ?.toUpperCase() ||
                                            profile.email
                                                .charAt(0)
                                                .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col space-y-3 w-full sm:w-auto">
                                    <div>
                                        <Label
                                            htmlFor="avatar-upload"
                                            className="cursor-pointer"
                                        >
                                            <div className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors text-sm">
                                                <Upload size={14} />
                                                <span>Choose Photo</span>
                                            </div>
                                            <Input
                                                id="avatar-upload"
                                                type="file"
                                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                                onChange={handleAvatarChange}
                                                className="hidden"
                                            />
                                        </Label>
                                    </div>
                                    {avatarFile && (
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                onClick={uploadAvatar}
                                                disabled={
                                                    uploadingAvatar ||
                                                    storageStatus !== "ready"
                                                }
                                                size="sm"
                                                className="w-full"
                                            >
                                                {uploadingAvatar ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    "Upload Avatar"
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setAvatarFile(null);
                                                    setAvatarPreview(null);
                                                    const fileInput =
                                                        document.getElementById(
                                                            "avatar-upload"
                                                        ) as HTMLInputElement;
                                                    if (fileInput)
                                                        fileInput.value = "";
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex items-center space-x-2 text-xs">
                                        <span className="text-muted-foreground">
                                            JPEG, PNG, or WebP. Max 5MB.
                                        </span>
                                        {storageStatus === "checking" && (
                                            <span className="text-yellow-600">
                                                Checking storage...
                                            </span>
                                        )}
                                        {storageStatus === "ready" && (
                                            <span className="text-green-600">
                                                ✓ Storage ready
                                            </span>
                                        )}
                                        {storageStatus === "missing" && (
                                            <span className="text-orange-600">
                                                ⚠ Storage not configured
                                            </span>
                                        )}
                                        {storageStatus === "error" && (
                                            <span className="text-red-600">
                                                ✗ Storage error
                                            </span>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={checkStorageStatus}
                                            className="h-6 px-2 text-xs"
                                        >
                                            Refresh
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Profile Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>
                                Update your personal information
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleProfileUpdate}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">
                                            Full Name
                                        </Label>
                                        <Input
                                            id="fullName"
                                            value={fullName}
                                            onChange={(e) =>
                                                setFullName(e.target.value)
                                            }
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="username">
                                            Username
                                        </Label>
                                        <Input
                                            id="username"
                                            value={username}
                                            onChange={(e) =>
                                                setUsername(e.target.value)
                                            }
                                            placeholder="Enter username"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        value={profile.email}
                                        disabled
                                        className="bg-muted"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bio">Bio</Label>
                                    <textarea
                                        id="bio"
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Tell us about yourself"
                                        className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <Button type="submit" disabled={updating}>
                                    {updating
                                        ? "Updating..."
                                        : "Update Profile"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Change Password */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>
                                Update your account password
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handlePasswordChange}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">
                                        Current Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="currentPassword"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={currentPassword}
                                            onChange={(e) =>
                                                setCurrentPassword(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={16} />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">
                                        New Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="newPassword"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={newPassword}
                                            onChange={(e) =>
                                                setNewPassword(e.target.value)
                                            }
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={16} />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">
                                        Confirm New Password
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        placeholder="Confirm new password"
                                    />
                                </div>
                                <Button type="submit" disabled={updating}>
                                    {updating
                                        ? "Changing..."
                                        : "Change Password"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Account Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                            <CardDescription>
                                Your account details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Member Since
                                    </p>
                                    <p className="text-sm">
                                        {new Date(
                                            profile.created_at
                                        ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Last Updated
                                    </p>
                                    <p className="text-sm">
                                        {new Date(
                                            profile.updated_at
                                        ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Delete Account */}
                    <Card className="border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">
                                Danger Zone
                            </CardTitle>
                            <CardDescription>
                                Delete your account permanently
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Once you delete your account, there is no going
                                back. All your data will be permanently removed.
                            </p>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAccount}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Notification Preferences */}
            <div className="mt-8">
                <NotificationPreferencesComponent />
            </div>
        </div>
    );
}
