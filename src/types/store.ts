import type { Timestamp } from 'firebase/firestore';

export type MarketplaceCode = 'SHOPEE' | 'TIKTOK' | 'TOKOPEDIA';

export type StoreStatus = 'ACTIVE' | 'INACTIVE';

export interface Store {
  id: string;
  businessId: string;
  marketplace: MarketplaceCode;
  storeName: string;
  externalStoreId?: string;
  status: StoreStatus;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface CreateStoreInput {
  marketplace: MarketplaceCode;
  storeName: string;
  externalStoreId?: string;
}
