import { ReactNode } from 'react';

interface ModeratorLayoutProps {
  children: ReactNode;
}

export default function ModeratorLayout({ children }: ModeratorLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto">
        {children}
      </div>
    </div>
  );
}
