import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Plus,
  AlertCircle,
  ShieldAlert,
  DollarSign,
  Search,
  Filter,
  Calendar,
  Layers,
  Barcode,
  Edit2,
  Package,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { hasPermission } from '@/src/lib/auth/permissions';
import {
  getSKUs,
  getProductCosts,
  createProductCost,
  updateProductCost,
  getProducts,
} from '@/src/services/product.service';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { Dialog } from '@/src/components/ui/dialog';
import { Card } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/shared/EmptyState';
import { Skeleton } from '@/src/components/shared/LoadingState';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { formatIDR } from '@/src/utils/currency';
import { formatDate } from '@/src/utils/dates';
import { getReadableErrorMessage } from '@/src/utils/errors';
import type { SKU, ProductCost, CostType, Product } from '@/src/types/product';

const COST_TYPE_LABELS: Record<CostType, string> = {
  PRODUCT_COST: 'Harga Pokok Produk (HPP)',
  PACKAGING: 'Packaging / Polymailer',
  BOX: 'Kardus / Box Karton',
  BUBBLE_WRAP: 'Bubble Wrap Tambahan',
  STICKER: 'Stiker Fragile / Brand',
  LABEL: 'Thermal Shipping Label',
  OTHER: 'Biaya Variabel Lainnya',
};

export const HPPView: React.FC = () => {
  const { currentBusiness, currentRole, currentUser } = useAuth();
  const canManageHPP = hasPermission(currentRole, 'MANAGE_HPP');
  const canViewProfit = hasPermission(currentRole, 'VIEW_PROFIT');

  const [costs, setCosts] = useState<ProductCost[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('ALL');

  // Dialogs
  const [isAddCostModalOpen, setIsAddCostModalOpen] = useState(false);
  const [editCost, setEditCost] = useState<ProductCost | null>(null);

  // Form states
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [costType, setCostType] = useState<CostType>('PRODUCT_COST');
  const [amount, setAmount] = useState<number>(0);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const [fetchedCosts, fetchedSkus, fetchedProducts] = await Promise.all([
        getProductCosts(currentBusiness.id),
        getSKUs(currentBusiness.id),
        getProducts(currentBusiness.id),
      ]);
      setCosts(fetchedCosts);
      setSkus(fetchedSkus);
      setProducts(fetchedProducts);

      if (fetchedSkus.length > 0 && !selectedSkuId) {
        setSelectedSkuId(fetchedSkus[0].id);
      }
    } catch (err) {
      console.error('Failed to load HPP costs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness, selectedSkuId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!canViewProfit && currentRole === 'VIEWER') {
    return (
      <div className="p-8 text-center bg-stone-900/60 rounded-xl border border-stone-800">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-stone-200">Akses Terbatas</h3>
        <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
          Peran Viewer tidak memiliki wewenang untuk melihat data rincian sensitif HPP dan biaya pokok bisnis.
        </p>
      </div>
    );
  }

  const handleCreateCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!selectedSkuId) {
      setFormError('Pilih SKU target terlebih dahulu.');
      return;
    }
    if (amount <= 0) {
      setFormError('Nominal biaya harus lebih besar dari Rp 0.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await createProductCost(currentBusiness.id, currentUser.uid, {
        skuId: selectedSkuId,
        costType,
        amount: Number(amount),
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
      });

      setIsAddCostModalOpen(false);
      setAmount(0);
      setEffectiveTo('');
      await loadData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser || !editCost) return;
    if (amount <= 0) {
      setFormError('Nominal biaya harus lebih besar dari Rp 0.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await updateProductCost(currentBusiness.id, editCost.id, currentUser.uid, {
        costType,
        amount: Number(amount),
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
      });

      setEditCost(null);
      await loadData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSku = (skuId: string) => skus.find((s) => s.id === skuId);
  const getProductForSku = (productId: string) => products.find((p) => p.id === productId);

  // Group costs by SKU
  const filteredSkus = skus.filter((sku) => {
    const prod = getProductForSku(sku.productId);

    if (selectedProductId !== 'ALL' && sku.productId !== selectedProductId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSku = sku.skuCode.toLowerCase().includes(q);
      const matchBarcode = sku.barcode?.toLowerCase().includes(q);
      const matchProd = prod?.name.toLowerCase().includes(q);
      if (!matchSku && !matchBarcode && !matchProd) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Struktur HPP & Biaya Modal Produk"
        subtitle="HPP bersifat historis. Tetapkan harga beli/produksi dan biaya packing per SKU untuk kalkulasi Contribution Profit yang presisi."
        actions={
          canManageHPP ? (
            <Button
              variant="primary"
              onClick={() => {
                setFormError(null);
                setAmount(0);
                setEffectiveFrom(new Date().toISOString().split('T')[0]);
                setEffectiveTo('');
                setIsAddCostModalOpen(true);
              }}
              disabled={skus.length === 0}
              icon={<Plus className="w-4 h-4" />}
            >
              Tambah Komponen Biaya
            </Button>
          ) : (
            <div className="text-xs text-stone-500 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Hanya Owner, Admin, dan Finance yang dapat mengubah HPP</span>
            </div>
          )
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              placeholder="Cari kode SKU atau nama produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
          >
            <option value="ALL">Semua Master Produk ({products.length})</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : skus.length === 0 ? (
        <EmptyState
          icon={<Boxes className="w-10 h-10 text-emerald-400" />}
          title="Belum ada SKU internal"
          description="Tambahkan master produk dan SKU internal terlebih dahulu pada menu Master Data Produk sebelum menetapkan HPP."
        />
      ) : filteredSkus.length === 0 ? (
        <div className="p-8 text-center text-xs text-stone-500 bg-stone-900/40 rounded-xl border border-stone-800">
          Tidak ada SKU yang cocok dengan filter pencarian Anda.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredSkus.map((sku) => {
            const prod = getProductForSku(sku.productId);
            const skuCosts = costs.filter((c) => c.skuId === sku.id);
            const totalHpp = skuCosts.reduce((sum, item) => sum + item.amount, 0);

            return (
              <div
                key={sku.id}
                className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 shadow-xs space-y-4"
              >
                {/* SKU Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-800">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-base text-emerald-400">
                        {sku.skuCode}
                      </span>
                      {sku.barcode && (
                        <span className="text-xs text-stone-500 font-mono">
                          Barcode: {sku.barcode}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      Produk: <strong className="text-stone-200">{prod?.name || '—'}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-[11px] text-stone-400">Total HPP per Unit</div>
                      <div className="text-lg font-bold text-stone-100">{formatIDR(totalHpp)}</div>
                    </div>

                    {canManageHPP && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedSkuId(sku.id);
                          setCostType('PRODUCT_COST');
                          setAmount(0);
                          setEffectiveFrom(new Date().toISOString().split('T')[0]);
                          setEffectiveTo('');
                          setFormError(null);
                          setIsAddCostModalOpen(true);
                        }}
                        icon={<Plus className="w-3.5 h-3.5" />}
                      >
                        + Biaya
                      </Button>
                    )}
                  </div>
                </div>

                {/* Cost Breakdown */}
                {skuCosts.length === 0 ? (
                  <div className="p-3 bg-stone-950/40 rounded-lg text-xs text-stone-500 italic">
                    Belum ada komponen HPP yang ditetapkan untuk SKU ini. Klik &quot;+ Biaya&quot; untuk menambahkan.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {skuCosts.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-lg bg-stone-950/80 border border-stone-800/80 flex flex-col justify-between text-xs group hover:border-stone-700 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-stone-200">
                            {COST_TYPE_LABELS[c.costType] || c.costType}
                          </span>
                          {canManageHPP && (
                            <button
                              onClick={() => {
                                setEditCost(c);
                                setCostType(c.costType);
                                setAmount(c.amount);
                                setEffectiveFrom(
                                  c.effectiveFrom ? new Date(c.effectiveFrom as any).toISOString().split('T')[0] : ''
                                );
                                setEffectiveTo(
                                  c.effectiveTo ? new Date(c.effectiveTo as any).toISOString().split('T')[0] : ''
                                );
                                setFormError(null);
                              }}
                              className="text-stone-500 hover:text-stone-300 p-0.5"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-sm font-bold text-stone-100">
                            {formatIDR(c.amount)}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            Sejak {formatDate(c.effectiveFrom)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DIALOG: Add HPP Cost */}
      <Dialog
        isOpen={isAddCostModalOpen}
        onClose={() => setIsAddCostModalOpen(false)}
        title="Tetapkan Komponen Biaya Modal (HPP)"
        description="Masukkan nominal modal atau biaya kemasan per 1 unit barang."
      >
        <form onSubmit={handleCreateCost} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Select
            label="Pilih SKU Target"
            value={selectedSkuId}
            onChange={(e) => setSelectedSkuId(e.target.value)}
            options={skus.map((s) => {
              const prod = getProductForSku(s.productId);
              return {
                value: s.id,
                label: `${s.skuCode} — ${prod ? prod.name : ''}`,
              };
            })}
          />

          <Select
            label="Jenis Komponen Biaya"
            value={costType}
            onChange={(e) => setCostType(e.target.value as CostType)}
            options={[
              { value: 'PRODUCT_COST', label: 'Harga Pokok Produk (HPP Beli / Produksi)' },
              { value: 'PACKAGING', label: 'Packaging / Polymailer' },
              { value: 'BOX', label: 'Kardus / Karton Box' },
              { value: 'BUBBLE_WRAP', label: 'Bubble Wrap' },
              { value: 'STICKER', label: 'Stiker Fragile / Label' },
              { value: 'LABEL', label: 'Thermal Shipping Label' },
              { value: 'OTHER', label: 'Biaya Variabel Lainnya' },
            ]}
          />

          <Input
            label="Nominal Biaya Satuan (Rp)"
            type="number"
            min="0"
            step="100"
            placeholder="Contoh: 12500"
            value={amount === 0 ? '' : amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            prefixText="Rp"
            required
            helperText="Nilai dalam Rupiah per 1 unit barang."
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mulai Berlaku Tanggal"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
              helperText="Berlaku sejak periode ini"
            />
            <Input
              label="Berakhir Tanggal (Opsional)"
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
              helperText="Kosongkan jika masih aktif"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddCostModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Simpan Biaya
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DIALOG: Edit HPP Cost */}
      {editCost && (
        <Dialog
          isOpen={true}
          onClose={() => setEditCost(null)}
          title="Ubah Komponen Biaya HPP"
          description="Perbarui nilai nominal atau tanggal berlaku historis."
        >
          <form onSubmit={handleUpdateCost} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <Select
              label="Jenis Komponen Biaya"
              value={costType}
              onChange={(e) => setCostType(e.target.value as CostType)}
              options={[
                { value: 'PRODUCT_COST', label: 'Harga Pokok Produk (HPP Beli / Produksi)' },
                { value: 'PACKAGING', label: 'Packaging / Polymailer' },
                { value: 'BOX', label: 'Kardus / Karton Box' },
                { value: 'BUBBLE_WRAP', label: 'Bubble Wrap' },
                { value: 'STICKER', label: 'Stiker Fragile / Label' },
                { value: 'LABEL', label: 'Thermal Shipping Label' },
                { value: 'OTHER', label: 'Biaya Variabel Lainnya' },
              ]}
            />

            <Input
              label="Nominal Biaya Satuan (Rp)"
              type="number"
              min="0"
              step="100"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              prefixText="Rp"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Mulai Berlaku Tanggal"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
              <Input
                label="Berakhir Tanggal"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </div>

            <div className="pt-3 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditCost(null)}
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
