import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-stone-900/90 border border-stone-800/80 rounded-xl p-5 shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:border-stone-700 hover:bg-stone-900' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`flex items-start justify-between pb-4 border-b border-stone-800/80 mb-4 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-stone-100">{title}</h3>
        {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
