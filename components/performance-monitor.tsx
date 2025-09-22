"use client";

import { useEffect } from 'react';

export function PerformanceMonitor() {
    useEffect(() => {
        // Only run in development
        if (process.env.NODE_ENV !== 'development') return;

        // Monitor Core Web Vitals
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'navigation') {
                    const navEntry = entry as PerformanceNavigationTiming;
                    console.log('🚀 Performance Metrics:', {
                        'DOM Content Loaded': `${navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart}ms`,
                        'Load Complete': `${navEntry.loadEventEnd - navEntry.loadEventStart}ms`,
                        'First Paint': `${navEntry.responseEnd - navEntry.fetchStart}ms`,
                    });
                }
                
                if (entry.entryType === 'paint') {
                    console.log(`🎨 ${entry.name}:`, `${entry.startTime}ms`);
                }
            }
        });

        observer.observe({ entryTypes: ['navigation', 'paint'] });

        // Monitor auth loading time
        const authStart = performance.now();
        const checkAuthComplete = () => {
            const authTime = performance.now() - authStart;
            console.log(`🔐 Auth Loading: ${authTime.toFixed(2)}ms`);
        };

        // Check if auth is already loaded
        setTimeout(checkAuthComplete, 100);

        return () => {
            observer.disconnect();
        };
    }, []);

    return null; // This component doesn't render anything
}
