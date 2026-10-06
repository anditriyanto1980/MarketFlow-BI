import type { Timestamp } from 'firebase/firestore';

export type ReconciliationStatus =
  | 'MATCHED'
  | 'PARTIAL'
  | 'MISMATCH'
  | 'MISSING_ORDER'
  | 'MISSING_SETTLEMENT'
  | 'DUPLICATE'
  | 'UNRESOLVED';

export interface ReconciliationRun {
  id: string;
  businessId: string;
  storeId: string;
  periodStart: string;
  periodEnd: string;
  totalIncomeOrders: number;
  totalSettledAmount: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: Timestamp | string;
}

export interface ReconciliationResult {
  id: string;
  businessId: string;
  orderId: string;
  status: ReconciliationStatus;
  orderAmount: number;
  settledAmount: number;
  discrepancy: number;
  notes?: string;
}
