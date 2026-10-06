import React from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Hash,
  User,
  Layers,
  Table as TableIcon,
  Tag,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardHeader } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { StatusBadge } from '@/src/components/shared/StatusBadge';
import { formatDateTime } from '@/src/utils/dates';
import type { ImportFile } from '@/src/types/import';

interface ImportDetailViewProps {
  importFile: ImportFile;
  onBack: () => void;
}

export const ImportDetailView: React.FC<ImportDetailViewProps> = ({
  importFile,
  onBack,
}) => {
  const getConfidenceBadge = (conf?: string) => {
    switch (conf) {
      case 'HIGH':
        return <Badge variant="success">Tinggi (High)</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Sedang (Medium)</Badge>;
      default:
        return <Badge variant="danger">Rendah (Low)</Badge>;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'SHOPEE_ORDER_ALL':
        return 'Shopee OrderAll (Rincian Pesanan)';
      case 'SHOPEE_INCOME':
        return 'Shopee Income (Pelepasan Dana / Settlement)';
      default:
        return 'Belum Dikenali (Unknown)';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const headers = importFile.detectedHeaders || [];
  const previewRows = importFile.previewRows || [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
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
              <h1 className="text-xl md:text-2xl font-bold text-stone-100 tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span className="truncate max-w-md">{importFile.originalFileName}</span>
              </h1>
              <StatusBadge status={importFile.status} />
            </div>
            <p className="text-xs text-stone-400 mt-1">
              ID Dokumen: <span className="font-mono text-stone-300">{importFile.id}</span>
            </p>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={onBack}>
          Kembali ke Daftar Import
        </Button>
      </div>

      {/* Grid: File Info & Detection Result */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: File Information */}
        <Card>
          <CardHeader title="Informasi Berkas (Raw File)" subtitle="Data integritas dan jejak audit penyimpanan." />
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Nama File Asli
              </span>
              <span className="font-medium text-stone-100 truncate max-w-[200px]">
                {importFile.originalFileName}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" /> Ukuran File
              </span>
              <span className="font-medium text-stone-100">
                {formatFileSize(importFile.fileSizeBytes)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Waktu Upload
              </span>
              <span className="font-medium text-stone-100">
                {formatDateTime(importFile.createdAt)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Diupload Oleh
              </span>
              <span className="font-medium text-stone-100 truncate max-w-[180px]">
                {importFile.uploadedByName || importFile.uploadedBy}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-stone-950/60 border border-stone-800 space-y-1">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> SHA-256 Checksum Hash
              </span>
              <div className="font-mono text-[10px] text-emerald-400 break-all bg-stone-900 p-1.5 rounded border border-stone-800/80">
                {importFile.fileHash}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-stone-950/60 border border-stone-800 space-y-1">
              <span className="text-stone-400">Firebase Storage Path (Raw Untouched):</span>
              <div className="font-mono text-[10px] text-stone-300 break-all bg-stone-900 p-1.5 rounded border border-stone-800/80">
                {importFile.storagePath}
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Detection Intelligence */}
        <Card>
          <CardHeader title="Hasil Deteksi Otomatis (Auto Detection)" subtitle="Klasifikasi berbasis tanda tangan kolom header." />
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400">Marketplace Terdeteksi:</span>
              <span className="font-bold text-stone-100">
                {importFile.detectedMarketplace === 'SHOPEE' ? 'Shopee Indonesia' : 'Tidak Dikenal'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400">Jenis Laporan:</span>
              <span className="font-bold text-emerald-400">
                {getReportTypeLabel(importFile.detectedReportType)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400">Tingkat Keyakinan (Confidence):</span>
              <div>{getConfidenceBadge(importFile.detectionConfidence)}</div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400">Metode Deteksi:</span>
              <span className="font-medium text-stone-200">
                {importFile.detectionMethod === 'HEADER_SIGNATURE'
                  ? 'Tanda Tangan Header (Header Signature)'
                  : importFile.detectionMethod === 'MANUAL'
                  ? 'Pilihan Manual Pengguna'
                  : importFile.detectionMethod}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400">Lembar Kerja (Sheet):</span>
              <span className="font-medium text-stone-200">
                {importFile.selectedSheetName || 'Default'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800">
              <span className="text-stone-400">Jumlah Kolom Terbaca:</span>
              <span className="font-bold text-stone-100">{headers.length} kolom</span>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-200">
                File siap untuk tahap berikutnya: <strong>Step 4B (Shopee Column Mapping)</strong>. Raw data tersimpan secara utuh dan aman di Firebase Storage.
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detected Headers */}
      <Card>
        <CardHeader
          title={`Daftar Kolom Header Terdeteksi (${headers.length})`}
          subtitle="Kolom header yang diekstrak langsung dari baris pertama spreadsheet."
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {headers.map((h, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-md bg-stone-950 border border-stone-800 text-stone-200 font-mono text-[11px] flex items-center gap-1"
            >
              <Tag className="w-3 h-3 text-stone-500" />
              <span>{h}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* Preview Table (Max 20 rows) */}
      <Card>
        <CardHeader
          title={`Preview Data (${previewRows.length} baris)`}
          subtitle="Tampilan awal isi laporan untuk validasi sebelum proses pemetaan kolom. Maksimal 20 baris pertama."
        />

        {previewRows.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-500 italic">
            Tidak ada baris data preview yang tersedia.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-800 max-h-96">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 bg-stone-950 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold bg-stone-950">#</th>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-3.5 py-2.5 font-semibold bg-stone-950">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80 text-stone-200 font-mono text-[11px]">
                {previewRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-stone-800/30">
                    <td className="px-3.5 py-2 text-stone-500">{rowIdx + 1}</td>
                    {headers.map((h, colIdx) => (
                      <td key={colIdx} className="px-3.5 py-2 max-w-xs truncate">
                        {row[h] !== undefined && row[h] !== null ? String(row[h]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
