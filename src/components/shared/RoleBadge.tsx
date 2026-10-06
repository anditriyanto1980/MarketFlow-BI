import React from 'react';
import type { UserRole } from '@/src/types/auth';
import { ROLE_DESCRIPTIONS } from '@/src/lib/auth/permissions';

export const RoleBadge: React.FC<{ role: UserRole | null | undefined; showDescriptionTooltip?: boolean }> = ({
  role,
}) => {
  if (!role) return null;
  const config = ROLE_DESCRIPTIONS[role] || {
    label: role,
    badgeColor: 'bg-stone-800 text-stone-300 border-stone-700',
  };

  return (
    <span
      title={config.description}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeColor}`}
    >
      {config.label}
    </span>
  );
};
