import { UserRole, Permission } from '@/src/types/auth';

export const ROLE_PERMISSIONS: Record<UserRole, Record<Permission, boolean>> = {
  OWNER: {
    VIEW_DASHBOARD: true,
    VIEW_SALES: true,
    VIEW_PROFIT: true,
    MANAGE_PRODUCTS: true,
    MANAGE_HPP: true,
    MANAGE_STORES: true,
    IMPORT_DATA: true,
    RECONCILIATION: true,
    MANAGE_TEAM: true,
    BUSINESS_SETTINGS: true,
  },
  ADMIN: {
    VIEW_DASHBOARD: true,
    VIEW_SALES: true,
    VIEW_PROFIT: true,
    MANAGE_PRODUCTS: true,
    MANAGE_HPP: true,
    MANAGE_STORES: true,
    IMPORT_DATA: true,
    RECONCILIATION: true,
    MANAGE_TEAM: true,
    BUSINESS_SETTINGS: true, // Limited in UI
  },
  FINANCE: {
    VIEW_DASHBOARD: true,
    VIEW_SALES: true,
    VIEW_PROFIT: true,
    MANAGE_PRODUCTS: false,
    MANAGE_HPP: true,
    MANAGE_STORES: false,
    IMPORT_DATA: true,
    RECONCILIATION: true,
    MANAGE_TEAM: false,
    BUSINESS_SETTINGS: false,
  },
  MANAGER: {
    VIEW_DASHBOARD: true,
    VIEW_SALES: true,
    VIEW_PROFIT: true,
    MANAGE_PRODUCTS: true,
    MANAGE_HPP: false,
    MANAGE_STORES: false,
    IMPORT_DATA: true,
    RECONCILIATION: true,
    MANAGE_TEAM: false,
    BUSINESS_SETTINGS: false,
  },
  VIEWER: {
    VIEW_DASHBOARD: true,
    VIEW_SALES: true,
    VIEW_PROFIT: false,
    MANAGE_PRODUCTS: false,
    MANAGE_HPP: false,
    MANAGE_STORES: false,
    IMPORT_DATA: false,
    RECONCILIATION: false,
    MANAGE_TEAM: false,
    BUSINESS_SETTINGS: false,
  },
};

export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export const ROLE_DESCRIPTIONS: Record<UserRole, { label: string; badgeColor: string; description: string }> = {
  OWNER: {
    label: 'Owner',
    badgeColor: 'bg-emerald-950 text-emerald-200 border-emerald-800',
    description: 'Akses penuh ke seluruh pengaturan, keuangan, HPP, tim, dan bisnis.',
  },
  ADMIN: {
    label: 'Admin',
    badgeColor: 'bg-blue-950 text-blue-200 border-blue-800',
    description: 'Manajemen operasional toko, produk, HPP, dan manajemen anggota tim.',
  },
  FINANCE: {
    label: 'Finance',
    badgeColor: 'bg-amber-950 text-amber-200 border-amber-800',
    description: 'Akses laporan keuangan, HPP produk, rekonsiliasi settlement, dan profit.',
  },
  MANAGER: {
    label: 'Manager',
    badgeColor: 'bg-indigo-950 text-indigo-200 border-indigo-800',
    description: 'Manajemen katalog produk, impor transaksi, dan analisis performa.',
  },
  VIEWER: {
    label: 'Viewer',
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    description: 'Hak akses baca terbatas untuk ringkasan operasional bisnis.',
  },
};
