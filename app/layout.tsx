import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeProvider>
                    <AuthProvider>
                        <Navbar />
                        <NotificationContainer />
                        <main className="container py-8 min-h-[calc(100vh-200px)]">
                            {children}
                        </main>
                        <Footer />
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
