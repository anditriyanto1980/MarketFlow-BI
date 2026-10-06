import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, prefixText, className = '', id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(7);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-stone-300">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixText && (
            <span className="absolute left-3 text-sm text-stone-500 font-medium select-none">
              {prefixText}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-lg bg-stone-900 border ${
              error ? 'border-red-500 focus:ring-red-500' : 'border-stone-800 focus:border-emerald-600 focus:ring-emerald-700'
            } px-3 py-2 text-sm text-stone-100 placeholder-stone-500 shadow-xs focus:outline-none focus:ring-1 transition-all ${
              prefixText ? 'pl-9' : ''
            } disabled:opacity-50 disabled:bg-stone-950 ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="text-xs text-stone-400">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
