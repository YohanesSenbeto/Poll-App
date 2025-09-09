'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/loading-spinner';
import { useTheme } from '@/app/theme-context';
import ResponsiveTest from './responsive-test';

export default function SpinnerTestPage() {
  const { theme, toggleTheme } = useTheme();
  const [showFullScreen, setShowFullScreen] = useState(false);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">LoadingSpinner Test Page</h1>
      
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1 p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Current Theme: {theme}</h2>
          <button 
            onClick={toggleTheme}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Toggle Theme
          </button>
        </div>
        
        <div className="flex-1 p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Full Screen Spinner</h2>
          <button 
            onClick={() => {
              setShowFullScreen(true);
              setTimeout(() => setShowFullScreen(false), 3000);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Show for 3 seconds
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Small Spinner</h2>
          <div className="flex justify-center items-center h-20">
            <LoadingSpinner size="sm" ariaLabel="Small spinner" />
          </div>
        </div>
        
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Medium Spinner</h2>
          <div className="flex justify-center items-center h-20">
            <LoadingSpinner size="md" ariaLabel="Medium spinner" />
          </div>
        </div>
        
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Large Spinner</h2>
          <div className="flex justify-center items-center h-20">
            <LoadingSpinner size="lg" ariaLabel="Large spinner" />
          </div>
        </div>
      </div>
      
      <ResponsiveTest />
      
      {showFullScreen && (
        <LoadingSpinner fullScreen ariaLabel="Loading content..." />
      )}
    </div>
  );
}