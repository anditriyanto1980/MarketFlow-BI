import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/utils/errors';
import { recordAuditLog } from './audit.service';
import type {
  Product,
  ProductVariant,
  SKU,
  StoreSkuMapping,
  ProductCost,
  CostType,
} from '@/src/types/product';

// ==========================================
// 1. PRODUCT MASTER SERVICES
// ==========================================

export async function createProduct(
  businessId: string,
  userId: string,
  input: {
    name: string;
    brand?: string;
    category?: string;
    description?: string;
    initialSkuCode?: string;
  }
): Promise<Product> {
  const path = `businesses/${businessId}/products`;
  try {
    const productRef = doc(collection(db, path));
    const newProduct = {
      businessId,
      name: input.name.trim(),
      brand: input.brand?.trim() || '',
      category: input.category?.trim() || '',
      description: input.description?.trim() || '',
      status: 'ACTIVE' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(productRef, newProduct);

    // If initial SKU provided, auto-create initial SKU
    if (input.initialSkuCode?.trim()) {
      await createSku(businessId, userId, {
        productId: productRef.id,
        skuCode: input.initialSkuCode.trim(),
      });
    }

    await recordAuditLog(businessId, userId, 'PRODUCT_CREATED', {
      entityType: 'PRODUCT',
      entityId: productRef.id,
      details: { name: input.name, brand: input.brand, category: input.category },
    });

    return {
      id: productRef.id,
      ...newProduct,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Product;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getProducts(businessId: string): Promise<Product[]> {
  const path = `businesses/${businessId}/products`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Product, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getProduct(businessId: string, productId: string): Promise<Product | null> {
  const path = `businesses/${businessId}/products/${productId}`;
  try {
    const snap = await getDoc(doc(db, path));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<Product, 'id'>),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateProduct(
  businessId: string,
  productId: string,
  userId: string,
  data: Partial<Pick<Product, 'name' | 'brand' | 'category' | 'description' | 'status'>>
): Promise<void> {
  const path = `businesses/${businessId}/products/${productId}`;
  try {
    const productRef = doc(db, path);
    await updateDoc(productRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(businessId, userId, 'PRODUCT_UPDATED', {
      entityType: 'PRODUCT',
      entityId: productId,
      details: data as Record<string, unknown>,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function archiveProduct(
  businessId: string,
  productId: string,
  userId: string
): Promise<void> {
  await updateProduct(businessId, productId, userId, { status: 'INACTIVE' });
  await recordAuditLog(businessId, userId, 'PRODUCT_ARCHIVED', {
    entityType: 'PRODUCT',
    entityId: productId,
  });
}

// ==========================================
// 2. PRODUCT VARIANT SERVICES
// ==========================================

export async function createVariant(
  businessId: string,
  userId: string,
  input: { productId: string; name: string }
): Promise<ProductVariant> {
  const path = `businesses/${businessId}/products/${input.productId}/variants`;
  try {
    const variantRef = doc(collection(db, path));
    const newVariant = {
      businessId,
      productId: input.productId,
      name: input.name.trim(),
      status: 'ACTIVE' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(variantRef, newVariant);

    await recordAuditLog(businessId, userId, 'VARIANT_CREATED', {
      entityType: 'VARIANT',
      entityId: variantRef.id,
      details: { productId: input.productId, name: input.name },
    });

    return {
      id: variantRef.id,
      ...newVariant,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as ProductVariant;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getVariants(businessId: string, productId: string): Promise<ProductVariant[]> {
  const path = `businesses/${businessId}/products/${productId}/variants`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ProductVariant, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateVariant(
  businessId: string,
  productId: string,
  variantId: string,
  userId: string,
  data: Partial<Pick<ProductVariant, 'name' | 'status'>>
): Promise<void> {
  const path = `businesses/${businessId}/products/${productId}/variants/${variantId}`;
  try {
    const variantRef = doc(db, path);
    await updateDoc(variantRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(businessId, userId, 'VARIANT_UPDATED', {
      entityType: 'VARIANT',
      entityId: variantId,
      details: data as Record<string, unknown>,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// 3. SKU MASTER SERVICES
// ==========================================

export async function createSku(
  businessId: string,
  userId: string,
  input: {
    productId: string;
    variantId?: string;
    skuCode: string;
    barcode?: string;
  }
): Promise<SKU> {
  const path = `businesses/${businessId}/skus`;
  const cleanCode = input.skuCode.trim().toUpperCase();

  try {
    // ENFORCE RULE: skuCode must be unique within a business.
    // Query existing active SKU with same skuCode
    const duplicateQuery = query(
      collection(db, path),
      where('skuCode', '==', cleanCode),
      limit(1)
    );
    const existingSnap = await getDocs(duplicateQuery);
    if (!existingSnap.empty) {
      const match = existingSnap.docs[0].data() as SKU;
      if (match.status === 'ACTIVE') {
        throw new Error(`Kode SKU "${cleanCode}" sudah digunakan di bisnis ini. Kode SKU harus unik.`);
      }
    }

    const skuRef = doc(collection(db, path));
    const newSku = {
      businessId,
      productId: input.productId,
      variantId: input.variantId || '',
      skuCode: cleanCode,
      barcode: input.barcode?.trim() || '',
      status: 'ACTIVE' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(skuRef, newSku);

    await recordAuditLog(businessId, userId, 'SKU_CREATED', {
      entityType: 'SKU',
      entityId: skuRef.id,
      details: { skuCode: cleanCode, productId: input.productId },
    });

    return {
      id: skuRef.id,
      ...newSku,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as SKU;
  } catch (error) {
    if (error instanceof Error && error.message.includes('sudah digunakan')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getSkus(businessId: string, productId?: string): Promise<SKU[]> {
  const path = `businesses/${businessId}/skus`;
  try {
    const q = productId
      ? query(collection(db, path), where('productId', '==', productId))
      : query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SKU, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Backward-compatible alias
export const getSKUs = getSkus;

export async function getSku(businessId: string, skuId: string): Promise<SKU | null> {
  const path = `businesses/${businessId}/skus/${skuId}`;
  try {
    const snap = await getDoc(doc(db, path));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<SKU, 'id'>),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateSku(
  businessId: string,
  skuId: string,
  userId: string,
  data: Partial<Pick<SKU, 'skuCode' | 'barcode' | 'variantId' | 'status'>>
): Promise<void> {
  const path = `businesses/${businessId}/skus/${skuId}`;
  try {
    const skuRef = doc(db, path);
    await updateDoc(skuRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(businessId, userId, 'SKU_UPDATED', {
      entityType: 'SKU',
      entityId: skuId,
      details: data as Record<string, unknown>,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function archiveSku(businessId: string, skuId: string, userId: string): Promise<void> {
  await updateSku(businessId, skuId, userId, { status: 'INACTIVE' });
  await recordAuditLog(businessId, userId, 'SKU_ARCHIVED', {
    entityType: 'SKU',
    entityId: skuId,
  });
}

// ==========================================
// 4. MARKETPLACE SKU MAPPING SERVICES
// ==========================================

export async function createSkuMapping(
  businessId: string,
  userId: string,
  input: {
    storeId: string;
    internalSkuId: string;
    externalSku: string;
    externalProductName?: string;
    externalVariantName?: string;
  }
): Promise<StoreSkuMapping> {
  const path = `businesses/${businessId}/storeSkuMappings`;
  try {
    const mappingRef = doc(collection(db, path));
    const newMapping = {
      businessId,
      storeId: input.storeId,
      internalSkuId: input.internalSkuId,
      externalSku: input.externalSku.trim(),
      externalProductName: input.externalProductName?.trim() || '',
      externalVariantName: input.externalVariantName?.trim() || '',
      status: 'ACTIVE' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(mappingRef, newMapping);

    await recordAuditLog(businessId, userId, 'SKU_MAPPING_CREATED', {
      entityType: 'SKU_MAPPING',
      entityId: mappingRef.id,
      details: {
        storeId: input.storeId,
        internalSkuId: input.internalSkuId,
        externalSku: input.externalSku,
      },
    });

    return {
      id: mappingRef.id,
      ...newMapping,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as StoreSkuMapping;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getSkuMappings(
  businessId: string,
  storeId?: string
): Promise<StoreSkuMapping[]> {
  const path = `businesses/${businessId}/storeSkuMappings`;
  try {
    const q = storeId
      ? query(collection(db, path), where('storeId', '==', storeId))
      : query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<StoreSkuMapping, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateSkuMapping(
  businessId: string,
  mappingId: string,
  userId: string,
  data: Partial<Pick<StoreSkuMapping, 'internalSkuId' | 'externalSku' | 'externalProductName' | 'externalVariantName' | 'status'>>
): Promise<void> {
  const path = `businesses/${businessId}/storeSkuMappings/${mappingId}`;
  try {
    const ref = doc(db, path);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(businessId, userId, 'SKU_MAPPING_UPDATED', {
      entityType: 'SKU_MAPPING',
      entityId: mappingId,
      details: data as Record<string, unknown>,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// 5. HPP & PRODUCT COST SERVICES
// ==========================================

export async function createProductCost(
  businessId: string,
  userId: string,
  input: {
    skuId: string;
    costType: CostType;
    amount: number;
    effectiveFrom: string;
    effectiveTo?: string;
  }
): Promise<ProductCost> {
  const path = `businesses/${businessId}/productCosts`;
  try {
    const costRef = doc(collection(db, path));
    const newCost = {
      businessId,
      skuId: input.skuId,
      costType: input.costType,
      amount: Number(input.amount),
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(costRef, newCost);

    await recordAuditLog(businessId, userId, 'PRODUCT_COST_CREATED', {
      entityType: 'PRODUCT_COST',
      entityId: costRef.id,
      details: { skuId: input.skuId, costType: input.costType, amount: input.amount },
    });

    return {
      id: costRef.id,
      ...newCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as ProductCost;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getProductCosts(businessId: string, skuId?: string): Promise<ProductCost[]> {
  const path = `businesses/${businessId}/productCosts`;
  try {
    const q = skuId
      ? query(collection(db, path), where('skuId', '==', skuId))
      : query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ProductCost, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateProductCost(
  businessId: string,
  costId: string,
  userId: string,
  data: Partial<Pick<ProductCost, 'costType' | 'amount' | 'effectiveFrom' | 'effectiveTo'>>
): Promise<void> {
  const path = `businesses/${businessId}/productCosts/${costId}`;
  try {
    const ref = doc(db, path);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(businessId, userId, 'PRODUCT_COST_UPDATED', {
      entityType: 'PRODUCT_COST',
      entityId: costId,
      details: data as Record<string, unknown>,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
