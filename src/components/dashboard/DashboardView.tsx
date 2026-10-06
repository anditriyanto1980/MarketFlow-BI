import React, { useEffect, useState, useCallback } from 'react';
import {
  UploadCloud,
  Store as StoreIcon,
  Package,
  Boxes,
  CheckCircle2,
  Circle,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Building,
  Info,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { getStores } from '@/src/services/store.service';
import { getProducts } from '@/src/services/product.service';
import { Card, CardHeader } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/shared/EmptyState';
import { Skeleton } from '@/src/components/shared/LoadingState';
import type { Store } from '@/src/types/store';
import type { Product } from '@/src/types/product';
import type { NavItemKey } from '@/src/components/layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavItemKey) => void;
  onOpenAddStore: () => void;
  onOpenAddProduct: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenAddStore,
  onOpenAddProduct,
}) => {
  const { currentBusiness, userProfile } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportNotice, setShowImportNotice] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const [fetchedStores, fetchedProducts] = await Promise.all([
        getStores(currentBusiness.id),
        getProducts(currentBusiness.id),
      ]);
      setStores(fetchedStores);
      setProducts(fetchedProducts);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const hasStores = stores.length > 0;
  const hasProducts = products.length > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0F5132]/30 via-stone-900 to-stone-900 border border-emerald-900/40 rounded-2xl p-6 md:p-8">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold mb-3">
            <Building className="w-3.5 h-3.5" />
            <span>Workspace: {currentBusiness?.name}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-stone-100 tracking-tight">
            Selamat datang, {userProfile?.displayName || 'Partner'}!
          </h1>
          <p className="text-xs md:text-sm text-stone-300 mt-2 leading-relaxed">
            MarketFlow BI siap mengkonsolidasi data penjualan, settlement, biaya marketplace, dan HPP dari Shopee, TikTok Shop, dan Tokopedia Anda.
          </p>
        </div>
      </div>

      {/* Setup Checklist */}
      <Card>
        <CardHeader
          title="Panduan Memulai (Setup Checklist)"
          subtitle="Selesaikan langkah persiapan awal untuk membuka seluruh modul analitik dan rekonsiliasi."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Step 1: Workspace */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Langkah 1
                </span>
              </div>
              <h4 className="text-sm font-semibold text-stone-200">Workspace Bisnis</h4>
              <p className="text-xs text-stone-400 mt-1">
                Workspace &quot;{currentBusiness?.name}&quot; aktif ({currentBusiness?.businessType}).
              </p>
            </div>
            <div className="mt-4">
              <span className="text-[11px] text-emerald-400 font-medium">✓ Selesai</span>
            </div>
          </div>

          {/* Step 2: Store */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {hasStores ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-stone-500" />
                )}
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    hasStores ? 'text-emerald-300' : 'text-stone-400'
                  }`}
                >
                  Langkah 2
                </span>
              </div>
              <h4 className="text-sm font-semibold text-stone-200">Hubungkan Toko</h4>
              <p className="text-xs text-stone-400 mt-1">
                {hasStores
                  ? `${stores.length} toko terdaftar (${stores.map((s) => s.storeName).join(', ')})`
                  : 'Daftarkan toko marketplace (Shopee, TikTok, Tokopedia).'}
              </p>
            </div>
            <div className="mt-4">
              {hasStores ? (
                <button
                  onClick={() => onNavigate('master-stores')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                >
                  Kelola Toko <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <Button size="sm" variant="secondary" onClick={onOpenAddStore}>
                  + Tambah Toko
                </Button>
              )}
            </div>
          </div>

          {/* Step 3: Products */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {hasProducts ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-stone-500" />
                )}
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    hasProducts ? 'text-emerald-300' : 'text-stone-400'
                  }`}
                >
                  Langkah 3
                </span>
              </div>
              <h4 className="text-sm font-semibold text-stone-200">Katalog Produk & SKU</h4>
              <p className="text-xs text-stone-400 mt-1">
                {hasProducts
                  ? `${products.length} master produk terdaftar.`
                  : 'Daftarkan produk dan SKU internal untuk pemetaan pesanan.'}
              </p>
            </div>
            <div className="mt-4">
              {hasProducts ? (
                <button
                  onClick={() => onNavigate('master-products')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                >
                  Kelola Produk <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <Button size="sm" variant="secondary" onClick={onOpenAddProduct}>
                  + Tambah Produk
                </Button>
              )}
            </div>
          </div>

          {/* Step 4: Import */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-stone-500">
                <Circle className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Langkah 4
                </span>
              </div>
              <h4 className="text-sm font-semibold text-stone-200">Upload Laporan</h4>
              <p className="text-xs text-stone-400 mt-1">
                Unggah laporan pesanan (OrderAll) & penghasilan (Income).
              </p>
            </div>
            <div className="mt-4">
              <Button
                size="sm"
                variant="primary"
                onClick={() => onNavigate('import')}
                icon={<UploadCloud className="w-3.5 h-3.5" />}
              >
                Upload Laporan
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction Data Section — Empty State Mandate (Section 29) */}
      <Card>
        <CardHeader
          title="Ringkasan Performa Transaksi & Profit"
          subtitle="Data terverifikasi hasil rekonsiliasi laporan marketplace."
        />

        {showImportNotice && (
          <div className="mb-6 p-4 rounded-xl bg-stone-950 border border-emerald-900/60 flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-300 space-y-1">
              <p className="font-semibold text-stone-100">
                Step 4A: Shopee File Import & Auto Detection Aktif
              </p>
              <p>
                Modul parsing XLSX/CSV dan deteksi otomatis untuk laporan Shopee OrderAll & Income telah aktif di tab <strong>Import Data</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Intentional Empty State — NO fake 0 or fake metrics! */}
        <EmptyState
          icon={<FileSpreadsheet className="w-10 h-10 text-emerald-400" />}
          title="Belum ada data transaksi"
          description="Upload laporan marketplace untuk mulai melihat penjualan, profit, dan performa bisnis Anda."
          primaryAction={{
            label: 'Upload Marketplace Report',
            onClick: () => onNavigate('import'),
            icon: <UploadCloud className="w-4 h-4" />,
          }}
          secondaryAction={
            !hasStores
              ? {
                  label: '+ Tambah Toko Baru',
                  onClick: onOpenAddStore,
                  icon: <StoreIcon className="w-4 h-4" />,
                }
              : !hasProducts
              ? {
                  label: '+ Tambah Produk Pertama',
                  onClick: onOpenAddProduct,
                  icon: <Package className="w-4 h-4" />,
                }
              : undefined
          }
        />
      </Card>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="hover:border-stone-700" onClick={() => onNavigate('master-stores')}>
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-400">
              <StoreIcon className="w-5 h-5" />
            </div>
            <span className="text-xs text-stone-400 flex items-center gap-1 font-medium">
              Buka <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-100">{stores.length}</div>
            <div className="text-xs text-stone-400 mt-0.5">Toko Marketplace Terhubung</div>
          </div>
        </Card>

        <Card className="hover:border-stone-700" onClick={() => onNavigate('master-products')}>
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-blue-950/50 border border-blue-800/40 text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs text-stone-400 flex items-center gap-1 font-medium">
              Buka <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-100">{products.length}</div>
            <div className="text-xs text-stone-400 mt-0.5">Produk Master Terdaftar</div>
          </div>
        </Card>

        <Card className="hover:border-stone-700" onClick={() => onNavigate('master-hpp')}>
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-amber-950/50 border border-amber-800/40 text-amber-400">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-xs text-stone-400 flex items-center gap-1 font-medium">
              Buka <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-sm font-semibold text-stone-200 mt-1">Struktur Biaya & HPP</div>
            <div className="text-xs text-stone-400 mt-0.5">Konfigurasi HPP & Bahan Packing</div>
          </div>
        </Card>
      </div>
    </div>
  );
};
