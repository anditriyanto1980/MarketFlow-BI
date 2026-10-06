import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  icon,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-[#0F5132] text-white hover:bg-[#0c4028] shadow-xs active:bg-[#093220]',
    secondary: 'bg-stone-800 text-stone-100 hover:bg-stone-700 active:bg-stone-900 border border-stone-700',
    outline: 'border border-stone-700 text-stone-200 bg-transparent hover:bg-stone-800/60 active:bg-stone-800',
    ghost: 'text-stone-300 hover:bg-stone-800/50 hover:text-white',
    destructive: 'bg-red-800 text-white hover:bg-red-700 active:bg-red-900 shadow-xs',
  };

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};
