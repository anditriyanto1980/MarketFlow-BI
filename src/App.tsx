import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth/auth-context';
import { AuthPage } from './components/auth/AuthPage';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { AppShell } from './components/layout/AppShell';
import type { NavItemKey } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { StoresView } from './components/stores/StoresView';
import { ProductsView } from './components/products/ProductsView';
import { SkuMappingView } from './components/products/SkuMappingView';
import { HPPView } from './components/products/HPPView';
import { BusinessSettingsView } from './components/settings/BusinessSettingsView';
import { TeamSettingsView } from './components/settings/TeamSettingsView';
import { ImportView } from './components/import/ImportView';
import { ImportHistoryView } from './components/import/ImportHistoryView';
import { PlaceholderModuleView } from './components/shared/PlaceholderModuleView';
import { NewBusinessModal } from './components/layout/NewBusinessModal';
import { LoadingState } from './components/shared/LoadingState';

const MainApp: React.FC = () => {
  const { currentUser, userProfile, currentBusiness, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [isNewBusinessModalOpen, setIsNewBusinessModalOpen] = useState(false);

  // Loading initial authentication state
  if (loading) {
    return <LoadingState message="Memuat sesi MarketFlow BI..." fullScreen />;
  }

  // Not signed in -> Auth View
  if (!currentUser) {
    return <AuthPage />;
  }

  // Signed in, but onboarding incomplete or no active business workspace
  if (!userProfile?.onboardingCompleted || !currentBusiness) {
    return <OnboardingWizard onComplete={() => setCurrentTab('dashboard')} />;
  }

  // Authenticated and onboarded -> Dashboard Shell
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAddStore={() => setCurrentTab('master-stores')}
            onOpenAddProduct={() => setCurrentTab('master-products')}
          />
        );

      case 'master-stores':
        return <StoresView />;

      case 'master-products':
        return <ProductsView />;

      case 'master-mappings':
        return <SkuMappingView />;

      case 'master-hpp':
        return <HPPView />;

      case 'settings-business':
        return <BusinessSettingsView />;

      case 'settings-team':
        return <TeamSettingsView />;

      case 'import':
        return <ImportView onNavigateToHistory={() => setCurrentTab('import-history')} />;

      case 'import-history':
        return <ImportHistoryView onNavigateToUpload={() => setCurrentTab('import')} />;

      case 'analytics-sales':
        return (
          <PlaceholderModuleView
            title="Analitik Penjualan (Sales Intelligence)"
            category="Analytics Engine"
            description="Grafik tren gross sales, net sales harian, Average Order Value (AOV), dan perbandingan performa antar channel marketplace."
            plannedPhase="Phase 2 — Business Analytics"
            roadmapDetails={[
              'Perhitungan Net Sales riil setelah dikurangi diskon voucher dan retur',
              'Visualisasi tren waktu berdasarkan zona waktu Asia/Jakarta (WIB)',
              'Analisis per channel (Shopee vs TikTok vs Tokopedia)',
            ]}
          />
        );

      case 'analytics-profit':
        return (
          <PlaceholderModuleView
            title="Analitik Laba & Profit (Profit Engine)"
            category="Analytics Engine"
            description="Kalkulasi otomatis Gross Profit, Contribution Profit, dan Net Profit per toko serta per SKU internal menggunakan struktur HPP riil."
            plannedPhase="Phase 2 — Business Analytics"
            roadmapDetails={[
              'Gross Profit = Net Sales - HPP',
              'Contribution Profit = Gross Profit - (Biaya Admin + Pembayaran + Iklan + Bahan Packing)',
              'Net Profit = Contribution Profit - Biaya Tetap Operasional',
              'Analisis persentase margin keuntungan per produk',
            ]}
          />
        );

      case 'analytics-products':
        return (
          <PlaceholderModuleView
            title="Performa Produk (Product Intelligence)"
            category="Analytics Engine"
            description="Peringkat produk terlaris, produk pemberi kontribusi laba terbesar, serta deteksi produk dengan tingkat retur tinggi."
            plannedPhase="Phase 2 — Business Analytics"
            roadmapDetails={[
              'Analisis pareto 80/20 untuk kontributor profit terbesar',
              'Pelacakan kecepatan perputaran stok berdasarkan order terselesaikan',
              'Deteksi SKU dengan biaya packing/margin yang tergerus potongan komisi marketplace',
            ]}
          />
        );

      case 'analytics-marketplaces':
        return (
          <PlaceholderModuleView
            title="Perbandingan Marketplace (Marketplace Comparison)"
            category="Analytics Engine"
            description="Komparasi efisiensi komisi, biaya layanan, dan volume penjualan antara Shopee, TikTok Shop, dan Tokopedia."
            plannedPhase="Phase 2 — Business Analytics"
            roadmapDetails={[
              'Rasio biaya admin efektif yang dipotong oleh masing-masing marketplace',
              'Pangsa pasar internal (Market share per channel)',
              'Tingkat keberhasilan pesanan dan settlement',
            ]}
          />
        );

      case 'reconciliation':
        return (
          <PlaceholderModuleView
            title="Rekonsiliasi Settlement Marketplace"
            category="Reconciliation Engine"
            description="Pencocokan otomatis antara pesanan selesai di OrderAll dengan dana riil yang masuk di laporan escrow/settlement (Income)."
            plannedPhase="Phase 3 — Reconciliation & Auditing"
            roadmapDetails={[
              'Pencocokan kunci: Nomor Pesanan, SKU, Kuantitas, dan Nilai Escrow',
              'Status hasil: MATCHED, PARTIAL, MISMATCH, MISSING_ORDER, MISSING_SETTLEMENT, DUPLICATE',
              'Deteksi selisih potongan yang tidak sesuai ketentuan marketplace',
            ]}
          />
        );

      case 'reports':
        return (
          <PlaceholderModuleView
            title="Laporan Terkonsolidasi (Consolidated Reports)"
            category="Reporting"
            description="Ekspor laporan laba rugi periodik, rekap settlement, dan rincian biaya ke format Excel/PDF untuk kebutuhan akuntansi dan pajak UMKM."
            plannedPhase="Phase 3 — Reconciliation & Auditing"
            roadmapDetails={[
              'Ekspor format spreadsheet rapi dengan standar akuntansi UMKM Indonesia',
              'Rekapitulasi biaya potongan admin marketplace untuk pelaporan pajak',
              'Laporan bulanan otomatis',
            ]}
          />
        );

      case 'settings-subscription':
        return (
          <PlaceholderModuleView
            title="Paket Berlangganan & Kuota (Subscription)"
            category="Account & Billing"
            description="Informasi paket MarketFlow BI, batas kuota pesanan per bulan, serta pengelolaan metode pembayaran."
            plannedPhase="Phase 4 — Enterprise & Subscriptions"
            roadmapDetails={[
              'Status paket aktif untuk UMKM',
              'Monitoring kuota baris transaksi yang diimport',
              'Akses fitur multi-user dan AI Business Analyst',
            ]}
          />
        );

      default:
        return (
          <DashboardView
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAddStore={() => setCurrentTab('master-stores')}
            onOpenAddProduct={() => setCurrentTab('master-products')}
          />
        );
    }
  };

  return (
    <AppShell
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      onOpenNewBusinessModal={() => setIsNewBusinessModalOpen(true)}
    >
      {renderTabContent()}

      <NewBusinessModal
        isOpen={isNewBusinessModalOpen}
        onClose={() => setIsNewBusinessModalOpen(false)}
      />
    </AppShell>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
