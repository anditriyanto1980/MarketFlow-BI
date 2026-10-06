import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    default: 'bg-stone-800 text-stone-300 border-stone-700',
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    danger: 'bg-red-950/80 text-red-300 border-red-800/80',
    info: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
    outline: 'bg-transparent text-stone-300 border-stone-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
