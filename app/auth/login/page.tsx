"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth.schema";
import { notificationManager } from "@/lib/utils/notifications";
import LoadingSpinner from "@/components/loading-spinner";

const LoginPage = () => {
    const router = useRouter();
    const { signIn } = useAuth();
    const [formData, setFormData] = useState<LoginInput>({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFieldErrors({});

        try {
            // Trim inputs to prevent whitespace-related issues
            const trimmedData = {
                email: formData.email.trim(),
                password: formData.password
            };
            
            const validatedData = loginSchema.parse(trimmedData);
            await signIn(validatedData.email, validatedData.password);

            // Use addNotification with proper parameters
            notificationManager.addNotification({
                type: "success",
                title: "Login Successful",
                message: "Welcome back!",
                duration: 5000,
            });

            // Validate and sanitize redirect URL to prevent open redirect vulnerabilities
            const searchParams = new URLSearchParams(window.location.search);
            let redirectTo = searchParams.get("redirectTo") || "/polls";
            
            // Ensure redirect URL is relative to prevent open redirect attacks
            if (redirectTo.startsWith("//") || redirectTo.includes(":")) {
                redirectTo = "/polls"; // Default safe path
            }

            router.push(redirectTo);
        } catch (error: any) {
            if (error.errors) {
                // Handle Zod validation errors
                const errors: Record<string, string> = {};
                error.errors.forEach((err: any) => {
                    if (err.path && err.path[0]) {
                        errors[err.path[0]] = err.message;
                    }
                });
                setFieldErrors(errors);
            } else {
                // Use addNotification with proper parameters
                // Don't expose detailed error messages to users
                notificationManager.addNotification({
                    type: "error",
                    title: "Login Failed",
                    message: "Invalid email or password. Please try again.",
                    duration: 5000,
                });
                
                // Log actual error for debugging (but not to the user)
                console.error("Login error:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md bg-card">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold text-foreground">
                        Welcome Back
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Enter your credentials to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="text-sm font-medium text-foreground"
                            >
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                placeholder="Enter your email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {fieldErrors.email && (
                                <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="password"
                                className="text-sm font-medium text-foreground"
                            >
                                Password
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {fieldErrors.password && (
                                <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                                    {fieldErrors.password}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <LoadingSpinner size="sm" className="border-white mr-2" />
                                    Signing In...
                                </div>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <a
                                href="/auth/register"
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                            >
                                Create one here
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LoginPage;
