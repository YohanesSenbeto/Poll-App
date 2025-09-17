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
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [supabaseClient] = useState(() => createClientComponentClient());

    // Memoized function to check user role
    const checkUserRole = useCallback(
        async (userId: string): Promise<string | null> => {
            try {
                const { data, error } = await supabaseClient.rpc(
                    "get_user_role",
                    { user_id: userId }
                );

                if (error) {
                    console.error("Error checking user role:", error);
                    return "user";
                }

                return data || "user";
            } catch (error) {
                console.error("Exception checking user role:", error);
                return "user";
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
                        const role = await checkUserRole(currentUser.id);
                        setUserRole(role);
                    } else {
                        setUserRole(null);
                    }
                }
            } catch (error) {
                console.error("Error initializing auth:", error);
                if (isMounted) {
                    setUser(null);
                    setUserRole(null);
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
                const role = await checkUserRole(currentUser.id);
                setUserRole(role);
            } else {
                setUserRole(null);
            }

            setLoading(false);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabaseClient, checkUserRole]);

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
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error("Sign out error:", error.message);
                throw error;
            }
            // Redirect to login page after successful sign out
            if (typeof window !== "undefined") {
                window.location.href = "/auth/login";
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

    return (
        <AuthContext.Provider
            value={{
                user,
                userRole,
                loading,
                signIn,
                signUp,
                signOut,
                isAdmin,
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

