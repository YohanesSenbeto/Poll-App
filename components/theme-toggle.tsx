'use client';

import { useTheme } from '@/app/theme-context';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-foreground">
        {theme === 'light' ? 'Light' : 'Dark'}
      </span>
      <button
        onClick={toggleTheme}
        className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Toggle theme"
      >
        <span className="sr-only">Toggle theme</span>
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
            theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
          }`}
        >
          {theme === 'light' ? (
            <Sun className="h-3 w-3 text-yellow-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          ) : (
            <Moon className="h-3 w-3 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          )}
        </span>
      </button>
    </div>
  );
}