import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Barcode,
  Layers,
  Archive,
  Edit2,
  ExternalLink,
  AlertCircle,
  ShieldAlert,
  Boxes,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { hasPermission } from '@/src/lib/auth/permissions';
import {
  getProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  getSkus,
  createSku,
  getVariants,
} from '@/src/services/product.service';
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
import { ProductDetailView } from './ProductDetailView';
import type { Product, SKU, ProductStatus } from '@/src/types/product';

export const ProductsView: React.FC = () => {
  const { currentBusiness, currentRole, currentUser } = useAuth();
  const canManageProducts = hasPermission(currentRole, 'MANAGE_PRODUCTS');

  const [products, setProducts] = useState<Product[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected product for drill-down detail view
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');

  // Dialogs
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isAddSkuForProduct, setIsAddSkuForProduct] = useState<Product | null>(null);

  // Form states - Create Product
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [initialSkuCode, setInitialSkuCode] = useState('');

  // Form states - Quick Add SKU
  const [newSkuCode, setNewSkuCode] = useState('');
  const [newBarcode, setNewBarcode] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const [fetchedProducts, fetchedSkus] = await Promise.all([
        getProducts(currentBusiness.id),
        getSkus(currentBusiness.id),
      ]);
      setProducts(fetchedProducts);
      setSkus(fetchedSkus);
    } catch (err) {
      console.error('Failed to load products/skus:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique categories and brands for filtering
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c && c.trim())))
  );
  const brands = Array.from(
    new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b && b.trim())))
  );

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser) return;
    if (!name.trim() || name.trim().length < 2) {
      setFormError('Nama produk minimal 2 karakter.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await createProduct(currentBusiness.id, currentUser.uid, {
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        initialSkuCode: initialSkuCode.trim() || undefined,
      });

      setIsAddModalOpen(false);
      setName('');
      setBrand('');
      setCategory('');
      setDescription('');
      setInitialSkuCode('');
      await loadData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser || !editProduct) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await updateProduct(currentBusiness.id, editProduct.id, currentUser.uid, {
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
      });

      setEditProduct(null);
      await loadData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (prod: Product) => {
    if (!currentBusiness || !currentUser) return;
    if (confirm(`Apakah Anda yakin ingin mengarsipkan produk "${prod.name}"?`)) {
      try {
        await archiveProduct(currentBusiness.id, prod.id, currentUser.uid);
        await loadData();
      } catch (err) {
        alert(getReadableErrorMessage(err));
      }
    }
  };

  const handleAddSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !currentUser || !isAddSkuForProduct) return;
    if (!newSkuCode.trim()) {
      setFormError('Kode SKU internal wajib diisi.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await createSku(currentBusiness.id, currentUser.uid, {
        productId: isAddSkuForProduct.id,
        skuCode: newSkuCode.trim(),
        barcode: newBarcode.trim() || undefined,
      });

      setIsAddSkuForProduct(null);
      setNewSkuCode('');
      setNewBarcode('');
      await loadData();
    } catch (err) {
      setFormError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // If a product is selected for detail view, show ProductDetailView!
  if (selectedProductId) {
    return (
      <ProductDetailView
        productId={selectedProductId}
        onBack={() => setSelectedProductId(null)}
        onRefreshParent={loadData}
      />
    );
  }

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
    if (brandFilter !== 'ALL' && p.brand !== brandFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchBrand = p.brand?.toLowerCase().includes(q);
      const matchCat = p.category?.toLowerCase().includes(q);

      // Also search by associated SKU codes
      const prodSkus = skus.filter((s) => s.productId === p.id);
      const matchSku = prodSkus.some(
        (s) => s.skuCode.toLowerCase().includes(q) || s.barcode?.toLowerCase().includes(q)
      );

      if (!matchName && !matchBrand && !matchCat && !matchSku) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog Produk & SKU Universal"
        subtitle="Master produk internal yang menghubungkan seluruh varian dan channel marketplace (Shopee, TikTok, Tokopedia)."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Fitur import massal via Excel akan aktif pada fase berikutnya"
              icon={<FileSpreadsheet className="w-3.5 h-3.5 text-stone-400" />}
            >
              Import Produk (Segera Hadir)
            </Button>
            {canManageProducts && (
              <Button
                variant="primary"
                onClick={() => {
                  setName('');
                  setBrand('');
                  setCategory('');
                  setDescription('');
                  setInitialSkuCode('');
                  setFormError(null);
                  setIsAddModalOpen(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                + Tambah Produk
              </Button>
            )}
          </div>
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
              placeholder="Cari nama, SKU, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="w-full px-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif (Arsip)</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
          >
            <option value="ALL">Semua Brand</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="w-10 h-10 text-emerald-400" />}
          title="Belum ada produk"
          description="Tambahkan master produk pertama Anda untuk mulai mengorganisir SKU dan struktur HPP."
          primaryAction={
            canManageProducts
              ? {
                  label: '+ Tambah Produk',
                  onClick: () => {
                    setName('');
                    setBrand('');
                    setCategory('');
                    setDescription('');
                    setInitialSkuCode('');
                    setIsAddModalOpen(true);
                  },
                }
              : undefined
          }
          extraActions={
            <Button variant="outline" size="sm" disabled>
              Import Produk (Segera Hadir)
            </Button>
          }
        />
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 text-center text-xs text-stone-500 bg-stone-900/40 rounded-xl border border-stone-800">
          Tidak ada produk yang cocok dengan filter pencarian Anda.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((prod) => {
            const prodSkus = skus.filter((s) => s.productId === prod.id);

            return (
              <div
                key={prod.id}
                className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 shadow-xs hover:border-stone-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Left product header & info */}
                  <div
                    onClick={() => setSelectedProductId(prod.id)}
                    className="flex items-start gap-3.5 cursor-pointer flex-1"
                  >
                    <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-emerald-400 shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-stone-100 text-sm md:text-base hover:text-emerald-300 transition-colors">
                          {prod.name}
                        </h3>
                        <StatusBadge status={prod.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400 mt-1">
                        {prod.brand && (
                          <span>
                            Brand: <strong className="text-stone-300">{prod.brand}</strong>
                          </span>
                        )}
                        {prod.category && (
                          <span>
                            Kategori: <strong className="text-stone-300">{prod.category}</strong>
                          </span>
                        )}
                        <span>Dibuat: {formatDate(prod.createdAt)}</span>
                      </div>

                      {prod.description && (
                        <p className="text-xs text-stone-500 line-clamp-1 mt-1 max-w-2xl">
                          {prod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedProductId(prod.id)}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      Buka Rincian
                    </Button>

                    {canManageProducts && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditProduct(prod);
                            setName(prod.name);
                            setBrand(prod.brand || '');
                            setCategory(prod.category || '');
                            setDescription(prod.description || '');
                            setFormError(null);
                          }}
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Ubah
                        </Button>
                        {prod.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleArchive(prod)}
                            className="text-stone-400 hover:text-red-400"
                            icon={<Archive className="w-3.5 h-3.5" />}
                          >
                            Arsipkan
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* SKUs Tag List */}
                <div className="mt-4 pt-3 border-t border-stone-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5" />
                      SKU ({prodSkus.length}):
                    </span>
                    {prodSkus.length === 0 ? (
                      <span className="text-stone-500 italic text-[11px]">Belum ada SKU</span>
                    ) : (
                      prodSkus.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 font-mono font-semibold text-emerald-400 text-[11px]"
                        >
                          {s.skuCode}
                        </span>
                      ))
                    )}
                  </div>

                  {canManageProducts && (
                    <button
                      onClick={() => {
                        setIsAddSkuForProduct(prod);
                        setNewSkuCode('');
                        setNewBarcode('');
                        setFormError(null);
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Tambah SKU
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DIALOG: Create Product */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Master Produk Baru"
        description="Daftarkan entitas produk universal untuk menaungi varian, SKU, dan HPP."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Nama Master Produk"
            type="text"
            placeholder="Contoh: Akram Kurma Khalas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Brand / Merek"
              type="text"
              placeholder="Contoh: Akram"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <Input
              label="Kategori"
              type="text"
              placeholder="Contoh: Kurma"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-300">Deskripsi (Opsional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-stone-900 border border-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
              placeholder="Catatan internal..."
            />
          </div>

          <Input
            label="Kode SKU Pertama (Opsional)"
            type="text"
            placeholder="Contoh: AK-KHL-500"
            value={initialSkuCode}
            onChange={(e) => setInitialSkuCode(e.target.value)}
            helperText="Otomatis membuat SKU awal agar langsung dapat dipetakan."
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
              Simpan Produk
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DIALOG: Edit Product */}
      {editProduct && (
        <Dialog
          isOpen={true}
          onClose={() => setEditProduct(null)}
          title="Ubah Master Produk"
          description="Perbarui informasi identitas produk katalog."
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Brand / Merek"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
              <Input
                label="Kategori"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-300">Deskripsi</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg bg-stone-900 border border-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditProduct(null)}
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

      {/* DIALOG: Quick Add SKU */}
      {isAddSkuForProduct && (
        <Dialog
          isOpen={true}
          onClose={() => setIsAddSkuForProduct(null)}
          title={`Tambah SKU untuk: ${isAddSkuForProduct.name}`}
          description="Kode SKU internal harus unik di seluruh bisnis Anda."
        >
          <form onSubmit={handleAddSku} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <Input
              label="Kode SKU Internal"
              type="text"
              placeholder="Contoh: AK-KHL-200"
              value={newSkuCode}
              onChange={(e) => setNewSkuCode(e.target.value)}
              required
              helperText="Kode identitas unik per unit produk."
            />

            <Input
              label="Barcode (Opsional)"
              type="text"
              placeholder="Contoh: 8991234567890"
              value={newBarcode}
              onChange={(e) => setNewBarcode(e.target.value)}
            />

            <div className="pt-3 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAddSkuForProduct(null)}
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
      )}
    </div>
  );
};
