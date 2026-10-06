import type { Timestamp } from 'firebase/firestore';

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface Product {
  id: string;
  businessId: string;
  name: string;
  category?: string;
  brand?: string;
  description?: string;
  status: ProductStatus;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface ProductVariant {
  id: string;
  businessId: string;
  productId: string;
  name: string;
  status: ProductStatus;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface SKU {
  id: string;
  businessId: string;
  productId: string;
  variantId?: string;
  skuCode: string;
  barcode?: string;
  status: ProductStatus;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface StoreSkuMapping {
  id: string;
  businessId: string;
  storeId: string;
  internalSkuId: string;
  externalSku: string;
  externalProductName?: string;
  externalVariantName?: string;
  status: ProductStatus;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export type CostType =
  | 'PRODUCT_COST'
  | 'PACKAGING'
  | 'BOX'
  | 'BUBBLE_WRAP'
  | 'STICKER'
  | 'LABEL'
  | 'OTHER';

export interface ProductCost {
  id: string;
  businessId: string;
  skuId: string;
  costType: CostType;
  amount: number;
  effectiveFrom: Timestamp | string;
  effectiveTo?: Timestamp | string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}
