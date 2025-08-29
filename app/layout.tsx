import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth-context";
import { Navbar } from "@/app/navbar";
import { NotificationContainer } from "@/components/ui/notification";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <AuthProvider>
                    <Navbar />
                    <NotificationContainer />
                    <main className="container py-8">{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
