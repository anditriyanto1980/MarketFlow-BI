import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Package,
  Layers,
  Barcode,
  Boxes,
  Link2,
  Plus,
  Edit2,
  Archive,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { hasPermission } from '@/src/lib/auth/permissions';
import {
  getProduct,
  updateProduct,
  archiveProduct,
  getVariants,
  createVariant,
  getSkus,
  createSku,
  updateSku,
  archiveSku,
  getProductCosts,
  createProductCost,
  getSkuMappings,
  createSkuMapping,
} from '@/src/services/product.service';
import { getStores } from '@/src/services/store.service';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { Dialog } from '@/src/components/ui/dialog';
import { Card, CardHeader } from '@/src/components/ui/card';
import { StatusBadge } from '@/src/components/shared/StatusBadge';
import { EmptyState } from '@/src/components/shared/EmptyState';
import { Skeleton } from '@/src/components/shared/LoadingState';
import { formatIDR } from '@/src/utils/currency';
import { formatDate, formatDateTime } from '@/src/utils/dates';
import { getReadableErrorMessage } from '@/src/utils/errors';
import type {
  Product,
  ProductVariant,
  SKU,
  ProductCost,
  StoreSkuMapping,
  CostType,
} from '@/src/types/product';
import type { Store } from '@/src/types/store';

interface ProductDetailViewProps {
  productId: string;
  onBack: () => void;
  onRefreshParent?: () => void;
}

type TabKey = 'overview' | 'variants-sku' | 'hpp' | 'mappings';

const COST_TYPE_LABELS: Record<CostType, string> = {
  PRODUCT_COST: 'Harga Pokok Produk (HPP)',
  PACKAGING: 'Packaging / Polymailer',
  BOX: 'Kardus / Box Karton',
  BUBBLE_WRAP: 'Bubble Wrap Tambahan',
  STICKER: 'Stiker Fragile / Brand',
  LABEL: 'Thermal Shipping Label',
  OTHER: 'Biaya Variabel Lainnya',
};

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  productId,
  onBack,
  onRefreshParent,
}) => {
  const { currentBusiness, currentRole, currentUser } = useAuth();
  const canManageProducts = hasPermission(currentRole, 'MANAGE_PRODUCTS');
  const canManageHPP = hasPermission(currentRole, 'MANAGE_HPP');
  const canViewProfit = hasPermission(currentRole, 'VIEW_PROFIT');

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [costs, setCosts] = useState<ProductCost[]>([]);
  const [mappings, setMappings] = useState<StoreSkuMapping[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal dialog states
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [isAddSkuOpen, setIsAddSkuOpen] = useState(false);
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [isAddMappingOpen, setIsAddMappingOpen] = useState(false);

  // Form states - Edit Product
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Form states - Variant
  const [variantName, setVariantName] = useState('');

  // Form states - SKU
  const [skuCode, setSkuCode] = useState('');
  const [skuBarcode, setSkuBarcode] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');

  // Form states - HPP Cost
  const [selectedCostSkuId, setSelectedCostSkuId] = useState('');
  const [costType, setCostType] = useState<CostType>('PRODUCT_COST');
  const [costAmount, setCostAmount] = useState<number>(0);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);

  // Form states - SKU Mapping
  const [selectedMappingStoreId, setSelectedMappingStoreId] = useState('');
  const [selectedMappingSkuId, setSelectedMappingSkuId] = useState('');
  const [externalSku, setExternalSku] = useState('');
  const [externalProductName, setExternalProductName] = useState('');
  const [externalVariantName, setExternalVariantName] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAllProductData = useCallback(async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const [p, v, s, m, st] = await Promise.all([
        getProduct(currentBusiness.id, productId),
        getVariants(currentBusiness.id, productId),
        getSkus(currentBusiness.id, productId),
        getSkuMappings(currentBusiness.id),
        getStores(currentBusiness.id),
      ]);
      setProduct(p);
      setVariants(v);
      setSkus(s);
      setStores(st);

      if (p) {
        setEditName(p.name);
        setEditBrand(p.brand || '');
        setEditCategory(p.category || '');
        setEditDescription(p.description || '');
      }

      // Filter mappings that match this product's SKUs
      const skuIdSet = new Set(s.map((item) => item.id));
      setMappings(m.filter((mapping) => skuIdSet.has(mapping.internalSkuId)));

      // Load costs for this product's SKUs
      if (s.length > 0 && (canViewProfit || canManageHPP)) {
        const allCosts = await getProductCosts(currentBusiness.id);
        setCosts(allCosts.filter((c) => skuIdSet.has(c.skuId)));
      }
    } catch (err) {
      console.error('Failed to load product detail:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness, productId, canViewProfit, canManageHPP]);

  useEffect(() => {
    loadAllProductData();
  }, [loadAllProductData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center bg-stone-900/60 rounded-xl border border-stone-800">
        <Package className="w-10 h-10 text-stone-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-stone-200">Produk Tidak Ditemukan</h3>
        <p className="text-xs text-stone-400 mt-1">Produk mungkin telah dihapus atau tidak tersedia.</p>
        <Button size="sm" variant="secondary" onClick={onBack} className="mt-4">
          Kembali ke Katalog
        </Button>
      </div>
    );
  }

  // Edit Product Handler
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await updateProduct(currentBusiness.id, product.id, currentUser.uid, {
        name: editName.trim(),
        brand: editBrand.trim() || undefined,
        category: editCategory.trim() || undefined,
        description: editDescription.trim() || undefined,
      });
      setIsEditProductOpen(false);
      await loadAllProductData();
      onRefreshParent?.();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive Product Handler
  const handleArchiveProduct = async () => {
    if (!currentBusiness || !currentUser) return;
    if (confirm(`Apakah Anda yakin ingin menonaktifkan produk "${product.name}"?`)) {
      try {
        await archiveProduct(currentBusiness.id, product.id, currentUser.uid);
        await loadAllProductData();
        onRefreshParent?.();
      } catch (err) {
        alert(getReadableErrorMessage(err));
      }
    }
  };

  // Add Variant Handler
  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!variantName.trim()) {
      setFormError('Nama varian wajib diisi.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await createVariant(currentBusiness.id, currentUser.uid, {
        productId: product.id,
        name: variantName.trim(),
      });
      setIsAddVariantOpen(false);
      setVariantName('');
      await loadAllProductData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add SKU Handler
  const handleAddSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!skuCode.trim()) {
      setFormError('Kode SKU internal wajib diisi.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await createSku(currentBusiness.id, currentUser.uid, {
        productId: product.id,
        variantId: selectedVariantId || undefined,
        skuCode: skuCode.trim(),
        barcode: skuBarcode.trim() || undefined,
      });
      setIsAddSkuOpen(false);
      setSkuCode('');
      setSkuBarcode('');
      setSelectedVariantId('');
      await loadAllProductData();
      onRefreshParent?.();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Cost Handler
  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!selectedCostSkuId) {
      setFormError('Pilih SKU target terlebih dahulu.');
      return;
    }
    if (costAmount <= 0) {
      setFormError('Nominal biaya modal harus lebih besar dari Rp 0.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await createProductCost(currentBusiness.id, currentUser.uid, {
        skuId: selectedCostSkuId,
        costType,
        amount: Number(costAmount),
        effectiveFrom,
      });
      setIsAddCostOpen(false);
      setCostAmount(0);
      await loadAllProductData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add SKU Mapping Handler
  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!selectedMappingStoreId) {
      setFormError('Pilih toko marketplace.');
      return;
    }
    if (!selectedMappingSkuId) {
      setFormError('Pilih SKU internal target.');
      return;
    }
    if (!externalSku.trim()) {
      setFormError('SKU toko marketplace wajib diisi.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await createSkuMapping(currentBusiness.id, currentUser.uid, {
        storeId: selectedMappingStoreId,
        internalSkuId: selectedMappingSkuId,
        externalSku: externalSku.trim(),
        externalProductName: externalProductName.trim() || undefined,
        externalVariantName: externalVariantName.trim() || undefined,
      });
      setIsAddMappingOpen(false);
      setExternalSku('');
      setExternalProductName('');
      setExternalVariantName('');
      await loadAllProductData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSkuCode = (skuId: string) => {
    const s = skus.find((item) => item.id === skuId);
    return s ? s.skuCode : skuId;
  };

  const getStoreName = (storeId: string) => {
    const st = stores.find((item) => item.id === storeId);
    return st ? `${st.storeName} (${st.marketplace})` : storeId;
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold text-stone-100 tracking-tight">
                {product.name}
              </h1>
              <StatusBadge status={product.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-400 mt-1">
              {product.brand && <span>Brand: <strong className="text-stone-300">{product.brand}</strong></span>}
              {product.category && <span>Kategori: <strong className="text-stone-300">{product.category}</strong></span>}
              <span>Dibuat: {formatDate(product.createdAt)}</span>
            </div>
          </div>
        </div>

        {canManageProducts && (
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditProductOpen(true)}
              icon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Ubah Data
            </Button>
            {product.status === 'ACTIVE' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleArchiveProduct}
                icon={<Archive className="w-3.5 h-3.5" />}
              >
                Arsipkan
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-stone-800 space-x-1 sm:space-x-4 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('variants-sku')}
          className={`pb-3 px-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'variants-sku'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Barcode className="w-3.5 h-3.5" />
          <span>Varian & SKU ({skus.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('hpp')}
          className={`pb-3 px-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'hpp'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Struktur HPP</span>
        </button>

        <button
          onClick={() => setActiveTab('mappings')}
          className={`pb-3 px-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'mappings'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Marketplace Mapping ({mappings.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader title="Informasi Master Produk" subtitle="Spesifikasi umum identitas produk katalog." />
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-stone-400 block mb-1">Deskripsi Produk:</span>
                  <p className="text-stone-200 leading-relaxed bg-stone-950/60 p-3 rounded-lg border border-stone-800/80">
                    {product.description || 'Tidak ada catatan deskripsi tambahan untuk produk ini.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-stone-400 block">Kategori</span>
                    <span className="font-semibold text-stone-100">{product.category || '-'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Brand / Merek</span>
                    <span className="font-semibold text-stone-100">{product.brand || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-800/80">
                  <div>
                    <span className="text-stone-400 block">Waktu Ditambahkan</span>
                    <span className="text-stone-300">{formatDateTime(product.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Terakhir Diperbarui</span>
                    <span className="text-stone-300">{formatDateTime(product.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Status Katalog" subtitle="Ringkasan identitas universal" />
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
                  <span className="text-stone-400">Total Varian</span>
                  <span className="font-bold text-stone-100">{variants.length}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
                  <span className="text-stone-400">Total SKU Internal</span>
                  <span className="font-bold text-emerald-400">{skus.length}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
                  <span className="text-stone-400">Marketplace Mappings</span>
                  <span className="font-bold text-blue-400">{mappings.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: VARIANTS & SKU */}
      {activeTab === 'variants-sku' && (
        <div className="space-y-6">
          {/* Variants section */}
          <Card>
            <CardHeader
              title={`Varian Produk (${variants.length})`}
              subtitle="Pilihan variasi spesifikasi (misal ukuran 200g, 500g, 1kg atau warna)."
              action={
                canManageProducts ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setFormError(null);
                      setIsAddVariantOpen(true);
                    }}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Tambah Varian
                  </Button>
                ) : null
              }
            />

            {variants.length === 0 ? (
              <div className="p-4 bg-stone-950/40 rounded-lg text-xs text-stone-400 italic">
                Belum ada varian spesifik. Anda dapat langsung membuat SKU default atau menambahkan varian terlebih dahulu.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 bg-stone-950/60 border border-stone-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-semibold text-stone-200">{v.name}</span>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* SKUs section */}
          <Card>
            <CardHeader
              title={`SKU Internal MarketFlow (${skus.length})`}
              subtitle="Universal business key unik yang menjadi target rekonsiliasi data marketplace."
              action={
                canManageProducts ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setFormError(null);
                      setIsAddSkuOpen(true);
                    }}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Tambah SKU Baru
                  </Button>
                ) : null
              }
            />

            {skus.length === 0 ? (
              <EmptyState
                icon={<Barcode className="w-8 h-8 text-emerald-400" />}
                title="Belum ada SKU internal"
                description="Buat SKU internal pertama untuk produk ini agar dapat dipetakan ke pesanan marketplace."
                primaryAction={
                  canManageProducts
                    ? {
                        label: '+ Tambah SKU',
                        onClick: () => setIsAddSkuOpen(true),
                      }
                    : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/80 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Kode SKU Internal</th>
                      <th className="px-4 py-3 font-semibold">Varian Terkait</th>
                      <th className="px-4 py-3 font-semibold">Barcode</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Tanggal Dibuat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80 text-stone-200">
                    {skus.map((sku) => {
                      const v = variants.find((item) => item.id === sku.variantId);
                      return (
                        <tr key={sku.id} className="hover:bg-stone-800/30 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                            {sku.skuCode}
                          </td>
                          <td className="px-4 py-3.5 text-stone-300">{v ? v.name : '—'}</td>
                          <td className="px-4 py-3.5 font-mono text-stone-400">
                            {sku.barcode || '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={sku.status} />
                          </td>
                          <td className="px-4 py-3.5 text-stone-400">{formatDate(sku.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: HPP / PRODUCT COSTS */}
      {activeTab === 'hpp' && (
        <div className="space-y-6">
          {!canViewProfit && currentRole === 'VIEWER' ? (
            <div className="p-8 text-center bg-stone-900/60 rounded-xl border border-stone-800">
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-stone-200">Akses Terbatas</h3>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Peran Viewer tidak memiliki wewenang untuk melihat data komponen HPP.
              </p>
            </div>
          ) : (
            <Card>
              <CardHeader
                title="Struktur HPP & Rincian Modal Satuan"
                subtitle="Komponen biaya riil (harga beli/produksi, packaging, karton, bubble wrap, stiker, label)."
                action={
                  canManageHPP ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setFormError(null);
                        if (skus.length > 0 && !selectedCostSkuId) {
                          setSelectedCostSkuId(skus[0].id);
                        }
                        setIsAddCostOpen(true);
                      }}
                      disabled={skus.length === 0}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Tetapkan Biaya HPP
                    </Button>
                  ) : null
                }
              />

              {skus.length === 0 ? (
                <div className="p-4 bg-stone-950/40 rounded-lg text-xs text-stone-400 italic">
                  Tambahkan SKU produk terlebih dahulu sebelum menetapkan HPP.
                </div>
              ) : costs.length === 0 ? (
                <EmptyState
                  icon={<Boxes className="w-8 h-8 text-emerald-400" />}
                  title="Belum ada komponen HPP untuk produk ini"
                  description="Masukkan biaya pokok produk dan biaya kemasan untuk menghitung Contribution Profit pesanan."
                  primaryAction={
                    canManageHPP
                      ? {
                          label: '+ Tetapkan HPP',
                          onClick: () => {
                            setSelectedCostSkuId(skus[0].id);
                            setIsAddCostOpen(true);
                          },
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="space-y-6">
                  {skus.map((sku) => {
                    const skuCosts = costs.filter((c) => c.skuId === sku.id);
                    const totalHpp = skuCosts.reduce((sum, item) => sum + item.amount, 0);

                    return (
                      <div
                        key={sku.id}
                        className="rounded-xl border border-stone-800 bg-stone-950/60 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                          <div>
                            <span className="text-xs text-stone-400">SKU:</span>
                            <span className="font-mono font-bold text-emerald-400 ml-2">
                              {sku.skuCode}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-stone-400">Total HPP per Unit:</span>
                            <span className="font-bold text-stone-100 text-sm ml-2">
                              {formatIDR(totalHpp)}
                            </span>
                          </div>
                        </div>

                        {skuCosts.length === 0 ? (
                          <div className="text-xs text-stone-500 italic py-2">
                            Belum ada entri HPP untuk SKU ini.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {skuCosts.map((c) => (
                              <div
                                key={c.id}
                                className="px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="text-stone-300 font-medium">
                                    {COST_TYPE_LABELS[c.costType] || c.costType}
                                  </div>
                                  <div className="text-[10px] text-stone-500">
                                    Berlaku: {formatDate(c.effectiveFrom)}
                                  </div>
                                </div>
                                <span className="font-semibold text-stone-100">
                                  {formatIDR(c.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: MARKETPLACE MAPPINGS */}
      {activeTab === 'mappings' && (
        <Card>
          <CardHeader
            title={`Marketplace SKU Mapping (${mappings.length})`}
            subtitle="Aturan pemetaan dari SKU toko Shopee / TikTok / Tokopedia ke SKU internal produk ini."
            action={
              canManageProducts ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setFormError(null);
                    if (skus.length > 0 && !selectedMappingSkuId) {
                      setSelectedMappingSkuId(skus[0].id);
                    }
                    if (stores.length > 0 && !selectedMappingStoreId) {
                      setSelectedMappingStoreId(stores[0].id);
                    }
                    setIsAddMappingOpen(true);
                  }}
                  disabled={skus.length === 0 || stores.length === 0}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Petakan SKU Marketplace
                </Button>
              ) : null
            }
          />

          {stores.length === 0 ? (
            <div className="p-4 bg-stone-950/40 rounded-lg text-xs text-stone-400 italic">
              Tambahkan toko marketplace terlebih dahulu di menu Master Stores sebelum membuat pemetaan.
            </div>
          ) : mappings.length === 0 ? (
            <EmptyState
              icon={<Link2 className="w-8 h-8 text-emerald-400" />}
              title="Belum ada pemetaan marketplace"
              description="Petakan SKU eksternal yang ada pada pesanan Shopee, TikTok, atau Tokopedia ke SKU internal MarketFlow."
              primaryAction={
                canManageProducts && skus.length > 0
                  ? {
                      label: '+ Petakan SKU Marketplace',
                      onClick: () => {
                        setSelectedMappingSkuId(skus[0].id);
                        setSelectedMappingStoreId(stores[0].id);
                        setIsAddMappingOpen(true);
                      },
                    }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950/80 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Toko Marketplace</th>
                    <th className="px-4 py-3 font-semibold">SKU Eksternal Marketplace</th>
                    <th className="px-4 py-3 font-semibold">SKU Internal Target</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Tanggal Pemetaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80 text-stone-200">
                  {mappings.map((m) => (
                    <tr key={m.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-stone-100">
                        {getStoreName(m.storeId)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-amber-300">
                        <div>{m.externalSku}</div>
                        {m.externalProductName && (
                          <div className="text-[10px] text-stone-400 font-sans truncate max-w-xs">
                            {m.externalProductName} {m.externalVariantName ? `(${m.externalVariantName})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                        {getSkuCode(m.internalSkuId)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-4 py-3.5 text-stone-400">{formatDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* DIALOG 1: Edit Product Info */}
      <Dialog
        isOpen={isEditProductOpen}
        onClose={() => setIsEditProductOpen(false)}
        title="Ubah Data Master Produk"
        description="Perbarui informasi umum katalog produk."
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Nama Master Produk"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Brand / Merek"
              type="text"
              value={editBrand}
              onChange={(e) => setEditBrand(e.target.value)}
            />
            <Input
              label="Kategori"
              type="text"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-300">Deskripsi / Catatan</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-lg bg-stone-900 border border-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
              placeholder="Catatan internal produk..."
            />
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditProductOpen(false)}
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

      {/* DIALOG 2: Add Variant */}
      <Dialog
        isOpen={isAddVariantOpen}
        onClose={() => setIsAddVariantOpen(false)}
        title="Tambah Varian Produk"
        description="Contoh: 200g, 500g, 1kg, Hitam XL, Merah L."
      >
        <form onSubmit={handleAddVariant} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Nama Varian"
            type="text"
            placeholder="Contoh: 500g"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            required
            helperText="Nama spesifikasi variasi produk."
          />

          <div className="pt-3 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddVariantOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Simpan Varian
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DIALOG 3: Add SKU */}
      <Dialog
        isOpen={isAddSkuOpen}
        onClose={() => setIsAddSkuOpen(false)}
        title="Tambah SKU Internal Baru"
        description="SKU internal harus unik di seluruh bisnis Anda."
      >
        <form onSubmit={handleAddSku} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {variants.length > 0 && (
            <Select
              label="Pilih Varian Terkait (Opsional)"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              options={[
                { value: '', label: '— Tanpa Varian Spesifik (SKU Utama) —' },
                ...variants.map((v) => ({ value: v.id, label: v.name })),
              ]}
            />
          )}

          <Input
            label="Kode SKU Internal"
            type="text"
            placeholder="Contoh: AK-KHL-500"
            value={skuCode}
            onChange={(e) => setSkuCode(e.target.value)}
            required
            helperText="Format kode standar internal (akan otomatis dikonversi ke huruf kapital)."
          />

          <Input
            label="Barcode (Opsional)"
            type="text"
            placeholder="Contoh: 8991234567890"
            value={skuBarcode}
            onChange={(e) => setSkuBarcode(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddSkuOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Simpan SKU
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DIALOG 4: Add HPP Cost */}
      <Dialog
        isOpen={isAddCostOpen}
        onClose={() => setIsAddCostOpen(false)}
        title="Tetapkan Komponen Biaya HPP"
        description="Masukkan nominal modal atau komponen kemasan per 1 unit barang."
      >
        <form onSubmit={handleAddCost} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Select
            label="Pilih SKU Target"
            value={selectedCostSkuId}
            onChange={(e) => setSelectedCostSkuId(e.target.value)}
            options={skus.map((s) => ({
              value: s.id,
              label: `${s.skuCode} ${s.barcode ? `(${s.barcode})` : ''}`,
            }))}
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
            placeholder="Contoh: 12000"
            value={costAmount === 0 ? '' : costAmount}
            onChange={(e) => setCostAmount(Number(e.target.value))}
            prefixText="Rp"
            required
          />

          <Input
            label="Mulai Berlaku Tanggal"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            required
            helperText="HPP bersifat historis untuk kalkulasi akurat transaksi masa lalu & sekarang."
          />

          <div className="pt-3 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddCostOpen(false)}
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

      {/* DIALOG 5: Add Marketplace SKU Mapping */}
      <Dialog
        isOpen={isAddMappingOpen}
        onClose={() => setIsAddMappingOpen(false)}
        title="Petakan SKU Marketplace"
        description="Hubungkan SKU toko Shopee, TikTok Shop, atau Tokopedia ke SKU internal."
      >
        <form onSubmit={handleAddMapping} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Select
            label="Pilih Toko Marketplace"
            value={selectedMappingStoreId}
            onChange={(e) => setSelectedMappingStoreId(e.target.value)}
            options={stores.map((st) => ({
              value: st.id,
              label: `${st.storeName} (${st.marketplace})`,
            }))}
          />

          <Select
            label="Pilih SKU Internal Target"
            value={selectedMappingSkuId}
            onChange={(e) => setSelectedMappingSkuId(e.target.value)}
            options={skus.map((s) => ({
              value: s.id,
              label: s.skuCode,
            }))}
          />

          <Input
            label="Kode SKU di Marketplace (External SKU)"
            type="text"
            placeholder="Contoh: KHL-200G-SP"
            value={externalSku}
            onChange={(e) => setExternalSku(e.target.value)}
            required
            helperText="Sesuai kolom Nomor Referensi SKU di laporan OrderAll / Income marketplace."
          />

          <Input
            label="Nama Produk di Marketplace (Opsional)"
            type="text"
            placeholder="Contoh: Kurma Khalas 200gr Premium"
            value={externalProductName}
            onChange={(e) => setExternalProductName(e.target.value)}
          />

          <Input
            label="Nama Variasi di Marketplace (Opsional)"
            type="text"
            placeholder="Contoh: Kemasan 200g"
            value={externalVariantName}
            onChange={(e) => setExternalVariantName(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddMappingOpen(false)}
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
    </div>
  );
};
