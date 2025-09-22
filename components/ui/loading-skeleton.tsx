import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LoadingSkeletonProps {
    className?: string;
    lines?: number;
}

export function LoadingSkeleton({ className = "", lines = 3 }: LoadingSkeletonProps) {
    return (
        <div className={`animate-pulse ${className}`}>
            <div className="space-y-3">
                {Array.from({ length: lines }).map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded w-full"></div>
                ))}
            </div>
        </div>
    );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
    return (
        <Card className={className}>
            <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                    <div className="h-4 bg-muted rounded w-4/6"></div>
                </div>
            </CardContent>
        </Card>
    );
}

export function PollCardSkeleton() {
    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="h-6 bg-muted rounded w-full mb-2 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
                    <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
                </div>
            </CardContent>
        </Card>
    );
}
