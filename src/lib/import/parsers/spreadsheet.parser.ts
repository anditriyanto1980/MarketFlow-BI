import * as XLSX from 'xlsx';
import type { ParsedSpreadsheetResult } from './types';

/**
 * Memory-safe spreadsheet parser for XLSX and CSV.
 * Reads workbook, detects best sheet, extracts headers, and extracts max 20 preview rows.
 */
export async function parseSpreadsheetBuffer(
  buffer: ArrayBuffer,
  fileExtension: 'xlsx' | 'csv',
  preferredSheetName?: string,
  maxPreviewRows = 20
): Promise<ParsedSpreadsheetResult> {
  const readOptions: XLSX.ParsingOptions = {
    type: 'array',
    cellDates: true,
    sheetRows: maxPreviewRows + 5, // Read only top rows to prevent memory explosion on 100k+ row files!
  };

  const workbook = XLSX.read(buffer, readOptions);
  const sheetNames = workbook.SheetNames || [];

  if (sheetNames.length === 0) {
    throw new Error('Workbook tidak memiliki lembar kerja (sheet).');
  }

  // Determine target sheet
  let selectedSheetName = preferredSheetName || sheetNames[0];

  // If multiple sheets and no preferred sheet, pick the best data candidate (avoid instruction/panduan sheets)
  if (!preferredSheetName && sheetNames.length > 1) {
    const candidate = sheetNames.find(
      (name) =>
        !name.toLowerCase().includes('panduan') &&
        !name.toLowerCase().includes('instruction') &&
        !name.toLowerCase().includes('guide') &&
        !name.toLowerCase().includes('readme')
    );
    if (candidate) {
      selectedSheetName = candidate;
    }
  }

  const sheet = workbook.Sheets[selectedSheetName];
  if (!sheet) {
    throw new Error(`Sheet "${selectedSheetName}" tidak ditemukan di dalam file.`);
  }

  // Convert to 2D array for header & preview extraction
  const rawRows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawRows.length === 0) {
    throw new Error('Lembar kerja kosong atau tidak memiliki baris data.');
  }

  // Extract header row (usually row 0, or find first row with text)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
    const row = rawRows[i];
    if (Array.isArray(row) && row.some((cell) => cell && cell.toString().trim().length > 0)) {
      headerRowIdx = i;
      break;
    }
  }

  const rawHeaderRow = (rawRows[headerRowIdx] || []) as (string | number)[];
  const headers = rawHeaderRow.map((cell, idx) => (cell ? cell.toString().trim() : `Kolom_${idx + 1}`));

  // Extract preview rows (limit to maxPreviewRows)
  const dataRows = rawRows.slice(headerRowIdx + 1, headerRowIdx + 1 + maxPreviewRows);
  const previewRows: Record<string, unknown>[] = dataRows.map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined && row[idx] !== null ? row[idx] : '';
    });
    return obj;
  });

  return {
    sheetNames,
    selectedSheetName,
    headers,
    rowCountPreview: previewRows.length,
    previewRows,
  };
}
