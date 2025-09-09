'use client';

import LoadingSpinner from '@/components/loading-spinner';

export default function ResponsiveTest() {
  return (
    <div className="mt-12 mb-20">
      <h2 className="text-2xl font-bold mb-6">Responsive Test</h2>
      
      {/* Light backgrounds */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Light Backgrounds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg flex justify-center items-center h-32">
            <LoadingSpinner size="md" ariaLabel="On white background" />
          </div>
          <div className="bg-gray-100 p-6 rounded-lg flex justify-center items-center h-32">
            <LoadingSpinner size="md" ariaLabel="On light gray background" />
          </div>
          <div className="bg-blue-100 p-6 rounded-lg flex justify-center items-center h-32">
            <LoadingSpinner size="md" ariaLabel="On light blue background" />
          </div>
          <div className="bg-yellow-100 p-6 rounded-lg flex justify-center items-center h-32">
            <LoadingSpinner size="md" ariaLabel="On light yellow background" />
          </div>
        </div>
      </div>
      
      {/* Dark backgrounds */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Dark Backgrounds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-6 rounded-lg flex justify-center items-center h-32">
            <LoadingSpinner size="md" ariaLabel="On dark gray background" />
          </div>
          <div className="bg-blue-800 p-6 rounded-lg flex justify-center items-center h-32">
            <LoadingSpinner size="md" ariaLabel="On dark blue background" />
          </div>
          <div className="bg-black p-6 rounded-lg flex justify-center items-center h-32">
            <LoadingSpinner size="md" ariaLabel="On black background" />
          </div>
          <div className="bg-purple-800 p-6 rounded-lg flex justify-center items-center h-32">
            <LoadingSpinner size="md" ariaLabel="On purple background" />
          </div>
        </div>
      </div>
      
      {/* Mobile responsiveness test */}
      <div className="mt-12">
        <h3 className="text-xl font-semibold mb-4">Mobile Responsiveness</h3>
        <div className="border border-dashed border-gray-400 p-4 rounded-lg">
          <div className="max-w-[320px] mx-auto bg-card p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="h-6 w-24 bg-muted rounded"></div>
              <LoadingSpinner size="sm" ariaLabel="Mobile spinner" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-4/6"></div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">Mobile (320px) view simulation</p>
        </div>
      </div>
    </div>
  );
}