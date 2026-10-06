import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Edit2,
  Store as StoreIcon,
  Layers,
  Barcode,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { hasPermission } from '@/src/lib/auth/permissions';
import {
  getSkuMappings,
  createSkuMapping,
  updateSkuMapping,
  getSkus,
  getProducts,
} from '@/src/services/product.service';
import { getStores } from '@/src/services/store.service';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { Dialog } from '@/src/components/ui/dialog';
import { Card } from '@/src/components/ui/card';
import { StatusBadge } from '@/src/components/shared/StatusBadge';
import { EmptyState } from '@/src/components/shared/EmptyState';
import { Skeleton } from '@/src/components/shared/LoadingState';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { formatDate } from '@/src/utils/dates';
import { getReadableErrorMessage } from '@/src/utils/errors';
import type { StoreSkuMapping, SKU, Product } from '@/src/types/product';
import type { Store, MarketplaceCode } from '@/src/types/store';

export const SkuMappingView: React.FC = () => {
  const { currentBusiness, currentRole, currentUser } = useAuth();
  const canManageProducts = hasPermission(currentRole, 'MANAGE_PRODUCTS');

  const [mappings, setMappings] = useState<StoreSkuMapping[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('ALL');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Dialogs
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editMapping, setEditMapping] = useState<StoreSkuMapping | null>(null);

  // Form states
  const [formStoreId, setFormStoreId] = useState('');
  const [formInternalSkuId, setFormInternalSkuId] = useState('');
  const [formExternalSku, setFormExternalSku] = useState('');
  const [formExternalProduct, setFormExternalProduct] = useState('');
  const [formExternalVariant, setFormExternalVariant] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const [m, st, s, p] = await Promise.all([
        getSkuMappings(currentBusiness.id),
        getStores(currentBusiness.id),
        getSkus(currentBusiness.id),
        getProducts(currentBusiness.id),
      ]);
      setMappings(m);
      setStores(st);
      setSkus(s);
      setProducts(p);

      if (st.length > 0 && !formStoreId) {
        setFormStoreId(st[0].id);
      }
      if (s.length > 0 && !formInternalSkuId) {
        setFormInternalSkuId(s[0].id);
      }
    } catch (err) {
      console.error('Failed to load SKU mappings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness, formStoreId, formInternalSkuId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!formStoreId) {
      setFormError('Pilih toko marketplace.');
      return;
    }
    if (!formInternalSkuId) {
      setFormError('Pilih SKU internal MarketFlow target.');
      return;
    }
    if (!formExternalSku.trim()) {
      setFormError('Kode SKU eksternal toko marketplace wajib diisi.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await createSkuMapping(currentBusiness.id, currentUser.uid, {
        storeId: formStoreId,
        internalSkuId: formInternalSkuId,
        externalSku: formExternalSku.trim(),
        externalProductName: formExternalProduct.trim() || undefined,
        externalVariantName: formExternalVariant.trim() || undefined,
      });

      setIsAddModalOpen(false);
      setFormExternalSku('');
      setFormExternalProduct('');
      setFormExternalVariant('');
      await loadData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser || !editMapping) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await updateSkuMapping(currentBusiness.id, editMapping.id, currentUser.uid, {
        internalSkuId: formInternalSkuId,
        externalSku: formExternalSku.trim(),
        externalProductName: formExternalProduct.trim() || undefined,
        externalVariantName: formExternalVariant.trim() || undefined,
      });

      setEditMapping(null);
      await loadData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStore = (storeId: string) => stores.find((s) => s.id === storeId);
  const getSku = (skuId: string) => skus.find((s) => s.id === skuId);
  const getProductForSku = (productId: string) => products.find((p) => p.id === productId);

  // Filter mappings
  const filteredMappings = mappings.filter((m) => {
    const store = getStore(m.storeId);
    const sku = getSku(m.internalSkuId);

    // Store filter
    if (selectedStoreId !== 'ALL' && m.storeId !== selectedStoreId) return false;

    // Marketplace filter
    if (selectedMarketplace !== 'ALL' && store?.marketplace !== selectedMarketplace) return false;

    // Status filter
    if (selectedStatus !== 'ALL' && m.status !== selectedStatus) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchExtSku = m.externalSku.toLowerCase().includes(q);
      const matchExtProduct = m.externalProductName?.toLowerCase().includes(q);
      const matchIntSku = sku?.skuCode.toLowerCase().includes(q);
      const matchStore = store?.storeName.toLowerCase().includes(q);
      if (!matchExtSku && !matchExtProduct && !matchIntSku && !matchStore) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace SKU Mapping"
        subtitle="Petakan kode SKU variasi di Shopee, TikTok, dan Tokopedia ke SKU universal MarketFlow BI."
        actions={
          canManageProducts ? (
            <Button
              variant="primary"
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              disabled={skus.length === 0 || stores.length === 0}
              icon={<Plus className="w-4 h-4" />}
            >
              Tambah Pemetaan SKU
            </Button>
          ) : null
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              placeholder="Cari SKU eksternal / internal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          {/* Store filter */}
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
          >
            <option value="ALL">Semua Toko ({stores.length})</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.storeName} ({s.marketplace})
              </option>
            ))}
          </select>

          {/* Marketplace filter */}
          <select
            value={selectedMarketplace}
            onChange={(e) => setSelectedMarketplace(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
          >
            <option value="ALL">Semua Marketplace</option>
            <option value="SHOPEE">Shopee</option>
            <option value="TIKTOK">TikTok Shop</option>
            <option value="TOKOPEDIA">Tokopedia</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="w-full px-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif (Mapped)</option>
            <option value="INACTIVE">Nonaktif (Unmapped)</option>
          </select>
        </div>
      </Card>

      {/* Main Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : stores.length === 0 ? (
        <EmptyState
          icon={<StoreIcon className="w-10 h-10 text-emerald-400" />}
          title="Belum ada toko yang terdaftar"
          description="Tambahkan toko online di menu Master Stores sebelum membuat pemetaan SKU."
        />
      ) : skus.length === 0 ? (
        <EmptyState
          icon={<Barcode className="w-10 h-10 text-emerald-400" />}
          title="Belum ada SKU internal"
          description="Tambahkan SKU produk terlebih dahulu di menu Master Data Produk."
        />
      ) : filteredMappings.length === 0 ? (
        <EmptyState
          icon={<Link2 className="w-10 h-10 text-emerald-400" />}
          title="Belum ada aturan pemetaan SKU"
          description="Petakan SKU variasi toko marketplace ke SKU universal internal agar settlement & pesanan otomatis terhubung."
          primaryAction={
            canManageProducts
              ? {
                  label: '+ Tambah Pemetaan Pertama',
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
                <th className="px-5 py-3.5 font-semibold">Toko & Channel</th>
                <th className="px-5 py-3.5 font-semibold">SKU Eksternal Marketplace</th>
                <th className="px-5 py-3.5 font-semibold">Produk Marketplace</th>
                <th className="px-5 py-3.5 font-semibold">SKU Internal Target</th>
                <th className="px-5 py-3.5 font-semibold">Status Pemetaan</th>
                <th className="px-5 py-3.5 font-semibold">Tanggal Pemetaan</th>
                {canManageProducts && <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 text-stone-200">
              {filteredMappings.map((m) => {
                const store = getStore(m.storeId);
                const sku = getSku(m.internalSkuId);
                const prod = sku ? getProductForSku(sku.productId) : null;

                return (
                  <tr key={m.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                        <StoreIcon className="w-3.5 h-3.5 text-stone-400" />
                        <span>{store?.storeName || m.storeId}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 uppercase">
                        {store?.marketplace}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-amber-300">
                      {m.externalSku}
                    </td>
                    <td className="px-5 py-4 text-stone-300">
                      <div className="max-w-xs truncate">{m.externalProductName || '—'}</div>
                      {m.externalVariantName && (
                        <div className="text-[10px] text-stone-500">
                          Var: {m.externalVariantName}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-emerald-400">
                        {sku ? sku.skuCode : m.internalSkuId}
                      </div>
                      {prod && (
                        <div className="text-[10px] text-stone-400 truncate max-w-xs">
                          {prod.name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-5 py-4 text-stone-400">{formatDate(m.createdAt)}</td>
                    {canManageProducts && (
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditMapping(m);
                            setFormStoreId(m.storeId);
                            setFormInternalSkuId(m.internalSkuId);
                            setFormExternalSku(m.externalSku);
                            setFormExternalProduct(m.externalProductName || '');
                            setFormExternalVariant(m.externalVariantName || '');
                            setFormError(null);
                          }}
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Ubah
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DIALOG: Add SKU Mapping */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Pemetaan SKU Marketplace"
        description="Hubungkan nomor referensi SKU di Seller Center marketplace ke SKU master MarketFlow BI."
      >
        <form onSubmit={handleCreateMapping} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Select
            label="Pilih Toko Marketplace"
            value={formStoreId}
            onChange={(e) => setFormStoreId(e.target.value)}
            options={stores.map((st) => ({
              value: st.id,
              label: `${st.storeName} (${st.marketplace})`,
            }))}
          />

          <Select
            label="Pilih SKU Internal Target"
            value={formInternalSkuId}
            onChange={(e) => setFormInternalSkuId(e.target.value)}
            options={skus.map((s) => {
              const p = getProductForSku(s.productId);
              return {
                value: s.id,
                label: `${s.skuCode} — ${p ? p.name : ''}`,
              };
            })}
          />

          <Input
            label="SKU Marketplace (External SKU)"
            type="text"
            placeholder="Contoh: KHL-200G-SP"
            value={formExternalSku}
            onChange={(e) => setFormExternalSku(e.target.value)}
            required
            helperText="Sesuai kolom Nomor Referensi SKU di pesanan Shopee, TikTok, atau Tokopedia."
          />

          <Input
            label="Nama Produk di Marketplace (Opsional)"
            type="text"
            placeholder="Contoh: Kurma Khalas 200gr Premium"
            value={formExternalProduct}
            onChange={(e) => setFormExternalProduct(e.target.value)}
          />

          <Input
            label="Nama Variasi di Marketplace (Opsional)"
            type="text"
            placeholder="Contoh: Kemasan 200g"
            value={formExternalVariant}
            onChange={(e) => setFormExternalVariant(e.target.value)}
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
              Simpan Pemetaan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DIALOG: Edit SKU Mapping */}
      {editMapping && (
        <Dialog
          isOpen={true}
          onClose={() => setEditMapping(null)}
          title="Ubah Pemetaan SKU Marketplace"
          description="Perbarui target SKU internal atau informasi produk marketplace."
        >
          <form onSubmit={handleUpdateMapping} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <Select
              label="Pilih SKU Internal Target"
              value={formInternalSkuId}
              onChange={(e) => setFormInternalSkuId(e.target.value)}
              options={skus.map((s) => {
                const p = getProductForSku(s.productId);
                return {
                  value: s.id,
                  label: `${s.skuCode} — ${p ? p.name : ''}`,
                };
              })}
            />

            <Input
              label="SKU Marketplace (External SKU)"
              type="text"
              value={formExternalSku}
              onChange={(e) => setFormExternalSku(e.target.value)}
              required
            />

            <Input
              label="Nama Produk di Marketplace"
              type="text"
              value={formExternalProduct}
              onChange={(e) => setFormExternalProduct(e.target.value)}
            />

            <Input
              label="Nama Variasi di Marketplace"
              type="text"
              value={formExternalVariant}
              onChange={(e) => setFormExternalVariant(e.target.value)}
            />

            <div className="pt-3 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditMapping(null)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
