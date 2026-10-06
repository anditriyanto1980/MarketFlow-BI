/**
 * Normalizes spreadsheet headers for robust signature matching
 * Handles casing, whitespace variations, and common punctuation.
 */
export function normalizeHeader(header: string | undefined | null): string {
  if (!header) return '';
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[_\-]+/g, ' ')
    .replace(/[^\w\s]/g, '') // remove special symbols
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeHeaders(headers: (string | undefined | null)[]): string[] {
  return headers.map(normalizeHeader).filter((h) => h.length > 0);
}
