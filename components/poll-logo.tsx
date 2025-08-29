import React from 'react';

export function PollLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Violet Circle Background */}
      <circle cx="12" cy="12" r="10" className="fill-violet-500" />
      
      {/* Ballot Box */}
      <rect x="5" y="10" width="14" height="8" rx="1" className="fill-white" />
      
      {/* Box Opening */}
      <rect x="8" y="8" width="8" height="1" rx="0.5" className="fill-white/90" />
      
      {/* Ballot Paper */}
      <rect x="11" y="4" width="2" height="4" rx="0.5" className="fill-white" />
      
      {/* Checkmarks on ballot */}
      <path d="M11.5 5.5L11.8 6L12.2 5.8" stroke="currentColor" strokeWidth="0.3" className="stroke-violet-500" />
      <path d="M11.5 7L11.8 7.5L12.2 7.3" stroke="currentColor" strokeWidth="0.3" className="stroke-violet-500" />
    </svg>
  );
}