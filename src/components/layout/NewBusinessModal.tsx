import React, { useState } from 'react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { createBusinessWithMembership } from '@/src/services/business.service';
import { Dialog } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { getReadableErrorMessage } from '@/src/utils/errors';
import type { BusinessType } from '@/src/types/business';
import { AlertCircle } from 'lucide-react';

interface NewBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewBusinessModal: React.FC<NewBusinessModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, switchBusiness, refreshBusiness } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('UMKM');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!businessName.trim() || businessName.trim().length < 2) {
      setError('Nama bisnis minimal 2 karakter.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const { businessId } = await createBusinessWithMembership(
        currentUser.uid,
        currentUser.email || '',
        currentUser.displayName || currentUser.email?.split('@')[0] || 'Owner',
        {
          name: businessName.trim(),
          businessType,
          currency: 'IDR',
          timezone: 'Asia/Jakarta',
        }
      );

      await refreshBusiness();
      await switchBusiness(businessId);
      onClose();
      setBusinessName('');
    } catch (err) {
      setError(getReadableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Bisnis / Workspace Baru"
      description="Tambahkan workspace terpisah untuk brand atau badan usaha berbeda."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Nama Bisnis / Brand"
          type="text"
          placeholder="Contoh: Toko Kopi Nusantara"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
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

        <div className="pt-3 flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Buat Workspace
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
