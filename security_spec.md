# MarketFlow BI — Security Specification

## 1. Data Invariants
- **Multi-Tenant Boundary:** Every document in subcollections or with a `businessId` attribute strictly belongs to `businessId`. No cross-tenant reads or writes.
- **Membership & RBAC:** Users may only read or write within a business if an active membership document exists at `/businesses/{businessId}/members/{userId}` with `status == 'ACTIVE'`.
- **Hierarchical Access Control:**
  - `OWNER`: Full control of business settings, membership, stores, products, HPP, audits.
  - `ADMIN`: Operational management (stores, products, HPP, viewing reports, non-owner team management).
  - `FINANCE`: View financial data, manage HPP and costs, no store or team alterations.
  - `MANAGER`: Product catalog and store view, no HPP changes, no team management.
  - `VIEWER`: Read-only access to basic dashboards and products; blocked from sensitive HPP and financial configs.
- **Immutable Keys:** `businessId`, `createdAt`, `ownerId` must never be altered post-creation.
- **Strict Timestamps:** `createdAt` and `updatedAt` must be set via `request.time`.
- **Identity Integrity:** Authenticated `request.auth.uid` must match the actor ID when self-registering or creating logs.

## 2. The "Dirty Dozen" Threat Payloads & Guardrails
1. **Tenant Hopping:** Malicious user in Business A attempts to read `/businesses/B/products/123`.
   - *Guardrail:* `isBusinessMember(businessId)` fails; rejected with PERMISSION_DENIED.
2. **Ghost Field Injection:** Client sends `isAdmin: true` or `unauthorizedQuota: 999999` in store update.
   - *Guardrail:* `affectedKeys().hasOnly(...)` rejects unexpected keys.
3. **Role Self-Escalation:** User updates their own `/businesses/{businessId}/members/{userId}` to change `role` to `'OWNER'`.
   - *Guardrail:* Only current `OWNER` can alter membership documents.
4. **HPP Data Scraping by VIEWER:** User with `VIEWER` or `MANAGER` role queries `/businesses/{businessId}/productCosts`.
   - *Guardrail:* `productCosts` read restricted to `hasRole(businessId, ['OWNER', 'ADMIN', 'FINANCE', 'MANAGER'])` and create/update to `['OWNER', 'ADMIN', 'FINANCE']`.
5. **Orphaned Product Creation:** Writing a product with a spoofed `businessId` that doesn't match the path.
   - *Guardrail:* `incoming().businessId == businessId` enforced.
6. **Negative or Absurd Amount in HPP:** Writing cost of `-50000` or `'NaN'`.
   - *Guardrail:* `isValidProductCost()` verifies `amount is number && amount >= 0`.
7. **Oversized String Injection (Denial of Wallet):** Attempting to store a 5MB payload in `storeName` or `skuCode`.
   - *Guardrail:* Size limits `storeName.size() <= 128`, `skuCode.size() <= 64`.
8. **Forged Audit Log:** User writes an audit log claiming to be another user.
   - *Guardrail:* `incoming().userId == request.auth.uid`.
9. **Tampering with Creation Timestamp:** Client provides historical `createdAt: 1999-01-01`.
   - *Guardrail:* `incoming().createdAt == request.time`.
10. **Store Marketplace Spoofing:** Submitting an invalid marketplace `'EBAY'` or empty string.
    - *Guardrail:* Enum validation: `incoming().marketplace in ['SHOPEE', 'TIKTOK', 'TOKOPEDIA']`.
11. **Altering Immutable Business Owner:** Modifying `/businesses/{id}` with `ownerId: 'attacker_uid'`.
    - *Guardrail:* `incoming().ownerId == existing().ownerId`.
12. **Unauthenticated Access:** Reading catalog or stores without a valid auth token.
    - *Guardrail:* Global default-deny and `isSignedIn()` check on all paths.
