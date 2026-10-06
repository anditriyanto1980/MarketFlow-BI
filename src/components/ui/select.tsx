import React from 'react';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', id, ...props }, ref) => {
    const selectId = id || props.name || Math.random().toString(36).substring(7);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-stone-300">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full rounded-lg bg-stone-900 border ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-stone-800 focus:border-emerald-600 focus:ring-emerald-700'
          } px-3 py-2 text-sm text-stone-100 shadow-xs focus:outline-none focus:ring-1 transition-all disabled:opacity-50 disabled:bg-stone-950 ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-stone-900 text-stone-100">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="text-xs text-stone-400">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
