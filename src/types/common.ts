import type { Timestamp } from 'firebase/firestore';

export interface AuditLog {
  id: string;
  businessId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp | string;
}

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
}
