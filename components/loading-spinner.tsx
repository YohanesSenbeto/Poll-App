// components/loading-spinner.tsx
"use client";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/theme-context";

type LoadingSpinnerProps = {
    size?: "sm" | "md" | "lg";
    fullScreen?: boolean;
    className?: string;
    /**
     * Accessible label for screen readers
     * @default "Loading"
     */
    ariaLabel?: string;
};

export default function LoadingSpinner({ 
    size = "md", 
    fullScreen = false,
    className,
    ariaLabel = "Loading"
}: LoadingSpinnerProps) {
    const { theme } = useTheme();
    
    // Define size classes with better contrast borders
    const sizeClasses = {
        sm: "h-5 w-5 border-2",
        md: "h-8 w-8 border-3",
        lg: "h-12 w-12 border-4",
    };

    // Ensure size is valid, fallback to md if not
    const validSize = size in sizeClasses ? size : "md";

    // Enhanced spinner classes with better contrast for both themes
    const spinnerClasses = cn(
        "animate-spin rounded-full shadow-sm",
        theme === "light" 
            ? "border-primary border-r-transparent" 
            : "border-primary border-r-transparent",
        // Add a subtle glow effect based on theme
        theme === "light"
            ? "shadow-blue-200/50"
            : "shadow-blue-500/30",
        sizeClasses[validSize],
        className
    );

    const spinnerElement = (
        <div 
            className={spinnerClasses}
            role="status"
            aria-label={ariaLabel}
        >
            <span className="sr-only">{ariaLabel}</span>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
                <div className="p-6 rounded-lg shadow-lg bg-card">
                    {spinnerElement}
                    <p className="mt-3 text-center text-foreground font-medium">{ariaLabel}</p>
                </div>
            </div>
        );
    }

    return spinnerElement;
}
