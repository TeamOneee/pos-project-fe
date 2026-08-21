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

## PWA — Bisa Diinstal di Android

Sudah dikonfigurasi sebagai **Progressive Web App (PWA)** via `vite-plugin-pwa` (`vite.config.ts:8`). Bisa diinstal langsung dari browser tanpa Play Store.

**Cara instal:** buka [Live Demo](https://k-pos-prod.netlify.app) di Chrome Android → menu ⋮ → **Instal aplikasi / Tambahkan ke layar utama**. Setelah terinstal akan berjalan fullscreen (standalone), ada ikon di home screen, dan mendukung cache offline untuk shell aplikasi.

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
| **Backend (API)** | `https://github.com/TeamOneee/pos-project-be` |
