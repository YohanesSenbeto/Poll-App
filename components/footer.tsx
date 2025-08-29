import Link from "next/link";
import {
    Github,
    Linkedin,
    Facebook,
    Send,
    Youtube,
    Twitter,
    Instagram,
} from "lucide-react";

const socialLinks = [
    {
        name: "GitHub",
        url: "https://github.com/YohanesSenbeto",
        icon: Github,
    },
    {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/yohanes-senbeto-61833218a",
        icon: Linkedin,
    },

    {
        name: "Telegram",
        url: "https://t.me/YohTechSolutions",
        icon: Send,
    },
    {
        name: "YouTube",
        url: "https://www.youtube.com/@Yoh-Tech-Solutions",
        icon: Youtube,
    },
    {
        name: "X (Twitter)",
        url: "https://x.com/YohanesSenbeto?t=XGudVyYnkdss3xidqoI4fQ&s=09",
        icon: Twitter,
    },
    {
        name: "Instagram",
        url: "https://www.instagram.com/joni_senbeto?igsh=MXhsNGs2dmlvZHluYg==",
        icon: Instagram,
    },
];

export function Footer() {
    return (
        <footer className="border-t bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center space-y-4">
                    <div className="flex space-x-4">
                        {socialLinks.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label={link.name}
                                >
                                    <Icon className="h-6 w-6" />
                                </Link>
                            );
                        })}
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} Poll App. Built with
                            Next.js and Supabase.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Create, share, and vote on polls with ease.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
