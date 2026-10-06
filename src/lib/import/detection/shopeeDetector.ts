import { normalizeHeaders } from './normalizeHeaders';
import {
  SHOPEE_ORDER_ALL_SIGNATURES,
  SHOPEE_INCOME_SIGNATURES,
} from './signatures';
import type { DetectionResult, ImportReportType, DetectionConfidence } from '@/src/types/import';

export function detectShopeeReport(
  rawHeaders: (string | undefined | null)[],
  originalFileName?: string
): DetectionResult {
  const normalized = normalizeHeaders(rawHeaders);

  if (normalized.length === 0) {
    return {
      marketplace: 'UNKNOWN',
      reportType: 'UNKNOWN',
      confidence: 'LOW',
      method: 'UNKNOWN',
      scores: { orderAll: 0, income: 0 },
      matchedSignatures: [],
      normalizedHeaders: [],
    };
  }

  let orderAllScore = 0;
  let incomeScore = 0;
  const matchedSignatures: string[] = [];

  // Match OrderAll signatures
  for (const rule of SHOPEE_ORDER_ALL_SIGNATURES) {
    const isMatched = normalized.some(
      (h) => h === rule.target || h.includes(rule.target)
    );
    if (isMatched) {
      orderAllScore += rule.weight;
      matchedSignatures.push(`OrderAll: ${rule.target}`);
    }
  }

  // Match Income signatures
  for (const rule of SHOPEE_INCOME_SIGNATURES) {
    const isMatched = normalized.some(
      (h) => h === rule.target || h.includes(rule.target)
    );
    if (isMatched) {
      incomeScore += rule.weight;
      matchedSignatures.push(`Income: ${rule.target}`);
    }
  }

  // Secondary filename signal (slight boost if header baseline exists)
  if (originalFileName) {
    const fn = originalFileName.toLowerCase();
    if (fn.includes('income') || fn.includes('penghasilan') || fn.includes('settlement')) {
      if (incomeScore > 0) incomeScore += 5;
    }
    if (fn.includes('order') || fn.includes('pesanan')) {
      if (orderAllScore > 0) orderAllScore += 5;
    }
  }

  let reportType: ImportReportType = 'UNKNOWN';
  let confidence: DetectionConfidence = 'LOW';
  let marketplace: 'SHOPEE' | 'UNKNOWN' = 'UNKNOWN';

  const scoreDiff = Math.abs(orderAllScore - incomeScore);

  // Ambiguity guard: If both scores are close or both are low, mark as UNKNOWN/LOW
  if (orderAllScore < 30 && incomeScore < 30) {
    reportType = 'UNKNOWN';
    confidence = 'LOW';
    marketplace = 'UNKNOWN';
  } else if (scoreDiff < 15 && orderAllScore > 25 && incomeScore > 25) {
    // Both matched heavily, ambiguous collision
    reportType = 'UNKNOWN';
    confidence = 'LOW';
    marketplace = 'SHOPEE';
  } else if (orderAllScore > incomeScore) {
    reportType = 'SHOPEE_ORDER_ALL';
    marketplace = 'SHOPEE';
    if (orderAllScore >= 60 && scoreDiff >= 25) {
      confidence = 'HIGH';
    } else if (orderAllScore >= 35) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }
  } else {
    reportType = 'SHOPEE_INCOME';
    marketplace = 'SHOPEE';
    if (incomeScore >= 60 && scoreDiff >= 25) {
      confidence = 'HIGH';
    } else if (incomeScore >= 35) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }
  }

  return {
    marketplace,
    reportType,
    confidence,
    method: 'HEADER_SIGNATURE',
    scores: {
      orderAll: orderAllScore,
      income: incomeScore,
    },
    matchedSignatures,
    normalizedHeaders: normalized,
  };
}
