/**
 * AI Business Analyst Layer (Future Phase Placeholder)
 * Strict principle: AI must NEVER directly access unrestricted Firestore collections.
 * AI will consume structured domain summaries via tool functions.
 */

export interface AnalyticsContextPayload {
  businessId: string;
  periodStart: string;
  periodEnd: string;
  metrics: Record<string, unknown>;
  topProducts: unknown[];
  marketplaceShares: unknown[];
  reconciliationDiscrepancies: unknown[];
}

export interface AIAnalystQuery {
  question: string;
  context: AnalyticsContextPayload;
}

export interface AIAnalystResponse {
  insights: string[];
  risks: string[];
  actionRecommendations: string[];
}
