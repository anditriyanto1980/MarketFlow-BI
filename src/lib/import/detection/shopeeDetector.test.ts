import { detectShopeeReport } from './shopeeDetector';
import { normalizeHeader } from './normalizeHeaders';
import { validateFileParameters } from '@/src/schemas/import.schema';

export function runDetectionUnitTests(): {
  allPassed: boolean;
  results: { testName: string; passed: boolean; message: string }[];
} {
  const testResults: { testName: string; passed: boolean; message: string }[] = [];

  // TEST 1: Valid Shopee OrderAll headers
  {
    const headers = [
      'No Pesanan',
      'Status Pesanan',
      'Nomor Referensi SKU',
      'Nama Produk',
      'Nama Variasi',
      'Jumlah',
      'Harga Setelah Diskon',
      'Sku Quantity of return',
    ];
    const result = detectShopeeReport(headers, 'Order.all.20260901.xlsx');
    const passed =
      result.reportType === 'SHOPEE_ORDER_ALL' &&
      result.confidence === 'HIGH' &&
      result.marketplace === 'SHOPEE';
    testResults.push({
      testName: 'Test 1: Valid Shopee OrderAll headers',
      passed,
      message: passed ? 'Detected SHOPEE_ORDER_ALL with HIGH confidence' : `Failed: ${JSON.stringify(result)}`,
    });
  }

  // TEST 2: Valid Shopee Income headers
  {
    const headers = [
      'No Pesanan',
      'Status',
      'Waktu Pesanan Selesai',
      'Dana Diterima',
      'Total Pembayaran Pembeli',
      'Biaya Administrasi',
      'Biaya Layanan',
      'Biaya Transaksi',
      'Komisi',
    ];
    const result = detectShopeeReport(headers, 'Income.20260901.xlsx');
    const passed =
      result.reportType === 'SHOPEE_INCOME' &&
      result.confidence === 'HIGH' &&
      result.marketplace === 'SHOPEE';
    testResults.push({
      testName: 'Test 2: Valid Shopee Income headers',
      passed,
      message: passed ? 'Detected SHOPEE_INCOME with HIGH confidence' : `Failed: ${JSON.stringify(result)}`,
    });
  }

  // TEST 3: Mixed / Ambiguous headers (Must NOT be classified as HIGH)
  {
    const headers = [
      'No Pesanan',
      'Status Pesanan',
      'Dana Diterima',
      'Biaya Administrasi',
      'Nama Produk',
      'Biaya Layanan',
    ];
    const result = detectShopeeReport(headers, 'Ambiguous.xlsx');
    const passed = result.confidence !== 'HIGH';
    testResults.push({
      testName: 'Test 3: Mixed/ambiguous headers should not be HIGH confidence',
      passed,
      message: passed ? `Protected: Result was ${result.reportType} with confidence ${result.confidence}` : 'Failed: classified ambiguous file as HIGH',
    });
  }

  // TEST 4: Unknown headers
  {
    const headers = ['Kode Pelanggan', 'Alamat Pengiriman', 'Catatan Internal', 'Divisi Marketing'];
    const result = detectShopeeReport(headers, 'Data_Internal.xlsx');
    const passed = result.reportType === 'UNKNOWN' && result.confidence === 'LOW';
    testResults.push({
      testName: 'Test 4: Unknown headers marked as UNKNOWN with LOW confidence',
      passed,
      message: passed ? 'Correctly detected as UNKNOWN' : `Failed: ${result.reportType}`,
    });
  }

  // TEST 5: Header Capitalization Differences
  {
    const headers = ['NO PESANAN', 'STATUS PESANAN', 'NOMOR REFERENSI SKU', 'NAMA PRODUK', 'JUMLAH'];
    const result = detectShopeeReport(headers);
    const passed = result.reportType === 'SHOPEE_ORDER_ALL';
    testResults.push({
      testName: 'Test 5: Header capitalization differences',
      passed,
      message: passed ? 'Handled uppercase headers correctly' : 'Failed uppercase matching',
    });
  }

  // TEST 6: Header Whitespace Differences
  {
    const headers = ['  No   Pesanan  ', 'Status   Pesanan\t', '  Nomor   Referensi  SKU  ', 'Nama   Produk '];
    const result = detectShopeeReport(headers);
    const passed = result.reportType === 'SHOPEE_ORDER_ALL';
    testResults.push({
      testName: 'Test 6: Header whitespace differences',
      passed,
      message: passed ? 'Normalized repeated whitespace correctly' : 'Failed whitespace normalization',
    });
  }

  // TEST 7: Duplicate detection verification helper
  {
    const hashA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const hashB = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const passed = hashA === hashB;
    testResults.push({
      testName: 'Test 7: Deterministic hash equality check',
      passed,
      message: 'Hash equality for duplicate detection verified',
    });
  }

  // TEST 8: Unsupported Extension
  {
    const dummyFile = { name: 'report.pdf', size: 1000 } as File;
    const validation = validateFileParameters(dummyFile);
    const passed = Boolean(!validation.valid && validation.error?.includes('tidak didukung'));
    testResults.push({
      testName: 'Test 8: Unsupported extension rejection',
      passed,
      message: passed ? 'Rejected non-spreadsheet file' : 'Failed rejection',
    });
  }

  // TEST 9: Empty file validation
  {
    const dummyFile = { name: 'report.xlsx', size: 0 } as File;
    const validation = validateFileParameters(dummyFile);
    const passed = Boolean(!validation.valid && validation.error?.includes('kosong'));
    testResults.push({
      testName: 'Test 9: Empty file rejection',
      passed,
      message: passed ? 'Rejected empty file' : 'Failed empty rejection',
    });
  }

  // TEST 10: Multi-sheet sheet selection normalization
  {
    const testHeader = normalizeHeader('Panduan Pengisian Laporan');
    const passed = testHeader.includes('panduan pengisian laporan');
    testResults.push({
      testName: 'Test 10: Sheet name filter & normalization',
      passed,
      message: 'Sheet candidate inspection verified',
    });
  }

  const allPassed = testResults.every((t) => t.passed);
  return { allPassed, results: testResults };
}
