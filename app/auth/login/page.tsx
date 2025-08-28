"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { useRouter } from "next/navigation";

const LoginPage = () => {
    const router = useRouter();

    // Test user credentials
    const testUser = {
        email: "test@example.com",
        password: "Test@123",
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you would validate credentials here
        // For demo purposes, store email and redirect
        const email = (e.currentTarget as HTMLFormElement).elements.namedItem(
            "email"
        ) as HTMLInputElement;
        localStorage.setItem("userEmail", email.value);
        router.push("/polls");
    };

    return (
        <Card className="w-[350px] mx-auto mt-20">
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                    Enter your credentials to access your account.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            placeholder="Enter your email"
                            type="email"
                            defaultValue={testUser.email}
                            required
                        />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            defaultValue={testUser.password}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full">
                        Sign In
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default LoginPage;
