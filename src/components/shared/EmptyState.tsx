import React from 'react';
import { Button } from '@/src/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  extraActions?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  extraActions,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 bg-stone-900/40 border border-dashed border-stone-800 rounded-2xl max-w-2xl mx-auto my-6">
      {icon && <div className="p-3 bg-stone-800/80 rounded-2xl text-emerald-400 mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-stone-100 mb-1">{title}</h3>
      <p className="text-sm text-stone-400 max-w-md mb-6 leading-relaxed">{description}</p>

      {(primaryAction || secondaryAction || extraActions) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <Button
              variant="primary"
              onClick={primaryAction.onClick}
              icon={primaryAction.icon}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="secondary"
              onClick={secondaryAction.onClick}
              icon={secondaryAction.icon}
            >
              {secondaryAction.label}
            </Button>
          )}
          {extraActions}
        </div>
      )}
    </div>
  );
};
