# MarketFlow BI — Foundation V0.1

> **Marketplace Business Intelligence for Growing Sellers**
> *Dari data marketplace menjadi keputusan bisnis.*

MarketFlow BI adalah platform SaaS Business Intelligence yang dirancang khusus untuk UMKM dan online sellers di Indonesia yang berjualan di multi-channel (Shopee, TikTok Shop, Tokopedia). Sistem ini mentransformasi data mentah laporan marketplace menjadi keputusan bisnis terukur: membedah penjualan riil, settlement pencairan bank, potongan komisi/biaya platform, Harga Pokok Penjualan (HPP), serta kalkulasi laba bersih (Contribution & Net Profit).

---

## 1. Tech Stack (Locked)

- **Frontend:** Next.js / React 19, TypeScript (Strict), Tailwind CSS v4, Lucide Icons
- **Backend & Auth:** Firebase Authentication (Email/Password & Google Sign-In), Cloud Firestore, Firebase Storage
- **Validation:** Zod schemas
- **Multi-Tenant Architecture:** Multi-tenant berbasis `businessId` terisolasi dengan Attribute-Based Access Control (ABAC) pada Firestore Security Rules
- **Formatting:** Rupiah Indonesia (`IDR`), Zona Waktu `Asia/Jakarta` (WIB)

---

## 2. Fitur Foundation V0.1 yang Telah Selesai

- [x] **Firebase Configuration & SDK:** Inisialisasi Firebase Client aman dengan isolasi environment variables.
- [x] **Firebase Authentication:** Registrasi akun baru, Login Email/Password, Login Google Popup, sesi persistent, dan Logout.
- [x] **User Profile Management:** Sinkronisasi otomatis dokumen profil `users/{userId}` dengan status `onboardingCompleted`.
- [x] **Multi-Tenant Workspace (`businesses`):** Isolasi data organisasi per `businessId` lengkap dengan mata uang baku IDR dan zona waktu WIB.
- [x] **Business Membership & RBAC (`members`):**
  - Peran: `OWNER`, `ADMIN`, `FINANCE`, `MANAGER`, `VIEWER`
  - Matriks wewenang bertingkat untuk pembatasan akses data finansial/HPP dan pengaturan toko.
- [x] **2-Step Onboarding Wizard:**
  - Langkah 1: Identitas Bisnis & Jenis Badan Usaha
  - Langkah 2: Pendaftaran Toko Pertama di Marketplace (Shopee / TikTok Shop / Tokopedia)
- [x] **Master Data Toko (`stores`):** Tambah toko baru, pemetaan marketplace, kelola status aktif/nonaktif.
- [x] **Master Data Produk & SKU (`products` & `skus`):** Pembuatan produk master dan penetapan kode SKU internal sebagai kunci universal rekonsiliasi.
- [x] **Struktur HPP (`productCosts`):** Pencatatan Harga Pokok Penjualan, bahan kemasan/packing (kardus, bubble wrap, polymailer, thermal shipping label).
- [x] **Dashboard Shell & Intentional Empty States:** Sesuai prinsip *No Fake Data*, dashboard menampilkan checklist panduan setup dan pesan *"Belum ada data transaksi"* sebelum laporan diunggah.
- [x] **Firestore Security Rules:** Menerapkan 8 pilar keamanan Firestore (default deny, relasi parent-child, validasi schema, immutable field `createdAt`/`ownerId`, penolakan akses VIEWER ke data biaya HPP).
- [x] **Audit Log System (`auditLogs`):** Jejak aktivitas penting dicatat ke subkoleksi secara immutable.
- [x] **Arsitektur Placeholder:** Modul Import Data, Rekonsiliasi, Profit Engine, dan AI Analyst siap dikembangkan pada fase berikutnya tanpa merusak fondasi inti.

---

## 3. Struktur Proyek

```text
marketflow/
├── src/
│   ├── types/               # TypeScript type definitions (auth, business, store, product, common)
│   ├── utils/               # Currency IDR, Jakarta dates, error handlers conforming to Firebase skill
│   ├── schemas/             # Zod validation schemas
│   ├── services/            # Firestore service layer (business, store, product, user, audit)
│   ├── lib/
│   │   ├── firebase/        # Client init, config loader, converters
│   │   ├── auth/            # AuthProvider, useAuth, AuthGuard, permission matrix
│   │   ├── import/          # Import interfaces & abstraction
│   │   ├── marketplace/     # Marketplace adapters
│   │   ├── reconciliation/  # Reconciliation types & status
│   │   ├── profit/          # Profit formula specifications
│   │   ├── analytics/       # Analytics metric summaries
│   │   └── ai/              # AI Analyst context layer
│   ├── components/
│   │   ├── ui/              # Button, Input, Select, Badge, Card, Dialog
│   │   ├── shared/          # PageHeader, RoleBadge, StatusBadge, EmptyState, LoadingState
│   │   ├── layout/          # AppShell, Sidebar, Header, NewBusinessModal
│   │   ├── auth/            # AuthPage (Login/Register)
│   │   ├── onboarding/      # 2-Step Onboarding Wizard
│   │   ├── dashboard/       # DashboardView & setup checklist
│   │   ├── stores/          # StoresView
│   │   ├── products/        # ProductsView & HPPView
│   │   └── settings/        # BusinessSettingsView & TeamSettingsView
│   ├── App.tsx              # Root router & multi-tenant application controller
│   ├── main.tsx
│   └── index.css            # Tailwind CSS v4 styles & dark theme
├── firebase/
│   ├── firestore.rules      # Hardened security rules
│   ├── firestore.indexes.json
│   └── storage.rules
├── firebase-blueprint.json  # Intermediate Representation (IR) schema
├── security_spec.md         # Invariants & threat test specification
├── .env.example             # Client environment variables reference
├── package.json
└── README.md
```

---

## 4. Konfigurasi Environment Variables

Salin `.env.example` menjadi `.env.local` saat pengembangan lokal:

```bash
cp .env.example .env.local
```

Isi konfigurasi Firebase Client:

```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="your-database-id"
```

> **Keamanan:** Jangan pernah menaruh service account key atau secret server di file environment berawalan `VITE_` atau `NEXT_PUBLIC_`.

---

## 5. Menjalankan Aplikasi Secara Lokal

```bash
# 1. Install dependensi
npm install

# 2. Jalankan development server
npm run dev

# 3. Validasi tipe TypeScript
npm run lint

# 4. Uji build produksi
npm run build
```

Aplikasi akan berjalan pada port `http://localhost:3000`.

---

## 6. Deployment ke Vercel

1. Hubungkan repository GitHub ke dashboard **Vercel**.
2. Di menu **Environment Variables**, tambahkan seluruh konfigurasi Firebase dari `.env.example`.
3. Set build command: `npm run build` dan output directory: `dist`.
4. Deploy!

---

## 7. Roadmap Pengembangan

- **Foundation V0.1 (Selesai):** Auth, Workspace Multi-Tenant, Role System, Onboarding, Toko, Produk/SKU, HPP, Security Rules.
- **Phase 1 — Processing Engine:** Parser XLSX laporan Shopee (OrderAll & Income settlement), normalisasi data pesanan, batch processing.
- **Phase 2 — Profit & Analytics:** Kalkulasi otomatis Gross Profit, Contribution Profit, biaya admin marketplace, grafik penjualan harian.
- **Phase 3 — Reconciliation Engine:** Pencocokan status pesanan vs dana escrow masuk, deteksi selisih / order hilang.
- **Phase 4 — AI Business Analyst:** Asisten cerdas berbasis Gemini API untuk rekomendasi efisiensi biaya dan optimasi iklan toko.
