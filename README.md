# POS Platform — Frontend

> **Live Demo:** https://k-pos-prod.netlify.app

Frontend untuk platform **Point of Sale (POS) + Business Intelligence** bagi UMKM dengan konsep **Single Merchant, Multi Outlet, Multi Kasir**. Dirancang untuk memisahkan beban transaksi (checkout kasir yang butuh latency rendah) dari beban analitik dan administratif agar performa checkout tetap responsif saat skala meningkat.

## Fitur Utama

| Role | Cakupan | Akses Fitur |
|---|---|---|
| **Owner** | Seluruh merchant | Dashboard & Analitik, AI Insight, kelola Outlet, Staf, Merchant, Produk & Kategori, lihat transaksi |
| **Admin** | Seluruh merchant | Dashboard Stok, Inventori (adjust, bulk, transfer), kelola Produk & Kategori, lihat transaksi |
| **Cashier** | 1 outlet tetap | POS (pilih produk → keranjang → pembayaran), riwayat transaksi outlet sendiri |

Alur kritis **POS Checkout** (`/pos`) dibuat tablet-first tanpa sidebar, keranjang sticky, dan penanganan error stok serta perubahan harga.

## Tech Stack

React 19, TypeScript, Vite 6, React Router 7, TanStack Query 5, Zustand, React Hook Form + Zod, Tailwind CSS 3, Radix UI, Recharts, Vite PWA.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npm run dev      # http://localhost:5173
```

Build produksi:

```bash
npm run build
npm run preview
```

Perintah lain: `npm run lint`, `npm run typecheck`, `npm run test`.

## Environment Variables

| Variable | Deskripsi |
|---|---|
| `VITE_API_MODE` | `mock` = data dummy lokal, `live` = terhubung ke Backend |
| `VITE_API_URL` | Base URL Backend saat mode `live` (contoh: `http://localhost:3000/api/v1`) |
| `VITE_API_TIMEOUT_MS` | Timeout request (default `15000`) |
| `VITE_MOCK_LATENCY_MS` | Delay simulasi saat mode `mock` |

## Akun Demo

Semua akun menggunakan password yang sama: `password123`

| Role | Email | Nama | Outlet |
|---|---|---|---|
| Owner | `owner@mart.com` | John Doe | — (semua outlet) |
| Admin | `admin@mart.com` | Sari Dewi | — (semua outlet) |
| Cashier | `kasir1@mart.com` | Budi Santoso | Cabang Pusat |
| Cashier | `kasir2@mart.com` | Ani Wijaya | Cabang Senayan |
| Cashier | `kasir3@mart.com` | Rudi Hartono | Cabang Kelapa Gading |

> Login melalui halaman `/login`. Sistem akan mengarahkan otomatis sesuai role (Owner/Admin ke Dashboard, Cashier ke POS).

## Struktur Folder

```
src/
├── api/          → client & mock data
├── components/   → ui, layouts, pages
├── pages/        → auth, dashboard, catalog, pos, transactions, owner
├── routes/       → routing berbasis role
├── stores/       → state management
├── lib/          → helper & utilitas
└── hooks/        → custom hooks
```

---

## Repository Terkait

| Repository | Link |
|---|---|
| **Backend (API)** | `PASTE_LINK_REPO_BACKEND_DI_SINI` |

**Cara mengisi link:**

Ganti `PASTE_LINK_REPO_BACKEND_DI_SINI` dengan URL repository backend.

Contoh:
```
https://github.com/username/nama-repo-backend
```

Format penulisan:
```
[Backend](https://github.com/username/nama-repo-backend)
```

Jika backend berada dalam mono-repo, arahkan ke folder backend:
```
https://github.com/username/nama-repo/tree/main/apps/backend
```
