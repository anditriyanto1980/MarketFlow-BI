import React, { useState, useEffect, useCallback } from 'react';
import { Building, ShieldCheck, Clock, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { hasPermission } from '@/src/lib/auth/permissions';
import { updateBusiness } from '@/src/services/business.service';
import { getAuditLogs } from '@/src/services/audit.service';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { Card, CardHeader } from '@/src/components/ui/card';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { formatDateTime } from '@/src/utils/dates';
import { getReadableErrorMessage } from '@/src/utils/errors';
import type { BusinessType } from '@/src/types/business';
import type { AuditLog } from '@/src/types/common';

export const BusinessSettingsView: React.FC = () => {
  const { currentBusiness, currentRole, currentUser, refreshBusiness } = useAuth();
  const canEditSettings = hasPermission(currentRole, 'BUSINESS_SETTINGS');

  const [businessName, setBusinessName] = useState(currentBusiness?.name || '');
  const [businessType, setBusinessType] = useState<BusinessType>(currentBusiness?.businessType || 'UMKM');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      setBusinessName(currentBusiness.name);
      setBusinessType(currentBusiness.businessType);
    }
  }, [currentBusiness]);

  const loadLogs = useCallback(async () => {
    if (!currentBusiness) return;
    setIsLoadingLogs(true);
    try {
      const logs = await getAuditLogs(currentBusiness.id, 20);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!businessName.trim() || businessName.trim().length < 2) {
      setError('Nama bisnis minimal 2 karakter.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await updateBusiness(currentBusiness.id, currentUser.uid, {
        name: businessName.trim(),
        businessType,
      });
      await refreshBusiness();
      await loadLogs();
      setSuccess('Pengaturan profil bisnis berhasil diperbarui.');
    } catch (err) {
      setError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Pengaturan Bisnis & Workspace"
        subtitle="Kelola parameter dasar organisasi, zona waktu pelaporan, dan riwayat audit keamanan."
      />

      {/* Main Settings Card */}
      <Card>
        <CardHeader
          title="Profil Organisasi"
          subtitle="Identitas tenant bisnis di MarketFlow BI."
        />

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/70 border border-emerald-800/80 flex items-start gap-2 text-xs text-emerald-300">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSaveBusiness} className="space-y-4">
          <Input
            label="Nama Bisnis / Brand"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            disabled={!canEditSettings}
            required
          />

          <Select
            label="Jenis Badan Usaha"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value as BusinessType)}
            disabled={!canEditSettings}
            options={[
              { value: 'UMKM', label: 'UMKM (Usaha Mikro, Kecil & Menengah)' },
              { value: 'ONLINE_SELLER', label: 'Online Seller / Reseller' },
              { value: 'RETAIL', label: 'Retail & Store' },
              { value: 'DISTRIBUTOR', label: 'Distributor / Grosir' },
              { value: 'OTHER', label: 'Lainnya' },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Mata Uang Baku"
              value="IDR — Rupiah Indonesia"
              disabled
              helperText="Terkunci untuk pasar Indonesia"
            />
            <Input
              label="Zona Waktu Baku"
              value="Asia/Jakarta (WIB)"
              disabled
              helperText="Standar penutupan transaksi harian"
            />
          </div>

          {canEditSettings ? (
            <div className="pt-3 flex justify-end">
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Simpan Perubahan
              </Button>
            </div>
          ) : (
            <div className="pt-2 text-xs text-stone-500 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Hanya Owner yang dapat mengubah pengaturan bisnis.</span>
            </div>
          )}
        </form>
      </Card>

      {/* Security Audit Trail Card */}
      <Card>
        <CardHeader
          title="Riwayat Audit Aktivitas (Audit Logs)"
          subtitle="Catatan jejak aktivitas penting yang disimpan secara immutable pada Firestore."
        />

        {isLoadingLogs ? (
          <div className="py-4 text-center text-xs text-stone-500">Memuat log...</div>
        ) : auditLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-500 italic">
            Belum ada catatan aktivitas tambahan.
          </div>
        ) : (
          <div className="divide-y divide-stone-800/80 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-stone-200">{log.action}</span>
                  {log.entityType && (
                    <span className="text-stone-400 ml-2">
                      ({log.entityType} {log.entityId ? `ID: ${log.entityId.slice(0, 8)}...` : ''})
                    </span>
                  )}
                </div>
                <div className="text-stone-400 text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(log.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
