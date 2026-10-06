export interface MarketplaceAdapter {
  code: 'SHOPEE' | 'TIKTOK' | 'TOKOPEDIA';
  name: string;
  detectFile(headers: string[]): boolean;
  normalizeOrders(input: unknown): unknown[];
  normalizeSettlements(input: unknown): unknown[];
}

export const SUPPORTED_MARKETPLACES = [
  {
    code: 'SHOPEE',
    name: 'Shopee Indonesia',
    color: '#EE4D2D',
    description: 'Impor pesanan, penghasilan (settlement escrow), dan potongan komisi',
  },
  {
    code: 'TIKTOK',
    name: 'TikTok Shop / Tokopedia',
    color: '#000000',
    description: 'Impor transaksi TikTok Shop Seller Center dan settlement bank',
  },
  {
    code: 'TOKOPEDIA',
    name: 'Tokopedia Seller',
    color: '#42B549',
    description: 'Impor pesanan selesai dan rincian saldo merchant Tokopedia',
  },
] as const;
