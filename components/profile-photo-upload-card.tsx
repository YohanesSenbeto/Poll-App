"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, X, User } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface ProfilePhotoUploadCardProps {
    isOpen: boolean;
    onClose: () => void;
    position?: { x: number; y: number };
}

export function ProfilePhotoUploadCard({ isOpen, onClose, position }: ProfilePhotoUploadCardProps) {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const supabase = createClientComponentClient();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Close card when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            setError("Please select a valid image file (JPEG, PNG, or WebP)");
            return;
        }

        if (file.size > maxSize) {
            setError("File size must be less than 5MB");
            return;
        }

        setError(null);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            // Verify user session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error("User session is invalid. Please log in again.");
            }

            // Generate file path
            const fileExt = file.name.split(".").pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: true,
                    contentType: file.type || "image/*",
                });

            if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

            // Update profile
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ avatar_url: publicUrl } as any)
                .eq('id', user.id);

            if (updateError) {
                throw new Error(`Failed to save avatar: ${updateError.message}`);
            }

            // Refresh user profile
            await refreshUserProfile();
            
            setSuccess("Profile photo updated successfully!");
            setPreview(null);
            
            // Close after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error: any) {
            setError(error.message || "Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (!user) return;

        setUploading(true);
        setError(null);

        try {
            // Remove from storage if exists
            if (userProfile?.avatar_url) {
                const oldPath = userProfile.avatar_url.split("/").pop();
                if (oldPath) {
                    const oldFilePath = `${user.id}/${oldPath}`;
                    await supabase.storage.from("avatars").remove([oldFilePath]);
                }
            }

            // Update profile to remove avatar
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ avatar_url: null } as any)
                .eq('id', user.id);

            if (updateError) {
                throw new Error(`Failed to remove avatar: ${updateError.message}`);
            }

            // Refresh user profile
            await refreshUserProfile();
            
            setSuccess("Profile photo removed successfully!");
            setPreview(null);
            
            // Close after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error: any) {
            setError(error.message || "Failed to remove photo");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    const cardStyle = position ? {
        position: 'fixed' as const,
        top: position.y - 10,
        left: position.x - 200,
        zIndex: 1000,
    } : {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <Card 
                ref={cardRef}
                className="w-80 mx-4 shadow-xl"
                style={cardStyle}
            >
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Update Profile Photo</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Current Avatar Preview */}
                    <div className="flex flex-col items-center mb-6">
                        <Avatar className="h-24 w-24 mb-3">
                            {preview ? (
                                <AvatarImage src={preview} alt="Preview" />
                            ) : (
                                <>
                                    {(userProfile as any)?.avatar_url && (
                                        <AvatarImage 
                                            src={(userProfile as any).avatar_url} 
                                            alt="Current avatar" 
                                        />
                                    )}
                                    <AvatarFallback className="bg-primary text-white text-2xl">
                                        {user?.email?.charAt(0).toUpperCase() || "U"}
                                    </AvatarFallback>
                                </>
                            )}
                        </Avatar>
                        
                        <p className="text-sm text-muted-foreground text-center">
                            {preview ? "Preview of new photo" : "Current profile photo"}
                        </p>
                    </div>

                    {/* File Input */}
                    <div className="space-y-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                            variant="outline"
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Choose Photo
                        </Button>

                        {preview && (
                            <Button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="w-full"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {uploading ? "Uploading..." : "Upload Photo"}
                            </Button>
                        )}

                        {(userProfile as any)?.avatar_url && !preview && (
                            <Button
                                onClick={handleRemovePhoto}
                                disabled={uploading}
                                variant="destructive"
                                className="w-full"
                            >
                                <X className="h-4 w-4 mr-2" />
                                {uploading ? "Removing..." : "Remove Photo"}
                            </Button>
                        )}

                        {/* Status Messages */}
                        {error && (
                            <div className="text-sm text-destructive text-center">
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="text-sm text-green-600 text-center">
                                {success}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
