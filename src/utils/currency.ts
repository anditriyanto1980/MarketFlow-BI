/**
 * Indonesian Rupiah (IDR) currency formatting utility
 * Uses Intl.NumberFormat with id-ID locale and IDR currency.
 */
export function formatIDR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseIDRInput(input: string): number {
  const clean = input.replace(/[^0-9]/g, '');
  return parseInt(clean, 10) || 0;
}
