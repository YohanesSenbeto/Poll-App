"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { User } from "@supabase/supabase-js";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface AuthContextType {
    user: User | null;
    userRole: string | null;
    userProfile: any | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isAdmin: boolean;
    isModerator: boolean;
    hasPermission: (permission: string, resource: string, action: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [supabaseClient] = useState(() => createClientComponentClient());

    // Memoized function to check user role and profile with caching
    const checkUserRoleAndProfile = useCallback(
        async (userId: string): Promise<{ role: string | null; profile: any | null }> => {
            try {
                // Check cache first
                const cacheKey = `user_${userId}`;
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const { role, profile, timestamp } = JSON.parse(cached);
                    // Cache valid for 5 minutes
                    if (Date.now() - timestamp < 5 * 60 * 1000) {
                        return { role, profile };
                    }
                }

                const { data: roleData, error: roleError } = await supabaseClient.rpc(
                    "get_user_role",
                    { user_uuid: userId }
                );

                if (roleError) {
                    console.error("Error checking user role:", roleError);
                    return { role: "user", profile: null };
                }

                const role = roleData || "user";

                // Try to get user profile, but don't fail if it doesn't exist
                const { data: profileData, error: profileError } = await supabaseClient
                    .from('user_profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                let profile = null;
                if (profileError) {
                    // Profile doesn't exist - this is OK, we'll use default values
                    console.log("No profile found for user, using defaults");
                    profile = {
                        id: userId,
                        username: `user_${userId.slice(0, 8)}`,
                        display_name: 'User',
                        avatar_url: null,
                        role: role,
                        is_active: true
                    };
                } else {
                    profile = profileData;
                }

                // Cache the result
                if (typeof window !== "undefined") {
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        role,
                        profile,
                        timestamp: Date.now()
                    }));
                }

                return { role, profile };
            } catch (error) {
                console.error("Exception checking user role and profile:", error);
                return { role: "user", profile: null };
            }
        },
        [supabaseClient]
    );

    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            try {
                const {
                    data: { session },
                } = await supabaseClient.auth.getSession();
                const currentUser = session?.user ?? null;

                if (isMounted) {
                    setUser(currentUser);

                    if (currentUser) {
                        const { role, profile } = await checkUserRoleAndProfile(currentUser.id);
                        setUserRole(role);
                        setUserProfile(profile);
                    } else {
                        setUserRole(null);
                        setUserProfile(null);
                    }
                }
            } catch (error) {
                console.error("Error initializing auth:", error);
                if (isMounted) {
                    setUser(null);
                    setUserRole(null);
                    setUserProfile(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        const {
            data: { subscription },
        } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const { role, profile } = await checkUserRoleAndProfile(currentUser.id);
                setUserRole(role);
                setUserProfile(profile);
            } else {
                setUserRole(null);
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabaseClient, checkUserRoleAndProfile]);

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                console.error("Sign in error:", error.message);
                throw error;
            }
        } catch (error: any) {
            // Add more context to the error for better debugging
            const enhancedError = new Error(
                `Authentication failed: ${error.message || "Unknown error"}`
            );
            throw enhancedError;
        }
    };

    const signUp = async (email: string, password: string) => {
        try {
            const { error } = await supabaseClient.auth.signUp({
                email,
                password,
            });
            if (error) {
                console.error("Sign up error:", error.message);
                throw error;
            }
        } catch (error: any) {
            // Add more context to the error for better debugging
            const enhancedError = new Error(
                `Registration failed: ${error.message || "Unknown error"}`
            );
            throw enhancedError;
        }
    };

    const signOut = async () => {
        try {
            // Clear local state immediately for better UX
            setUser(null);
            setUserRole(null);
            setUserProfile(null);
            
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error("Sign out error:", error.message);
                throw error;
            }
            
            // Clear any cached data
            if (typeof window !== "undefined") {
                localStorage.removeItem('poll-app:lastVotedOptionText');
                // Use window.location.replace for faster navigation (no history entry)
                window.location.replace('/auth/login');
            }
        } catch (error: any) {
            // Add more context to the error for better debugging
            const enhancedError = new Error(
                `Sign out failed: ${error.message || "Unknown error"}`
            );
            throw enhancedError;
        }
    };

    const isAdmin = userRole === "admin";
    const isModerator = userRole === "moderator" || userRole === "admin";

    const hasPermission = async (permission: string, resource: string, action: string): Promise<boolean> => {
        if (!user) return false;
        
        try {
            const { data, error } = await supabaseClient.rpc('user_has_permission', {
                user_uuid: user.id,
                permission_name: permission,
                resource_name: resource,
                action_name: action
            });

            if (error) {
                console.error('Error checking permission:', error);
                return false;
            }

            return data || false;
        } catch (error) {
            console.error('Exception checking permission:', error);
            return false;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                userRole,
                userProfile,
                loading,
                signIn,
                signUp,
                signOut,
                isAdmin,
                isModerator,
                hasPermission,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

