export interface ParsedSpreadsheetResult {
  sheetNames: string[];
  selectedSheetName: string;
  headers: string[];
  rowCountPreview: number;
  previewRows: Record<string, unknown>[];
}
