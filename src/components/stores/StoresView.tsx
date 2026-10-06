import React, { useState, useEffect, useCallback } from 'react';
import { Store as StoreIcon, Plus, ExternalLink, AlertCircle, Edit2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { hasPermission } from '@/src/lib/auth/permissions';
import { getStores, createStore, updateStore } from '@/src/services/store.service';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { Dialog } from '@/src/components/ui/dialog';
import { StatusBadge } from '@/src/components/shared/StatusBadge';
import { EmptyState } from '@/src/components/shared/EmptyState';
import { Skeleton } from '@/src/components/shared/LoadingState';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { formatDate } from '@/src/utils/dates';
import { getReadableErrorMessage } from '@/src/utils/errors';
import type { Store, MarketplaceCode, StoreStatus } from '@/src/types/store';

export const StoresView: React.FC = () => {
  const { currentBusiness, currentRole, currentUser } = useAuth();
  const canManageStores = hasPermission(currentRole, 'MANAGE_STORES');

  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);

  // Form states
  const [marketplace, setMarketplace] = useState<MarketplaceCode>('SHOPEE');
  const [storeName, setStoreName] = useState('');
  const [externalStoreId, setExternalStoreId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStores = useCallback(async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const data = await getStores(currentBusiness.id);
      setStores(data);
    } catch (err) {
      console.error('Failed to load stores:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!storeName.trim() || storeName.trim().length < 2) {
      setFormError('Nama toko minimal 2 karakter.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await createStore(currentBusiness.id, currentUser.uid, {
        marketplace,
        storeName: storeName.trim(),
        externalStoreId: externalStoreId.trim() || undefined,
      });
      setIsAddModalOpen(false);
      setStoreName('');
      setExternalStoreId('');
      await loadStores();
    } catch (err: unknown) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStoreStatus = async (newStatus: StoreStatus) => {
    if (!currentBusiness || !currentUser || !editStore) return;
    setIsSubmitting(true);
    try {
      await updateStore(currentBusiness.id, editStore.id, currentUser.uid, {
        status: newStatus,
      });
      setEditStore(null);
      await loadStores();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMarketplaceBadge = (code: MarketplaceCode) => {
    switch (code) {
      case 'SHOPEE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#EE4D2D]/20 text-[#FF6E40] border border-[#EE4D2D]/40">
            Shopee
          </span>
        );
      case 'TIKTOK':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-stone-800 text-stone-200 border border-stone-700">
            TikTok Shop
          </span>
        );
      case 'TOKOPEDIA':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#42B549]/20 text-[#5ee067] border border-[#42B549]/40">
            Tokopedia
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Toko Marketplace"
        subtitle="Kelola saluran penjualan online yang terintegrasi dengan workspace Anda."
        actions={
          canManageStores ? (
            <Button
              variant="primary"
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Tambah Toko Baru
            </Button>
          ) : (
            <div className="text-xs text-stone-500 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Hanya Owner & Admin yang dapat mengelola toko</span>
            </div>
          )
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : stores.length === 0 ? (
        <EmptyState
          icon={<StoreIcon className="w-10 h-10 text-emerald-400" />}
          title="Belum ada toko yang terhubung"
          description="Tambahkan toko marketplace pertama Anda (Shopee, TikTok Shop, atau Tokopedia) untuk mulai mengonsolidasi transaksi."
          primaryAction={
            canManageStores
              ? {
                  label: '+ Tambah Toko Pertama',
                  onClick: () => setIsAddModalOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/60 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Toko</th>
                <th className="px-5 py-3.5 font-semibold">Marketplace</th>
                <th className="px-5 py-3.5 font-semibold">ID / Akun Eksternal</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Tanggal Ditambahkan</th>
                {canManageStores && <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 text-stone-200">
              {stores.map((store) => (
                <tr key={store.id} className="hover:bg-stone-800/40 transition-colors">
                  <td className="px-5 py-4 font-semibold text-stone-100 flex items-center gap-2">
                    <StoreIcon className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>{store.storeName}</span>
                  </td>
                  <td className="px-5 py-4">{getMarketplaceBadge(store.marketplace)}</td>
                  <td className="px-5 py-4 text-stone-400 font-mono text-[11px]">
                    {store.externalStoreId || '-'}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={store.status} />
                  </td>
                  <td className="px-5 py-4 text-stone-400">{formatDate(store.createdAt)}</td>
                  {canManageStores && (
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditStore(store)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Ubah Status
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Store Dialog */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Toko Marketplace Baru"
        description="Daftarkan akun toko online Anda untuk memetakan data penjualan dan settlement."
      >
        <form onSubmit={handleCreateStore} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Select
            label="Saluran Marketplace"
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value as MarketplaceCode)}
            options={[
              { value: 'SHOPEE', label: 'Shopee Indonesia' },
              { value: 'TIKTOK', label: 'TikTok Shop / Tokopedia' },
              { value: 'TOKOPEDIA', label: 'Tokopedia Seller' },
            ]}
          />

          <Input
            label="Nama Toko"
            type="text"
            placeholder="Contoh: Toko Berkah Mandiri"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            helperText="Nama yang tertera pada marketplace."
          />

          <Input
            label="ID / Username Toko Eksternal (Opsional)"
            type="text"
            placeholder="Contoh: toko_berkah_official"
            value={externalStoreId}
            onChange={(e) => setExternalStoreId(e.target.value)}
            helperText="Digunakan untuk validasi header laporan marketplace."
          />

          <div className="pt-3 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Simpan Toko
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Store Status Dialog */}
      {editStore && (
        <Dialog
          isOpen={true}
          onClose={() => setEditStore(null)}
          title={`Ubah Status: ${editStore.storeName}`}
          description="Nonaktifkan toko jika sudah tidak aktif atau dalam masa pemeliharaan."
        >
          <div className="space-y-4">
            <p className="text-xs text-stone-300">
              Status saat ini:{' '}
              <strong className="text-stone-100">{editStore.status}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                variant={editStore.status === 'ACTIVE' ? 'secondary' : 'primary'}
                onClick={() => handleUpdateStoreStatus('ACTIVE')}
                isLoading={isSubmitting}
                className="flex-1"
              >
                Aktifkan Toko
              </Button>
              <Button
                variant={editStore.status === 'INACTIVE' ? 'secondary' : 'destructive'}
                onClick={() => handleUpdateStoreStatus('INACTIVE')}
                isLoading={isSubmitting}
                className="flex-1"
              >
                Nonaktifkan Toko
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
