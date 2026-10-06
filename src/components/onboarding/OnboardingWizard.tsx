import React, { useState } from 'react';
import { Building2, Store, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { createBusinessWithMembership } from '@/src/services/business.service';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { getReadableErrorMessage } from '@/src/utils/errors';
import type { BusinessType } from '@/src/types/business';
import type { MarketplaceCode } from '@/src/types/store';

export const OnboardingWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { currentUser, refreshProfile } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Business state
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('UMKM');

  // Step 2: Store state
  const [marketplace, setMarketplace] = useState<MarketplaceCode>('SHOPEE');
  const [storeName, setStoreName] = useState('');
  const [externalStoreId, setExternalStoreId] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || businessName.trim().length < 2) {
      setError('Nama bisnis minimal 2 karakter.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || storeName.trim().length < 2) {
      setError('Nama toko minimal 2 karakter.');
      return;
    }

    if (!currentUser) return;

    setError(null);
    setIsLoading(true);

    try {
      await createBusinessWithMembership(
        currentUser.uid,
        currentUser.email || '',
        currentUser.displayName || currentUser.email?.split('@')[0] || 'Owner',
        {
          name: businessName.trim(),
          businessType,
          currency: 'IDR',
          timezone: 'Asia/Jakarta',
        },
        {
          marketplace,
          storeName: storeName.trim(),
          externalStoreId: externalStoreId.trim() || undefined,
        }
      );

      await refreshProfile();
      onComplete();
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-stone-100 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Header */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F5132] border border-emerald-600/50 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5 text-emerald-300" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold text-stone-100">
          Selamat Datang di MarketFlow BI
        </h2>
        <p className="mt-1 text-center text-xs md:text-sm text-stone-400">
          Konfigurasikan bisnis dan saluran marketplace pertama Anda dalam 2 langkah mudah.
        </p>

        {/* Step Indicator */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 1 ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
              }`}
            >
              1
            </div>
            <span className="text-xs font-medium text-stone-300">Profil Bisnis</span>
          </div>
          <div className="w-10 h-[2px] bg-stone-800" />
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === 2 ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
              }`}
            >
              2
            </div>
            <span className="text-xs font-medium text-stone-300">Toko Marketplace</span>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-stone-900/90 py-8 px-6 shadow-2xl rounded-2xl border border-stone-800/90 sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: BUSINESS PROFILE */
            <form onSubmit={handleStep1Next} className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-800 text-stone-200">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold">Langkah 1: Identitas Bisnis</h3>
              </div>

              <Input
                label="Nama Bisnis / Brand"
                type="text"
                placeholder="Contoh: Kopi Nusantara / Berkah Fashion"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                helperText="Nama workspace atau perusahaan Anda yang menaungi toko-toko online."
              />

              <Select
                label="Jenis Bisnis"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                options={[
                  { value: 'UMKM', label: 'UMKM (Usaha Mikro, Kecil & Menengah)' },
                  { value: 'ONLINE_SELLER', label: 'Online Seller / Reseller' },
                  { value: 'RETAIL', label: 'Retail & Store' },
                  { value: 'DISTRIBUTOR', label: 'Distributor / Grosir' },
                  { value: 'OTHER', label: 'Lainnya' },
                ]}
              />

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Input
                  label="Mata Uang Utama"
                  value="IDR (Rupiah Indonesia)"
                  disabled
                  helperText="Format baku laporan keuangan"
                />
                <Input
                  label="Zona Waktu Bisnis"
                  value="Asia/Jakarta (WIB)"
                  disabled
                  helperText="Waktu penutupan transaksi harian"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Lanjut ke Toko Marketplace
                </Button>
              </div>
            </form>
          ) : (
            /* STEP 2: FIRST STORE */
            <form onSubmit={handleFinishOnboarding} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-stone-200">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold">Langkah 2: Toko Pertama</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </button>
              </div>

              <Select
                label="Pilih Saluran Marketplace"
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value as MarketplaceCode)}
                options={[
                  { value: 'SHOPEE', label: 'Shopee Indonesia' },
                  { value: 'TIKTOK', label: 'TikTok Shop / Tokopedia' },
                  { value: 'TOKOPEDIA', label: 'Tokopedia Seller' },
                ]}
              />

              <Input
                label="Nama Toko di Marketplace"
                type="text"
                placeholder="Contoh: Berkah Official Store"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                helperText="Sesuai nama toko Anda di Seller Centre marketplace tersebut."
              />

              <Input
                label="ID Toko / Username Toko (Opsional)"
                type="text"
                placeholder="Contoh: berkah_official"
                value={externalStoreId}
                onChange={(e) => setExternalStoreId(e.target.value)}
                helperText="Untuk mempermudah pemetaan otomatis saat import laporan."
              />

              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Kembali
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isLoading}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Selesaikan & Buka Dashboard
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
