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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth.schema";

const RegisterPage = () => {
    const router = useRouter();
    const { signUp } = useAuth();
    const [formData, setFormData] = useState<RegisterInput>({
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setFieldErrors({});

        try {
            const validatedData = registerSchema.parse(formData);
            await signUp(validatedData.email, validatedData.password);
            router.push("/polls");
        } catch (error: any) {
            if (error.errors) {
                const errors: Record<string, string> = {};
                error.errors.forEach((err: any) => {
                    errors[err.path[0]] = err.message;
                });
                setFieldErrors(errors);
            } else {
                setError(error.message || "Failed to create account");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md bg-card">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-foreground">
                        Create Account
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Sign up to create and participate in polls.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="text-sm font-medium text-foreground"
                            >
                                Email
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                placeholder="Enter your email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="border-input bg-background text-foreground"
                            />
                            {fieldErrors.email && (
                                <p className="text-sm text-red-500 dark:text-red-400">
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
                                className="border-input bg-background text-foreground"
                            />
                            {fieldErrors.password && (
                                <p className="text-sm text-red-500 dark:text-red-400">
                                    {fieldErrors.password}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label
                                htmlFor="confirmPassword"
                                className="text-sm font-medium text-foreground"
                            >
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="border-input bg-background text-foreground"
                            />
                            {fieldErrors.confirmPassword && (
                                <p className="text-sm text-red-500 dark:text-red-400">
                                    {fieldErrors.confirmPassword}
                                </p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </Button>
                    </form>
                </CardContent>
            </Card>{" "}
            {/* Added missing closing Card tag */}
        </div>
    );
};

export default RegisterPage;
