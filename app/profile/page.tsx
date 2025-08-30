"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchProfile();
            checkStorageStatus();
        }
    }, [user]);

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

            console.log("Fetching profile for user ID:", user.id);

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error("Supabase error details:", {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                });

                // Capture debug information
                setDebugInfo({
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    timestamp: new Date().toISOString(),
                    userId: user?.id,
                });

                if (error.code === "42P01") {
                    setError(
                        "Database schema not found. Please run the SQL schema updates in Supabase."
                    );
                    return;
                } else if (error.code === "PGRST116") {
                    setError(
                        "Profile table not found. Please ensure the profiles table exists and run the SQL schema updates."
                    );
                    return;
                } else if (error.code === "42501") {
                    setError(
                        "Database permission denied. Please check your Supabase RLS policies and database permissions."
                    );
                    return;
                }

                throw error;
            }

            if (!data) {
                // Profile doesn't exist, create it
                const { error: insertError } = await supabase
                    .from("profiles")
                    .insert({
                        id: user.id,
                        email: user.email,
                        full_name: "",
                        username: "",
                        bio: "",
                    });

                if (insertError) {
                    console.error("Error creating profile:", insertError);
                    setError(
                        "Failed to create profile. Please check database permissions."
                    );
                    return;
                }

                // Fetch the newly created profile
                const { data: newData, error: newError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (newError) throw newError;

                setProfile(newData);
                setFullName(newData.full_name || "");
                setUsername(newData.username || "");
                setBio(newData.bio || "");
            } else {
                setProfile(data);
                setFullName(data.full_name || "");
                setUsername(data.username || "");
                setBio(data.bio || "");
            }
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

    const uploadAvatar = async () => {
        if (!avatarFile || !user) {
            setError("No file selected or user not logged in");
            return;
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
            return;
        }

        if (avatarFile.size > maxSize) {
            setError("File size must be less than 5MB");
            return;
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

            // Upload new avatar
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, avatarFile, {
                    cacheControl: "3600",
                    upsert: false,
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

            console.log("Avatar uploaded successfully, public URL:", publicUrl);

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl })
                .eq("id", user.id);

            if (updateError) {
                console.error("Profile update error:", updateError);
                if (updateError.message?.includes("row-level security")) {
                    throw new Error(
                        "Database permission error: Please check your Supabase RLS policies for the profiles table. " +
                            "Run the RLS fix commands from the troubleshooting guide."
                    );
                }
                throw updateError;
            }

            // Update local state
            setProfile((prev) =>
                prev ? { ...prev, avatar_url: publicUrl } : null
            );
            setAvatarFile(null);
            setAvatarPreview(null);
            setSuccess("Avatar updated successfully!");

            // Reset file input
            const fileInput = document.getElementById(
                "avatar-upload"
            ) as HTMLInputElement;
            if (fileInput) fileInput.value = "";
        } catch (error: any) {
            console.error("Avatar upload error:", error);
            setError(error.message || "Failed to upload avatar");
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
            const updates = {
                full_name: fullName,
                username,
                bio,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", user.id);

            if (error) throw error;

            setProfile((prev) => (prev ? { ...prev, ...updates } : null));
            setSuccess("Profile updated successfully!");

            if (avatarFile) {
                await uploadAvatar();
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            setError("Failed to update profile");
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
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            setSuccess("Password changed successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error("Error changing password:", error);
            setError("Failed to change password");
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
                                <Avatar className="h-24 w-24 border-2 border-border">
                                    <AvatarImage
                                        src={
                                            avatarPreview || profile.avatar_url
                                        }
                                        alt={profile.full_name || "Profile"}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="text-3xl bg-muted">
                                        {profile.full_name
                                            ?.charAt(0)
                                            ?.toUpperCase() ||
                                            profile.email
                                                .charAt(0)
                                                .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col space-y-3">
                                    <div>
                                        <Label
                                            htmlFor="avatar-upload"
                                            className="cursor-pointer"
                                        >
                                            <div className="flex items-center space-x-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors">
                                                <Upload size={16} />
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
    );
}
