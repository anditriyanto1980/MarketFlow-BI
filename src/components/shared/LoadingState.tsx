import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string; fullScreen?: boolean }> = ({
  message = 'Memuat data...',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      <p className="text-sm text-stone-400 font-medium">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-stone-950">
        {content}
      </div>
    );
  }

  return content;
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-stone-800/80 rounded-md ${className}`} />;
};
