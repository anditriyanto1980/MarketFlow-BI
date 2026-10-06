import React from 'react';
import { useAuth } from './auth-context';
import { hasPermission } from './permissions';
import type { Permission, UserRole } from '@/src/types/auth';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredPermission,
  allowedRoles,
  fallback,
}) => {
  const { currentRole, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="p-8 text-center bg-stone-900/40 rounded-xl border border-stone-800">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-stone-200">Akses Dibatasi</h3>
        <p className="text-sm text-stone-400 mt-1 max-w-md mx-auto">
          Peran Anda ({currentRole}) tidak memiliki wewenang untuk membuka modul ini.
        </p>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(currentRole, requiredPermission)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="p-8 text-center bg-stone-900/40 rounded-xl border border-stone-800">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-stone-200">Izin Tidak Memadai</h3>
        <p className="text-sm text-stone-400 mt-1 max-w-md mx-auto">
          Fitur ini memerlukan izin khusus ({requiredPermission}). Silakan hubungi Owner atau Admin bisnis Anda.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
