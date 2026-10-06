import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-6 border-b border-stone-800">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl md:text-2xl font-bold text-stone-100 tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-stone-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};
