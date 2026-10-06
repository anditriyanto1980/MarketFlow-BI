import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  Plus,
  RefreshCw,
  HardDrive,
  Calendar,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { getImportFiles } from '@/src/services/import.service';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { StatusBadge } from '@/src/components/shared/StatusBadge';
import { EmptyState } from '@/src/components/shared/EmptyState';
import { Skeleton } from '@/src/components/shared/LoadingState';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { formatDateTime } from '@/src/utils/dates';
import { ImportDetailView } from './ImportDetailView';
import type { ImportFile } from '@/src/types/import';

interface ImportHistoryViewProps {
  onNavigateToUpload: () => void;
}

export const ImportHistoryView: React.FC<ImportHistoryViewProps> = ({
  onNavigateToUpload,
}) => {
  const { currentBusiness } = useAuth();
  const [importFiles, setImportFiles] = useState<ImportFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedFile, setSelectedFile] = useState<ImportFile | null>(null);

  const loadData = useCallback(async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const files = await getImportFiles(currentBusiness.id, 50);
      setImportFiles(files);
    } catch (err) {
      console.error('Failed to load import files history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (selectedFile) {
    return <ImportDetailView importFile={selectedFile} onBack={() => setSelectedFile(null)} />;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'HIGH':
        return <Badge variant="success">Tinggi</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Sedang</Badge>;
      default:
        return <Badge variant="danger">Rendah</Badge>;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'SHOPEE_ORDER_ALL':
        return 'Shopee OrderAll';
      case 'SHOPEE_INCOME':
        return 'Shopee Income';
      default:
        return 'Unknown';
    }
  };

  const filteredFiles = importFiles.filter((f) => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.originalFileName.toLowerCase().includes(q);
      const matchType = f.detectedReportType.toLowerCase().includes(q);
      if (!matchName && !matchType) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Import (Import History)"
        subtitle="Daftar seluruh berkas laporan mentah (raw files) yang diunggah dan disimpan di Firebase Storage."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Segarkan
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateToUpload}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Upload Berkas Baru
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              placeholder="Cari nama berkas, tipe laporan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="DETECTED">Terdeteksi (DETECTED)</option>
            <option value="NEEDS_REVIEW">Perlu Review (NEEDS_REVIEW)</option>
            <option value="FAILED">Gagal (FAILED)</option>
          </select>
        </div>
      </Card>

      {/* Main Table / List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : importFiles.length === 0 ? (
        <EmptyState
          icon={<History className="w-10 h-10 text-emerald-400" />}
          title="Belum ada riwayat import"
          description="Unggah laporan penjualan atau settlement Shopee untuk memulai proses pengolahan data."
          primaryAction={{
            label: '+ Upload Laporan Pertama',
            onClick: onNavigateToUpload,
          }}
        />
      ) : filteredFiles.length === 0 ? (
        <div className="p-8 text-center text-xs text-stone-500 bg-stone-900/40 rounded-xl border border-stone-800">
          Tidak ada berkas yang cocok dengan filter pencarian.
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nama Berkas (File)</th>
                  <th className="px-4 py-3 font-semibold">Tipe Laporan</th>
                  <th className="px-4 py-3 font-semibold">Confidence</th>
                  <th className="px-4 py-3 font-semibold">Ukuran</th>
                  <th className="px-4 py-3 font-semibold">Diupload Oleh</th>
                  <th className="px-4 py-3 font-semibold">Waktu Upload</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80 text-stone-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-stone-800/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-stone-100 block max-w-xs truncate">
                            {file.originalFileName}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {file.fileExtension.toUpperCase()} • {file.headerCount || 0} kolom
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-emerald-300">
                      {getReportTypeLabel(file.detectedReportType)}
                    </td>
                    <td className="px-4 py-3.5">{getConfidenceBadge(file.detectionConfidence)}</td>
                    <td className="px-4 py-3.5 text-stone-400">{formatFileSize(file.fileSizeBytes)}</td>
                    <td className="px-4 py-3.5 text-stone-300">
                      {file.uploadedByName || 'Pengguna'}
                    </td>
                    <td className="px-4 py-3.5 text-stone-400">{formatDateTime(file.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={file.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedFile(file)}
                        icon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Rincian
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
