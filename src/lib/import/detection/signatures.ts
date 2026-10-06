export interface SignatureRule {
  target: string;
  weight: number; // 25: Strong, 15: Medium, 8: Weak
  category: 'ORDER_ALL' | 'INCOME';
}

/**
 * Shopee OrderAll / Orders signature definitions
 */
export const SHOPEE_ORDER_ALL_SIGNATURES: SignatureRule[] = [
  // Strong Indicators (High weight)
  { target: 'no pesanan', weight: 25, category: 'ORDER_ALL' },
  { target: 'order sn', weight: 25, category: 'ORDER_ALL' },
  { target: 'status pesanan', weight: 25, category: 'ORDER_ALL' },
  { target: 'order status', weight: 25, category: 'ORDER_ALL' },
  { target: 'nomor referensi sku', weight: 25, category: 'ORDER_ALL' },
  { target: 'sku reference no', weight: 25, category: 'ORDER_ALL' },
  { target: 'nama produk', weight: 20, category: 'ORDER_ALL' },
  { target: 'product name', weight: 20, category: 'ORDER_ALL' },
  { target: 'nama variasi', weight: 20, category: 'ORDER_ALL' },
  { target: 'variation name', weight: 20, category: 'ORDER_ALL' },
  { target: 'jumlah', weight: 15, category: 'ORDER_ALL' },
  { target: 'quantity', weight: 15, category: 'ORDER_ALL' },

  // Medium Indicators
  { target: 'sku induk', weight: 15, category: 'ORDER_ALL' },
  { target: 'parent sku', weight: 15, category: 'ORDER_ALL' },
  { target: 'harga setelah diskon', weight: 15, category: 'ORDER_ALL' },
  { target: 'deal price', weight: 15, category: 'ORDER_ALL' },
  { target: 'status pembatalan', weight: 15, category: 'ORDER_ALL' },
  { target: 'sku quantity of return', weight: 20, category: 'ORDER_ALL' },
  { target: 'jumlah produk dikembalikan', weight: 20, category: 'ORDER_ALL' },
  { target: 'opsi pengiriman', weight: 10, category: 'ORDER_ALL' },
  { target: 'waktu pesanan dibuat', weight: 10, category: 'ORDER_ALL' },
  { target: 'waktu pembayaran dilakukan', weight: 10, category: 'ORDER_ALL' },
];

/**
 * Shopee Income / Settlement signature definitions
 */
export const SHOPEE_INCOME_SIGNATURES: SignatureRule[] = [
  // Strong Financial / Settlement Indicators (High weight)
  { target: 'dana dilepaskan', weight: 30, category: 'INCOME' },
  { target: 'dana diterima', weight: 30, category: 'INCOME' },
  { target: 'penghasilan', weight: 25, category: 'INCOME' },
  { target: 'total penghasilan', weight: 30, category: 'INCOME' },
  { target: 'biaya administrasi', weight: 25, category: 'INCOME' },
  { target: 'biaya admin', weight: 25, category: 'INCOME' },
  { target: 'biaya layanan', weight: 25, category: 'INCOME' },
  { target: 'biaya transaksi', weight: 25, category: 'INCOME' },
  { target: 'biaya komisi', weight: 25, category: 'INCOME' },
  { target: 'komisi', weight: 20, category: 'INCOME' },
  { target: 'settlement', weight: 25, category: 'INCOME' },
  { target: 'payout', weight: 25, category: 'INCOME' },
  { target: 'waktu pesanan selesai', weight: 20, category: 'INCOME' },

  // Medium Indicators
  { target: 'total pembayaran pembeli', weight: 15, category: 'INCOME' },
  { target: 'biaya pengembalian', weight: 15, category: 'INCOME' },
  { target: 'voucher ditanggung penjual', weight: 15, category: 'INCOME' },
  { target: 'diskon produk dari penjual', weight: 15, category: 'INCOME' },
  { target: 'ongkos kirim dibayar pembeli', weight: 10, category: 'INCOME' },
  { target: 'ongkos kirim diteruskan', weight: 10, category: 'INCOME' },
  { target: 'premi asuransi', weight: 10, category: 'INCOME' },
];
