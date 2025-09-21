import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./auth-context";
import { Navbar } from "@/app/navbar";
import { NotificationContainer } from "@/components/ui/notification";
import { ThemeProvider } from "./theme-context";
import { Footer } from "@/components/footer";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

// Skip Links Component
function SkipLinks() {
    return (
        <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-0 focus-within:left-0 focus-within:z-50">
            <div className="bg-background border border-border rounded-md p-2 shadow-lg">
                <a
                    href="#main-content"
                    className="block px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    Skip to main content
                </a>
            </div>
        </div>
    );
}

export const metadata: Metadata = {
    title: "Poll App",
    description: "Create and vote on polls",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
            >
                <SkipLinks />
                <ThemeProvider>
                    <AuthProvider>
                        <Navbar />
                        <NotificationContainer />
                        <main id="main-content" className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 min-h-[calc(100vh-200px)]">
                            {children}
                        </main>
                        <Footer />
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
