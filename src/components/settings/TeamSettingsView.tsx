import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Shield, Check, X as XIcon, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { hasPermission } from '@/src/lib/auth/permissions';
import { getBusinessMembers, addMemberToBusiness } from '@/src/services/business.service';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { Dialog } from '@/src/components/ui/dialog';
import { Card, CardHeader } from '@/src/components/ui/card';
import { RoleBadge } from '@/src/components/shared/RoleBadge';
import { StatusBadge } from '@/src/components/shared/StatusBadge';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { formatDate } from '@/src/utils/dates';
import { getReadableErrorMessage } from '@/src/utils/errors';
import type { BusinessMember, UserRole } from '@/src/types/auth';

export const TeamSettingsView: React.FC = () => {
  const { currentBusiness, currentRole, currentUser } = useAuth();
  const canManageTeam = hasPermission(currentRole, 'MANAGE_TEAM');

  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('MANAGER');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const data = await getBusinessMembers(currentBusiness.id);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setFormError('Masukkan alamat email yang valid.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      // Deterministic ID from email for invited user placeholder
      const generatedId = `invited_${inviteEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

      await addMemberToBusiness(
        currentBusiness.id,
        currentUser.uid,
        generatedId,
        inviteEmail.trim(),
        inviteName.trim() || inviteEmail.split('@')[0],
        inviteRole
      );

      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      await loadMembers();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Tim & Hak Akses (RBAC)"
        subtitle="Kelola anggota organisasi dan terapkan batasan peran operasional, finansial, dan pengawasan."
        actions={
          canManageTeam ? (
            <Button
              variant="primary"
              onClick={() => {
                setFormError(null);
                setIsInviteModalOpen(true);
              }}
              icon={<UserPlus className="w-4 h-4" />}
            >
              Undang Anggota Tim
            </Button>
          ) : (
            <div className="text-xs text-stone-500 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Hanya Owner & Admin yang dapat mengelola tim</span>
            </div>
          )
        }
      />

      {/* Members Table Card */}
      <Card>
        <CardHeader
          title="Daftar Anggota Bisnis"
          subtitle={`Total: ${members.length} anggota dengan akses ke workspace ${currentBusiness?.name}`}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Pengguna</th>
                <th className="px-4 py-3 font-semibold">Peran (Role)</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Tanggal Bergabung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 text-stone-200">
              {members.map((m) => (
                <tr key={m.userId} className="hover:bg-stone-800/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-stone-100">
                      {m.userDisplayName || m.userId}
                    </div>
                    {m.userEmail && (
                      <div className="text-[11px] text-stone-400 font-mono">{m.userEmail}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <RoleBadge role={m.role} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3.5 text-stone-400">
                    {formatDate(m.joinedAt || m.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Permission Matrix Card (Section 22 Mandate) */}
      <Card>
        <CardHeader
          title="Matriks Wewenang & Hak Akses Peran (Permission Matrix)"
          subtitle="Standar keamanan ABAC MarketFlow BI yang diterapkan di tingkat database Firestore Security Rules."
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-stone-800">
            <thead className="bg-stone-950 text-stone-300 border-b border-stone-800">
              <tr>
                <th className="p-3 font-semibold">Hak Akses / Modul</th>
                <th className="p-3 text-center font-semibold text-emerald-400">OWNER</th>
                <th className="p-3 text-center font-semibold text-blue-400">ADMIN</th>
                <th className="p-3 text-center font-semibold text-amber-400">FINANCE</th>
                <th className="p-3 text-center font-semibold text-indigo-400">MANAGER</th>
                <th className="p-3 text-center font-semibold text-stone-400">VIEWER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {[
                { label: 'View Dashboard', owner: true, admin: true, fin: true, mgr: true, view: true },
                { label: 'View Sales', owner: true, admin: true, fin: true, mgr: true, view: true },
                { label: 'View Profit & Margin', owner: true, admin: true, fin: true, mgr: true, view: 'LIMITED' },
                { label: 'Manage Products & Catalog', owner: true, admin: true, fin: false, mgr: true, view: false },
                { label: 'Manage HPP & Cost Structures', owner: true, admin: true, fin: true, mgr: false, view: false },
                { label: 'Manage Stores & Marketplace Channels', owner: true, admin: true, fin: false, mgr: false, view: false },
                { label: 'Import Marketplace Data', owner: true, admin: true, fin: true, mgr: true, view: false },
                { label: 'Settlement Reconciliation', owner: true, admin: true, fin: true, mgr: true, view: 'VIEW' },
                { label: 'Manage Team & Memberships', owner: true, admin: true, fin: false, mgr: false, view: false },
                { label: 'Business & Workspace Settings', owner: true, admin: 'LIMITED', fin: false, mgr: false, view: false },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-800/20">
                  <td className="p-3 font-medium text-stone-200">{row.label}</td>
                  <td className="p-3 text-center font-bold text-emerald-400">
                    {renderPermissionValue(row.owner)}
                  </td>
                  <td className="p-3 text-center font-bold text-blue-400">
                    {renderPermissionValue(row.admin)}
                  </td>
                  <td className="p-3 text-center font-bold text-amber-400">
                    {renderPermissionValue(row.fin)}
                  </td>
                  <td className="p-3 text-center font-bold text-indigo-400">
                    {renderPermissionValue(row.mgr)}
                  </td>
                  <td className="p-3 text-center font-bold text-stone-400">
                    {renderPermissionValue(row.view)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Undang Anggota Tim Baru"
        description="Berikan akses kolaborasi dengan peran yang sesuai kebutuhan operasional."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Alamat Email Anggota"
            type="email"
            placeholder="nama@perusahaan.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <Input
            label="Nama Lengkap / Panggilan (Opsional)"
            type="text"
            placeholder="Contoh: Rina Finance"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />

          <Select
            label="Pilih Peran (Role)"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            options={[
              { value: 'ADMIN', label: 'Admin (Operasional Toko, Produk, HPP & Anggota)' },
              { value: 'FINANCE', label: 'Finance (Akses Finansial, HPP & Rekonsiliasi)' },
              { value: 'MANAGER', label: 'Manager (Katalog Produk & Analisis Transaksi)' },
              { value: 'VIEWER', label: 'Viewer (Hanya Baca Ringkasan)' },
            ]}
          />

          <div className="pt-3 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Simpan & Beri Akses
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

function renderPermissionValue(val: boolean | string) {
  if (val === true) {
    return <span className="inline-flex items-center text-emerald-400">YES</span>;
  }
  if (val === false) {
    return <span className="inline-flex items-center text-stone-500">NO</span>;
  }
  return <span className="inline-flex items-center text-amber-300 text-[11px] font-semibold">{val}</span>;
}
