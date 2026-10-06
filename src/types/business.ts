import type { Timestamp } from 'firebase/firestore';

export type BusinessType = 'UMKM' | 'ONLINE_SELLER' | 'RETAIL' | 'DISTRIBUTOR' | 'OTHER';

export type BusinessStatus = 'ACTIVE' | 'SUSPENDED';

export interface Business {
  id: string;
  name: string;
  businessType: BusinessType;
  currency: 'IDR';
  timezone: 'Asia/Jakarta';
  ownerId: string;
  status: BusinessStatus;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface CreateBusinessInput {
  name: string;
  businessType: BusinessType;
  currency?: 'IDR';
  timezone?: 'Asia/Jakarta';
}
