import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  ChevronRight,
  HardDrive,
  Hash,
  Eye,
  RefreshCw,
  Play,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { hasPermission } from '@/src/lib/auth/permissions';
import { processImportFile, setManualReportType } from '@/src/services/import.service';
import { runDetectionUnitTests } from '@/src/lib/import/detection/shopeeDetector.test';
import { Button } from '@/src/components/ui/button';
import { Card, CardHeader } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { StatusBadge } from '@/src/components/shared/StatusBadge';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { getReadableErrorMessage } from '@/src/utils/errors';
import { formatDateTime } from '@/src/utils/dates';
import { ImportDetailView } from './ImportDetailView';
import type { ImportFile, ImportReportType, DetectionResult } from '@/src/types/import';

interface ImportViewProps {
  onNavigateToHistory: () => void;
}

export const ImportView: React.FC<ImportViewProps> = ({ onNavigateToHistory }) => {
  const { currentBusiness, currentRole, currentUser, userProfile } = useAuth();
  const canUpload = hasPermission(currentRole, 'IMPORT_DATA');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Upload & Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [duplicateFile, setDuplicateFile] = useState<ImportFile | null>(null);
  const [processedFile, setProcessedFile] = useState<ImportFile | null>(null);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | undefined>(undefined);

  // Viewing detail of an imported file
  const [detailFile, setDetailFile] = useState<ImportFile | null>(null);

  // Manual Override state
  const [isOverriding, setIsOverriding] = useState(false);

  // Unit Test Runner state
  const [testResults, setTestResults] = useState<{
    allPassed: boolean;
    results: { testName: string; passed: boolean; message: string }[];
  } | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    // Reset previous states
    setErrorMessage(null);
    setDuplicateFile(null);
    setProcessedFile(null);
    setDetectionResult(undefined);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv') {
      setErrorMessage('Format file tidak didukung. Mohon unggah file dengan format .xlsx atau .csv.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Ukuran file melebihi batas maksimal 25 MB.');
      return;
    }

    setSelectedFile(file);
    executeUpload(file);
  };

  const executeUpload = async (file: File) => {
    if (!currentBusiness || !currentUser) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setDuplicateFile(null);
    setProcessedFile(null);

    try {
      setProcessingStage('Membaca berkas dan menghitung checksum SHA-256...');
      await new Promise((r) => setTimeout(r, 100));

      setProcessingStage('Mengecek duplikasi & mengunggah raw file ke Cloud Storage...');
      const result = await processImportFile(
        currentBusiness.id,
        currentUser.uid,
        userProfile?.displayName || 'Pengguna',
        file
      );

      if (result.isDuplicate) {
        setDuplicateFile(result.importFile);
        setIsProcessing(false);
        return;
      }

      setProcessingStage('Mengekstrak header & menjalankan deteksi tanda tangan Shopee...');
      setProcessedFile(result.importFile);
      setDetectionResult(result.detectionResult);
    } catch (err: unknown) {
      console.error('Import processing failed:', err);
      setErrorMessage(getReadableErrorMessage(err));
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const handleManualOverride = async (selectedType: ImportReportType) => {
    if (!currentBusiness || !currentUser || !processedFile) return;

    setIsOverriding(true);
    try {
      await setManualReportType(currentBusiness.id, processedFile.id, currentUser.uid, selectedType);
      setProcessedFile((prev) =>
        prev
          ? {
              ...prev,
              detectedReportType: selectedType,
              detectionConfidence: 'MEDIUM',
              detectionMethod: 'MANUAL',
              status: 'DETECTED',
            }
          : null
      );
    } catch (err) {
      alert(getReadableErrorMessage(err));
    } finally {
      setIsOverriding(false);
    }
  };

  const runTests = () => {
    const res = runDetectionUnitTests();
    setTestResults(res);
    setShowTestModal(true);
  };

  if (detailFile) {
    return <ImportDetailView importFile={detailFile} onBack={() => setDetailFile(null)} />;
  }

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'HIGH':
        return <Badge variant="success">Tinggi (High)</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Sedang (Medium)</Badge>;
      default:
        return <Badge variant="danger">Rendah (Low)</Badge>;
    }
  };

  const getReportTypeLabel = (type?: string) => {
    switch (type) {
      case 'SHOPEE_ORDER_ALL':
        return 'Shopee OrderAll (Rincian Pesanan)';
      case 'SHOPEE_INCOME':
        return 'Shopee Income (Pelepasan Dana / Settlement)';
      default:
        return 'Belum Dikenali (Unknown)';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Import Laporan Marketplace"
        subtitle="Upload berkas XLSX / CSV raw langsung dari Shopee Seller Centre. Sistem akan mendeteksi otomatis tipe laporan dan menghitung checksum SHA-256."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={runTests}
              icon={<Play className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Uji Unit Test Deteksi
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToHistory}
              icon={<History className="w-3.5 h-3.5" />}
            >
              Riwayat Import
            </Button>
          </div>
        }
      />

      {/* Security & Invariant Notice */}
      <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-stone-100">Prinsip Integritas Data Mentah (Raw Source Preservation):</span>
          <p className="text-stone-400 leading-relaxed text-[11px]">
            File original yang diunggah disimpan secara <em>immutable</em> di Firebase Storage tanpa modifikasi, normalisasi, atau transformasi. Checksum SHA-256 otomatis mencegah duplikasi file ganda.
          </p>
        </div>
      </div>

      {/* Main Upload Dropzone */}
      <Card className="p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={!canUpload || isProcessing}
        />

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (canUpload && !isProcessing) {
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-emerald-500 bg-emerald-950/20 scale-[0.99]'
              : 'border-stone-800 hover:border-emerald-700/60 bg-stone-950/40 hover:bg-stone-950/70'
          } ${!canUpload || isProcessing ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-inner">
            {isProcessing ? (
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-base font-semibold text-stone-100">
            {isProcessing ? 'Sedang Memproses Berkas...' : 'Tarik & Letakkan Berkas di Sini'}
          </h3>

          <p className="text-xs text-stone-400 mt-1.5 max-w-md mx-auto">
            {isProcessing
              ? processingStage
              : 'atau klik untuk memilih file XLSX atau CSV dari komputer Anda (maks. 25 MB).'}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-300">
              Shopee OrderAll (.xlsx / .csv)
            </span>
            <span className="px-2.5 py-1 rounded-md bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-300">
              Shopee Income (.xlsx / .csv)
            </span>
          </div>

          {!canUpload && (
            <p className="text-xs text-amber-400 mt-4">
              Peran Anda saat ini tidak memiliki izin untuk mengunggah file import.
            </p>
          )}
        </div>
      </Card>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start gap-3 text-xs text-red-200">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-red-100">Gagal Mengunggah Berkas</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Duplicate File Detected Warning */}
      {duplicateFile && (
        <Card className="p-5 border-amber-900/60 bg-amber-950/20">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div>
                <h4 className="text-sm font-semibold text-amber-200">
                  File Duplikat Terdeteksi (SHA-256 Identik)
                </h4>
                <p className="text-xs text-stone-300 mt-0.5">
                  File ini memiliki isi identik dengan berkas yang pernah diunggah sebelumnya. Untuk menjaga integritas data dan mencegah penghitungan ganda, berkas tidak diunggah ulang.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-stone-950/80 border border-stone-800 text-xs space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-stone-400">
                  <span>Nama Berkas:</span>
                  <span className="text-stone-200 font-sans">{duplicateFile.originalFileName}</span>
                </div>
                <div className="flex items-center justify-between text-stone-400">
                  <span>Waktu Unggah Pertama:</span>
                  <span className="text-stone-200 font-sans">{formatDateTime(duplicateFile.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-stone-400">
                  <span>Diupload Oleh:</span>
                  <span className="text-stone-200 font-sans">{duplicateFile.uploadedByName || duplicateFile.uploadedBy}</span>
                </div>
                <div className="flex items-center justify-between text-stone-400">
                  <span>SHA-256 Hash:</span>
                  <span className="text-emerald-400 truncate max-w-xs">{duplicateFile.fileHash}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDetailFile(duplicateFile)}
                  icon={<Eye className="w-3.5 h-3.5" />}
                >
                  Buka Rincian File Duplikat
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDuplicateFile(null);
                    setSelectedFile(null);
                  }}
                >
                  Unggah File Lain
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Successful Upload & Detection Panel */}
      {processedFile && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="p-5 border-emerald-900/60 bg-stone-900/90">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-100 text-base">
                      {processedFile.originalFileName}
                    </h3>
                    <StatusBadge status={processedFile.status} />
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Berhasil diunggah dan disimpan ke Storage. ID: <span className="font-mono text-stone-300">{processedFile.id}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDetailFile(processedFile)}
                  icon={<Eye className="w-3.5 h-3.5" />}
                >
                  Lihat Selengkapnya
                </Button>
              </div>
            </div>

            {/* Detection Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
              <div className="p-3 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400 block text-[11px]">Marketplace</span>
                <span className="font-bold text-stone-100 text-sm mt-0.5 block">
                  {processedFile.detectedMarketplace === 'SHOPEE' ? 'Shopee' : 'Tidak Dikenal'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400 block text-[11px]">Tipe Laporan</span>
                <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                  {getReportTypeLabel(processedFile.detectedReportType)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400 block text-[11px]">Tingkat Keyakinan (Confidence)</span>
                <div className="mt-1">{getConfidenceBadge(processedFile.detectionConfidence)}</div>
              </div>

              <div className="p-3 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400 block text-[11px]">Metode Deteksi</span>
                <span className="font-medium text-stone-200 text-xs mt-1 block">
                  {processedFile.detectionMethod === 'HEADER_SIGNATURE' ? 'Tanda Tangan Header' : processedFile.detectionMethod}
                </span>
              </div>
            </div>

            {/* Manual Override Option if LOW confidence or UNKNOWN */}
            {(processedFile.detectionConfidence === 'LOW' || processedFile.detectedReportType === 'UNKNOWN') && (
              <div className="mt-4 p-4 rounded-xl bg-amber-950/30 border border-amber-900/60 text-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Pilihan Manual Jenis Laporan (Deteksi Ambigu / Rendah)</span>
                </div>
                <p className="text-stone-300 text-[11px]">
                  Tanda tangan kolom tidak memenuhi batas keyakinan tinggi. Silakan tentukan secara manual jenis berkas ini untuk melanjutkan ke tahap pemetaan kolom:
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isOverriding}
                    onClick={() => handleManualOverride('SHOPEE_ORDER_ALL')}
                  >
                    Atur sebagai Shopee OrderAll
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isOverriding}
                    onClick={() => handleManualOverride('SHOPEE_INCOME')}
                  >
                    Atur sebagai Shopee Income
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* 20-Row Preview Table */}
          {processedFile.previewRows && processedFile.previewRows.length > 0 && (
            <Card className="p-5">
              <CardHeader
                title={`Preview Isi Laporan (Maks. 20 Baris Awal)`}
                subtitle={`Menampilkan sampel data mentah yang diekstrak dari sheet "${processedFile.selectedSheetName || 'Default'}".`}
              />

              <div className="overflow-x-auto rounded-lg border border-stone-800 max-h-96">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-stone-950 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold bg-stone-950">#</th>
                      {processedFile.detectedHeaders?.map((h, idx) => (
                        <th key={idx} className="px-3.5 py-2.5 font-semibold bg-stone-950 font-mono">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80 text-stone-200 font-mono text-[11px]">
                    {processedFile.previewRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-stone-800/30">
                        <td className="px-3.5 py-2 text-stone-500">{rowIdx + 1}</td>
                        {processedFile.detectedHeaders?.map((h, colIdx) => (
                          <td key={colIdx} className="px-3.5 py-2 max-w-xs truncate">
                            {row[h] !== undefined && row[h] !== null ? String(row[h]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal: Unit Test Results */}
      {showTestModal && testResults && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-stone-100 text-base">Hasil Unit Test Deteksi Shopee</h3>
              </div>
              <Badge variant={testResults.allPassed ? 'success' : 'danger'}>
                {testResults.allPassed ? '10/10 PASS' : 'FAIL'}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              {testResults.results.map((t, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-stone-200 block">{t.testName}</span>
                    <span className="text-[11px] text-stone-400 block">{t.message}</span>
                  </div>
                  <Badge variant={t.passed ? 'success' : 'danger'}>
                    {t.passed ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="pt-3 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setShowTestModal(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
