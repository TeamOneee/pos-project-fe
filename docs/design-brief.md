# POS SaaS — Frontend Design Brief (for Figma AI)

> **How to use this document:** paste it whole into Figma AI (Make / First Draft) as the generation prompt. It contains the design system, screen-by-screen layout specs, sample data, and prototype flows. Every screen is numbered `S-xx`; every flow is `F-xx`. Generate all screens at all three breakpoints listed in §2.6.
>
> **UI copy language: Bahasa Indonesia.** Currency: Indonesian Rupiah, displayed as `Rp 15.000` (no decimals in UI, even though the API sends `"15000.00"`).

---

## 1. Product in one paragraph

A multi-tenant SaaS **Point of Sale** for Indonesian small businesses (UMKM) that run **one merchant with several outlets**. Three human roles use it: the **Owner** (business strategy, staff, outlets, AI insight), the **Admin** (product catalog and per-outlet stock), and the **Cashier** (cart and checkout at one assigned outlet). The product is not just a cash-register screen and not just an analytics dashboard — it is the loop between the two: *set up the store → sell → record → understand → decide → improve how you sell*.

**Design north star:** checkout must feel instant and unambiguous; everything else may be a little slower but must be trustworthy and legible.

### 1.1 The three roles at a glance

| Role | Scope | Lives in | Can change | Read-only |
|---|---|---|---|---|
| **Owner** | Whole merchant | Dashboard & Analytics | Merchant, Outlets, Staff, Category, Product | Inventory, Transactions |
| **Admin** | Whole merchant | Inventory dashboard | Category, Product, Inventory (adjust/bulk/transfer) | Transactions |
| **Cashier** | Exactly one outlet | POS checkout screen | Cart, Checkout | Products, Stock, own outlet's transactions |

Owner and Admin have **no** access to the cashier POS screen. Admin and Cashier have **no** access to AI Insight or Owner analytics. Cashier sees only their own outlet.

---

## 2. Design system

Visual direction: **clean modern SaaS** — neutral gray surfaces, a single indigo accent, hairline borders instead of heavy shadows, generous whitespace, data-dense but calm. Reference feel: Linear / Stripe Dashboard. Not playful, not skeuomorphic, no gradients except one subtle accent on the AI card.

### 2.1 Color tokens

Define these as Figma variables in a collection named `color`, with a **Light** and **Dark** mode.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `bg/canvas` | `#F7F8FA` | `#0B0D11` | App background behind cards |
| `bg/surface` | `#FFFFFF` | `#14171D` | Cards, tables, modals, sidebar |
| `bg/surface-raised` | `#FFFFFF` | `#1B1F27` | Popovers, dropdowns, tooltips |
| `bg/subtle` | `#F1F3F6` | `#1B1F27` | Table header row, hover, input fill |
| `border/default` | `#E4E7EC` | `#272B34` | Hairline dividers, card borders, inputs |
| `border/strong` | `#CDD2DA` | `#3A404C` | Focused input, active tab underline |
| `text/primary` | `#101828` | `#F2F4F7` | Headings, table values, big numbers |
| `text/secondary` | `#5A6376` | `#98A2B3` | Labels, captions, table headers |
| `text/tertiary` | `#8A94A6` | `#6B7385` | Placeholders, disabled, timestamps |
| `accent/base` | `#4F46E5` | `#6366F1` | Primary buttons, active nav, links |
| `accent/hover` | `#4338CA` | `#818CF8` | Primary button hover |
| `accent/subtle` | `#EEF0FE` | `#1E1B4B` | Active nav pill, selected row, AI card |
| `success/base` | `#16A34A` | `#22C55E` | Completed status, positive growth, in-stock |
| `success/subtle` | `#ECFDF3` | `#052E16` | Success badge/toast background |
| `warning/base` | `#D97706` | `#F59E0B` | Low stock, processing, pending |
| `warning/subtle` | `#FFFAEB` | `#3B2506` | Low-stock badge/row highlight |
| `danger/base` | `#DC2626` | `#EF4444` | Out of stock, errors, destructive actions |
| `danger/subtle` | `#FEF3F2` | `#3B0A0A` | Error banner, out-of-stock row |
| `info/base` | `#0284C7` | `#38BDF8` | Neutral informational badges |

**Chart palette** (use in this order, never re-order): `#4F46E5`, `#0EA5E9`, `#14B8A6`, `#F59E0B`, `#EC4899`, `#8B5CF6`. Revenue series is always `#4F46E5`; transaction-count series is always `#0EA5E9`.

### 2.2 Typography

Font: **Inter** (fallback: system sans). Set as a Figma text-style set.

| Style | Size / Line | Weight | Use |
|---|---|---|---|
| `display` | 32 / 40 | 600 | Big KPI numbers on Owner dashboard |
| `h1` | 24 / 32 | 600 | Page title |
| `h2` | 18 / 26 | 600 | Card / section title |
| `h3` | 15 / 22 | 600 | Sub-section, modal title |
| `body` | 14 / 20 | 400 | Default text, table cells |
| `body-strong` | 14 / 20 | 500 | Emphasized cell, product name |
| `label` | 13 / 18 | 500 | Form labels, table headers (also `letter-spacing: 0.01em`) |
| `caption` | 12 / 16 | 400 | Helper text, timestamps, units |
| `mono` | 13 / 20 | 500 | Money, SKU, transaction numbers — tabular figures on |

**Money is always `mono` with tabular numerals and right-aligned in tables.**

### 2.3 Spacing, radius, elevation

- Spacing scale (4px base): `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Radius: `sm 6` (badges, inputs), `md 8` (buttons), `lg 12` (cards, modals), `full` (avatars, pills).
- Elevation: `e1 = 0 1px 2px rgba(16,24,40,.05)` for cards; `e2 = 0 8px 24px rgba(16,24,40,.10)` for popovers; `e3 = 0 20px 48px rgba(16,24,40,.18)` for modals. Dark mode uses borders instead of shadows.
- Grid: 12 columns, 24px gutter, 32px page padding on desktop.

### 2.4 Core components to build

Build these as Figma components with variants before laying out screens.

1. **Button** — variants: `primary / secondary / ghost / danger`, sizes `sm(32) / md(40) / lg(48)`, states `default / hover / pressed / disabled / loading`, optional leading icon.
2. **Input** — text, number, search (leading magnifier), select, date-range picker, textarea. States: `default / focus / filled / error / disabled`. Error state shows a `danger/base` 12px message below.
3. **Badge / Status pill** — `success`, `warning`, `danger`, `info`, `neutral`. Used for: `AKTIF`/`NONAKTIF`, `SELESAI`, `STOK MENIPIS`, `STOK HABIS`, `OWNER`/`ADMIN`/`KASIR`.
4. **Card** — surface + 1px border + radius lg + 20px padding. Variants: plain, with header (title + optional action link), with footer.
5. **KPI stat tile** — label (`label`, secondary) / value (`display`, mono) / delta chip (`▲ 12,5%` in success or `▼ 3,1%` in danger) + caption "vs periode sebelumnya".
6. **Data table** — sticky header row on `bg/subtle`, 48px rows, hairline row dividers, hover `bg/subtle`, right-aligned numeric columns, per-row action menu (`⋯`). Includes a pagination footer: "Menampilkan 1–10 dari 156" + prev/next + page-size select.
7. **Modal / Dialog** — 480px (form), 640px (wide form), 800px (transfer/bulk). Header with title + close, scrollable body, right-aligned footer buttons ("Batal" ghost + primary action).
8. **Sheet / Drawer** — right side, 480px, used for transaction detail and product quick-view on tablet.
9. **Toast** — top-right, auto-dismiss 4s, `success / error / info` variants with icon.
10. **Empty state** — centered icon in a 48px `bg/subtle` circle, `h3` title, `body` secondary description, optional primary button.
11. **Sidebar nav item** — icon + label, active = `accent/subtle` pill with `accent/base` text.
12. **Chart frames** — line chart, bar chart, horizontal bar chart, donut. Axis labels `caption` in `text/tertiary`, gridlines `border/default` at 50% opacity, no chart junk, tooltip on hover.
13. **Product tile (POS)** — square-ish card: product name (2 lines max), price in mono, stock caption ("Stok: 20"), tap target min 88px tall. Disabled/greyed variant when stock = 0.
14. **Cart line item** — product name + unit price, quantity stepper (− / value / +), line subtotal, remove `×`.
15. **Skeleton loader** — shimmer blocks for cards, tables, and charts.

### 2.5 App shell

- **Desktop (≥1280):** fixed left sidebar 248px wide on `bg/surface` with 1px right border. Top: merchant name + a small "Merchant" caption. Middle: nav items grouped by section. Bottom: user chip (avatar circle with initials, name, role badge) opening a menu with "Profil" and "Keluar".
  Top bar 64px: page title on the left; on the right, contextual controls (outlet selector, period selector, search) then a notification bell.
- **Tablet (768–1279):** sidebar collapses to a 72px icon rail with tooltips. The cashier POS screen (S-16) uses **no sidebar at all** — see its spec.
- **Mobile (<768):** sidebar becomes a bottom tab bar (max 5 items per role) + a hamburger for the rest. Tables convert to stacked cards (see §7.3).

### 2.6 Breakpoints to generate

| Name | Width | Primary audience |
|---|---|---|
| Desktop | 1440 × 1024 | Owner dashboard, Admin management |
| Tablet | 1024 × 768 (landscape) | **Cashier POS — this is the primary POS form factor** |
| Mobile | 390 × 844 | Owner checking numbers on the go; Admin quick stock check |

Generate all screens at Desktop. Generate **S-16 through S-20 (the cashier flow)** at Tablet as the primary target. Generate S-03, S-16, S-19, S-21 at Mobile at minimum; ideally all.

---

## 3. Navigation per role

The sidebar is **role-dependent**. Never show an item the role cannot access.

**Owner**
```
DASHBOARD
  ├ Dashboard          → S-03
  ├ Analitik           → S-04
  └ AI Insight         → S-05
BISNIS
  ├ Outlet             → S-06
  ├ Staf               → S-08
  └ Merchant           → S-10
KATALOG
  ├ Produk             → S-11
  └ Kategori           → S-13
RIWAYAT
  └ Transaksi          → S-21
```

**Admin**
```
OPERASIONAL
  ├ Dashboard Stok     → S-14
  ├ Inventori          → S-15
  └ Stok Menipis       → S-15c
KATALOG
  ├ Produk             → S-11
  └ Kategori           → S-13
RIWAYAT
  └ Transaksi          → S-21
```

**Cashier**
```
  ├ Kasir              → S-16   (default landing, full-screen)
  └ Riwayat Transaksi  → S-21
```
The cashier sidebar is minimal — only these two, plus the user chip at the bottom. On tablet the cashier navigates via a top bar, not a sidebar.

---

## 4. Screen specs

Money display rule everywhere: API `"15750000.00"` → UI `Rp 15.750.000`. Dates: `13 Agu 2026, 14:30`. Percentages: `12,5%` (comma decimal separator).

---

### S-01 · Login

**Route:** `/login` · **Access:** public · **API:** `POST /auth/login`

Two-column split at desktop. **Left (40%)** on `accent/base` background: product wordmark top-left, a large `display`-size tagline in white — *"Jual hari ini. Pahami bisnismu besok."* — and a subtle abstract line-chart illustration at low opacity behind it. **Right (60%)** on `bg/canvas`, centered 400px column:

- `h1` "Masuk ke akun Anda"
- `body` secondary: "Gunakan email yang terdaftar pada merchant Anda."
- Field: **Email** (`label` "Email", placeholder `nama@bisnis.com`)
- Field: **Password** with a show/hide eye toggle
- Full-width `primary lg` button: **"Masuk"**
- Below, centered `body`: "Belum punya akun merchant? **Daftar di sini**" → S-02

**Error state (401):** a `danger/subtle` banner above the fields with a warning icon: "Email atau password salah." Both inputs go to error border. *Never* reveal which field was wrong.
**Inactive account (403):** banner "Akun Anda dinonaktifkan. Hubungi Owner merchant Anda."
**Loading:** button shows spinner and label "Memproses…", fields disabled.

Mobile: single column, logo at top, form fills width with 20px padding.

---

### S-02 · Register (Owner + Merchant)

**Route:** `/register` · **Access:** public · **API:** `POST /auth/register`

Same split layout as S-01. The right column is a single form that creates **both** the merchant and the first Owner account:

- `h1` "Daftarkan bisnis Anda"
- `caption` secondary: "Akun pertama otomatis menjadi Owner."
- Section label **"Data Bisnis"** → Field: **Nama Merchant** (placeholder "Toko Sejahtera")
- Divider
- Section label **"Akun Owner"** → Fields: **Nama Lengkap**, **Email**, **Password** (helper below: "Minimal 8 karakter"), **Konfirmasi Password**
- Full-width primary button **"Buat Akun & Merchant"**
- "Sudah punya akun? **Masuk**" → S-01

**Error (409 email taken):** the email field goes to error state with message "Email ini sudah terdaftar." plus a top banner.
**Success:** auto-login, toast "Merchant berhasil dibuat. Selamat datang!", route to S-03.

---

### S-03 · Owner Dashboard ★ hero screen

**Route:** `/dashboard` · **Access:** OWNER · **API:** `GET /dashboard/owner?period=&outlet_id=`

This is the screen to make beautiful — it is the demo centerpiece. Full app shell, sidebar + top bar.

**Top bar controls (right side):**
- **Outlet selector** — a select defaulting to "Semua Outlet", listing each outlet.
- **Period selector** — segmented control: `Hari Ini · Minggu Ini · Bulan Ini · Kuartal Ini · Tahun Ini`. Default **Bulan Ini**.
- A `caption` in `text/tertiary` to the far right: **"Diperbarui 2 menit lalu"** with a small refresh icon button. *This freshness indicator is required — the dashboard is not real-time and the UI must say so honestly.*

**Body, top to bottom:**

**Row 1 — 4 KPI tiles** (equal width, 24px gap):
| Tile | Value | Delta |
|---|---|---|
| Total Omzet | `Rp 15.750.000` | ▲ 12,5% |
| Jumlah Transaksi | `1.250` | ▲ 8,3% |
| Rata-rata Nilai Transaksi (AOV) | `Rp 12.600` | ▲ 6,8% |
| Produk Terjual | `3.420` | ▲ 5,1% |
Each tile caption: "vs periode sebelumnya".

**Row 2 — Sales trend (span 8 cols) + Merchant overview (span 4 cols):**
- **"Tren Penjualan"** card. Dual-axis line chart: revenue line (`#4F46E5`, filled area at 8% opacity) and transaction-count line (`#0EA5E9`, thinner, dashed). X-axis = dates. Small legend top-right. Below the chart, a 4-item inline summary strip: `Tertinggi Rp 2.700.000 · Terendah Rp 1.800.000 · Rata-rata Rp 2.250.000 · Total Rp 15.750.000`.
- **"Ringkasan Merchant"** card: merchant name as `h2`, then a definition list — `Outlet aktif 3`, `Karyawan aktif 12`, `Produk aktif 156`, `Kategori 8`. At the bottom, a divider then a mini AI block on `accent/subtle`: sparkle icon, `caption` "Analisis AI terakhir: 12 Agu 2026, 08:00", and a `secondary sm` button **"Lihat Insight"** → S-05.

**Row 3 — Outlet performance (span 7) + Time pattern (span 5):**
- **"Performa Outlet"** card: horizontal bar chart, one bar per outlet, sorted descending by revenue. Each row shows outlet name (left), bar, revenue value + contribution `%` (right), and a small growth delta chip. 3 outlets in the sample.
- **"Pola Waktu Penjualan"** card: vertical bar chart of hourly revenue, hours 08–22 on the X axis. **Peak hours (12, 13, 19, 20) are rendered in `accent/base`; all other bars in `border/strong`.** Below the chart, two caption lines with a lightbulb icon: "Penjualan tertinggi pada 12.00–13.00 dan 19.00–20.00" / "Sabtu adalah hari tersibuk, Senin paling sepi."

**Row 4 — Top products (span 6) + Underperforming (span 6):**
- **"Produk Terlaris"** card with a small tab toggle `Berdasarkan Omzet | Berdasarkan Kuantitas`. A rank list: `#1` badge, product name + category caption, then qty sold and revenue right-aligned. 5 rows.
- **"Produk Kurang Laku"** card: table with columns `Produk · Terjual · Omzet · Stok · Terakhir Terjual`. The "Terakhir Terjual" cell shows "14 hari lalu" in `warning/base`. Each row has a right-side recommendation badge — `PROMOSI`, `TURUNKAN HARGA`, `PINDAH OUTLET`.

**Row 5 — AOV trend (span 6) + Recent transactions (span 6):**
- **"Tren AOV"** card: simple line chart with 4 week points; big current value `Rp 12.600` in `display` above the chart with a growth chip.
- **"Transaksi Terbaru"** card: 5 compact rows — transaction number (mono), outlet name + cashier name as caption, total right-aligned, relative time. Footer link "Lihat semua transaksi →" → S-21.

**Row 6 — Period comparison (full width):** a card titled **"Perbandingan Periode"** with two side-by-side blocks (current vs previous, each showing date range + revenue + transactions) and a centered column of three delta chips between them (`Omzet ▲12,5%`, `Transaksi ▲8,7%`, `AOV ▲6,8%`).

**Empty state (new merchant, no transactions):** replace rows 2–6 with a single centered empty card: chart icon, "Belum ada data penjualan", "Data dashboard akan muncul setelah kasir menyelesaikan transaksi pertama.", button "Kelola Outlet" → S-06. KPI tiles still render, showing `Rp 0` / `0`.

**Loading:** skeleton tiles and skeleton chart blocks matching the layout.

**Mobile:** everything stacks to one column. KPI tiles become a 2×2 grid. Charts keep full width at 200px height. The period selector becomes a horizontally scrollable chip row pinned under the header.

---

### S-04 · Analytics

**Route:** `/analytics` · **Access:** OWNER · **API:** `GET /analytics/sales-trend`, `/time-pattern`, `/aov-trend`, `/product-performance`

Page title "Analitik" with a subtitle "Analisis mendalam performa bisnis Anda." A tab bar directly under the title with 4 tabs:

**Tab 1 — Tren Penjualan.** Controls row: date-range picker (default: this month) + outlet selector + interval segmented control `Harian · Mingguan · Bulanan`. Then a large full-width line chart (400px tall), then a 4-tile summary row (Total Omzet, Rata-rata Omzet Harian, Total Transaksi, Rata-rata Transaksi Harian), then a data table of the raw series (`Tanggal · Total Penjualan · Jumlah Transaksi`) with an export-icon ghost button.

**Tab 2 — Pola Waktu.** Controls: outlet selector + period segmented `Hari Ini · Minggu Ini · Bulan Ini`. A large hourly bar chart with peak hours highlighted. To the right, a narrow card "Jam Sibuk" listing the peak hours as large chips, plus "Rata-rata transaksi per jam: 35".

**Tab 3 — Tren AOV.** Controls: outlet selector + period. A line chart of AOV over the period, a big current-AOV number with change chip, and a table (`Periode · AOV · Jumlah Transaksi`).

**Tab 4 — Performa Produk.** Controls: outlet selector + period + sort-by segmented `Omzet · Kuantitas` + a limit select (10/25/50). Two stacked sections: **"Produk Terlaris"** (table: `Rank · Produk · SKU · Kategori · Terjual · Omzet`, rank shown as a colored circle for top 3) and **"Produk Kurang Laku"** (same columns plus `Hari Tanpa Penjualan` in warning color).

---

### S-05 · AI Insight

**Route:** `/ai-insights` · **Access:** OWNER · **API:** `GET /ai-insights`, `POST /ai-insights/analyze`

Page title "AI Insight" + subtitle "Analisis dan rekomendasi bisnis berbasis data Anda."

**Hero action card** at the top, on `accent/subtle` with a 1px `accent/base` border at 30% opacity: a sparkle icon in a white circle, `h2` "Analisis dengan AI", `body` secondary "Jalankan analisis kapan saja untuk mendapatkan rekomendasi terbaru berdasarkan data penjualan dan stok Anda.", and a `primary lg` button **"Analisis dengan AI"** on the right. A `caption` under the button: "Analisis terakhir: 13 Agu 2026, 08.00".

**Result card** below: insight `type` badge (e.g. `PERINGATAN STOK` in warning, `TREN PENJUALAN` in info, `REKOMENDASI` in accent), `h2` title, then the insight body as readable prose (max-width 720px, `body` 15/24 for comfortable reading). Footer of the card: a divider then `caption` "Diperbarui 13 Agu 2026, 08.00" on the left and a ghost "Salin" button on the right.

**States — all four must exist as frames:**
1. **READY** — as described above.
2. **PROCESSING** (after clicking, or 202 response) — the result card is replaced by a card with an animated pulsing sparkle, `h3` "Sedang menganalisis…", `body` secondary "Analisis sedang diproses. Hasil akan muncul dalam beberapa saat.", and an indeterminate progress bar. The trigger button becomes disabled with label "Menganalisis…".
3. **ALREADY RUNNING (409)** — a `warning/subtle` inline banner above the hero: "Analisis sedang berjalan. Tunggu hingga selesai sebelum memicu analisis baru."
4. **EMPTY (404, never analyzed)** — the result card is an empty state: sparkle icon, "Belum ada insight", "Jalankan analisis pertama Anda untuk melihat rekomendasi bisnis.", no secondary button (the hero button is the CTA).

There is **no history list** — the system stores exactly one insight per merchant and overwrites it. Do not design a list, an archive, or a dismiss action.

---

### S-06 · Outlets list

**Route:** `/outlets` · **Access:** OWNER · **API:** `GET /outlets?status=`

Page header: `h1` "Outlet", subtitle "Kelola lokasi operasional merchant Anda.", right-aligned `primary` button **"+ Tambah Outlet"** → S-07.

Filter bar: search input ("Cari outlet…") + status select (`Semua Status · Aktif · Nonaktif`).

**Card grid** (3 per row desktop, 2 tablet, 1 mobile) rather than a table — outlets are few and this reads better. Each outlet card: status badge top-right (`AKTIF` success / `NONAKTIF` neutral), a store icon in a `bg/subtle` circle, `h3` outlet name, `body` secondary address on 2 lines, then a divider and a stat row — `Kasir 3` · `Produk 120` · `Stok 1.200`. Bottom-right `⋯` menu with "Edit" and "Nonaktifkan" (the latter in `danger/base`).

**Empty state:** store icon, "Belum ada outlet", "Tambahkan outlet pertama untuk mulai berjualan.", button "+ Tambah Outlet".

---

### S-07 · Create / Edit outlet (modal)

**API:** `POST /outlets`, `PUT /outlets/{outletId}`

480px modal. Title "Tambah Outlet" / "Edit Outlet". Fields: **Nama Outlet** (required), **Alamat** (textarea, 3 rows, required), **Status** (radio group or toggle: Aktif / Nonaktif, default Aktif). Footer: ghost "Batal" + primary "Simpan".

**Deactivate confirmation** is a separate 400px dialog: danger icon, "Nonaktifkan outlet ini?", body "Outlet **Outlet A - Mall Central** tidak akan bisa menerima transaksi baru. Riwayat transaksi tetap tersimpan.", buttons "Batal" + danger "Nonaktifkan".

---

### S-08 · Staff list

**Route:** `/users` · **Access:** OWNER · **API:** `GET /users?role=&outlet_id=&status=`

Header: `h1` "Staf", subtitle "Kelola akun Admin dan Kasir merchant Anda.", primary button **"+ Tambah Staf"** → S-09.

Filter bar: search ("Cari nama atau email…") + role select (`Semua Role · Owner · Admin · Kasir`) + outlet select + status select.

**Data table** with columns:
| Nama | Email | Role | Outlet | Status | (⋯) |
|---|---|---|---|---|---|
| avatar circle w/ initials + name (`body-strong`) | `body` secondary | role badge — `OWNER` accent, `ADMIN` info, `KASIR` neutral | outlet name, or an em-dash `—` for Owner/Admin | `AKTIF`/`NONAKTIF` badge | menu |

Row menu: "Edit", "Reset Password", "Nonaktifkan" (danger). The Owner's own row has no menu (cannot deactivate self).

---

### S-09 · Create / Edit staff (modal)

**API:** `POST /users`, `PUT /users/{userId}`

560px modal. Fields in order: **Nama Lengkap**, **Email**, **Password** (only shown on create; helper "Minimal 8 karakter"), **Role** (select: Admin / Kasir — Owner is not selectable), **Outlet** (select).

**Critical conditional behavior — design both variants as separate frames:**
- Role = **Kasir** → the Outlet field is **enabled and required**, listing only active outlets. Helper: "Kasir bertugas pada tepat satu outlet."
- Role = **Admin** → the Outlet field is **disabled, cleared, and greyed** with helper "Admin bekerja pada seluruh outlet merchant."

Then **Status** (toggle Aktif/Nonaktif, default Aktif). Footer: "Batal" + "Simpan".

Error frames needed: email already used (field error "Email ini sudah terdaftar."), and cashier submitted without an outlet (field error "Outlet wajib dipilih untuk role Kasir.").

---

### S-10 · Merchant settings

**Route:** `/merchant` · **Access:** OWNER · **API:** `GET /merchants`, `PUT /merchants`

Narrow single-column page (max-width 720px). `h1` "Pengaturan Merchant".

**Card 1 — "Informasi Merchant":** field **Nama Merchant**, plus a read-only row showing "Dibuat pada 13 Agu 2026" as caption.

**Card 2 — "Konfigurasi Stok":** field **Batas Stok Menipis** (number input with a "unit" suffix, default 10) and helper text "Produk dengan stok di bawah angka ini akan ditandai sebagai stok menipis di seluruh outlet." Below the field, a live preview chip: "Contoh: produk dengan stok 8 akan ditandai **STOK MENIPIS**."

Sticky footer bar inside the content column: "Batal" ghost + "Simpan Perubahan" primary, only enabled when the form is dirty.

---

### S-11 · Products list

**Route:** `/products` · **Access:** OWNER, ADMIN (Cashier reaches products only through the POS screen) · **API:** `GET /products?category_id=&status=&search=&page=&limit=`

Header: `h1` "Produk", subtitle "Katalog produk merchant Anda.", primary button **"+ Tambah Produk"** → S-12.

Filter bar: search input ("Cari nama atau SKU…", with magnifier icon and clear `×`) + category select + status select. On the right of the filter bar, a small view-toggle (table / grid icons) — default **table**.

**Data table** columns:
| Produk | SKU | Kategori | Harga | Status | (⋯) |
|---|---|---|---|---|---|
| product thumbnail placeholder (40px rounded square, `bg/subtle`, first letter) + name `body-strong` | mono, secondary | category badge (neutral) | mono, right-aligned, `Rp 15.000` | badge | menu |

Row menu: "Edit", "Lihat Stok per Outlet" (→ opens S-15b sheet), "Nonaktifkan" (danger).
Pagination footer: "Menampilkan 1–10 dari 156".

Inactive products render at 60% opacity with a `NONAKTIF` neutral badge.

**Empty states — two variants:** no products at all ("Belum ada produk" + CTA), and no search results ("Tidak ada produk yang cocok dengan pencarian Anda." + "Hapus filter" ghost button).

**Mobile:** table becomes a stacked card list — name + price on the first line, SKU + category + status on the second, `⋯` on the right.

---

### S-12 · Create / Edit product (modal)

**API:** `POST /products`, `PUT /products/{productId}`

560px modal. Fields: **Nama Produk** (required), **SKU** (required, mono input, helper "Kode unik produk, contoh: CC-1500"), **Kategori** (select — **only active categories appear**; helper "Hanya kategori aktif yang dapat dipilih."), **Harga** (number input with a `Rp` prefix adornment, thousand separators as you type), **Status** (toggle Aktif/Nonaktif).

An info banner at the bottom of the modal body on `info/subtle` when editing an existing product: ℹ "Perubahan harga hanya berlaku untuk transaksi berikutnya. Riwayat transaksi lama tidak berubah." — this rule matters and the UI must state it.

Error frame: category inactive → field error "Kategori tidak aktif atau bukan milik merchant ini."

---

### S-13 · Categories

**Route:** `/categories` · **Access:** OWNER, ADMIN · **API:** `GET/POST/PUT/DELETE /categories`

Simple page. Header with `h1` "Kategori" + primary "+ Tambah Kategori". A single table: `Nama Kategori · Jumlah Produk · Status · (⋯)`. The create/edit modal is small (400px) with one field, **Nama Kategori**.

**Deactivate dialog** must warn about the consequence: "Nonaktifkan kategori ini? Kategori **Beverages** tidak akan bisa dipilih untuk produk baru. 24 produk yang sudah menggunakan kategori ini tetap tidak berubah."

---

### S-14 · Admin Dashboard (Inventory Overview) ★ hero screen

**Route:** `/dashboard` (Admin's version) · **Access:** ADMIN · **API:** `GET /dashboard/admin?outlet_id=`

Header: `h1` "Dashboard Stok", subtitle "Ringkasan ketersediaan produk di seluruh outlet." Top-bar control: outlet selector defaulting to "Semua Outlet".

**Row 1 — 4 KPI tiles**, but these are *operational*, not financial, and two of them are alarm-colored:
| Tile | Value | Note |
|---|---|---|
| Total Produk | `156` | neutral |
| Total Stok | `3.420` unit | neutral |
| Stok Menipis | `8` | **value in `warning/base`**, tile has a left 3px warning border |
| Stok Habis | `3` | **value in `danger/base`**, tile has a left 3px danger border |
Each of the last two tiles is clickable and scrolls to its section below.

**Row 2 — "Stok Per Outlet"** card, full width: a table with one row per outlet — `Outlet · Total Produk · Total Stok · Stok Menipis · Stok Habis · (aksi)`. The two alert columns show colored count chips (a `0` renders as a plain grey dash-chip, not a colored one). The action column has a "Kelola Stok →" text link to S-15 pre-filtered to that outlet.

**Row 3 — "Peringatan Stok Menipis"** card, full width, with a warning icon in the header and a count badge `8`. Table: `Produk · SKU · Outlet · Stok Saat Ini · Batas · Aksi`. The "Stok Saat Ini" cell is a `warning` badge showing the number. The Aksi column has a `secondary sm` button **"Sesuaikan Stok"** which opens S-15a directly. Rows are sorted most-urgent first (lowest stock relative to threshold).

**Row 4 — "Produk Stok Habis"** card, full width, danger icon + count badge `3`. Table: `Produk · SKU · Outlet · Aksi`, with the stock cell rendering a `STOK HABIS` danger badge and the same "Sesuaikan Stok" action.

**Empty/healthy state for rows 3–4:** a compact success state inside the card — green check circle, "Semua stok dalam kondisi aman." Do not hide the card; showing the healthy state is reassuring.

---

### S-15 · Inventory management

**Route:** `/inventory` · **Access:** ADMIN (Owner sees a read-only variant) · **API:** `GET /inventory?outlet_id=&product_id=&page=&limit=`

Header: `h1` "Inventori". Right-side buttons: `secondary` **"Update Massal"** → S-15d, and `primary` **"Transfer Stok"** → S-15e.

**A required outlet selector sits at the top of the content, not in the top bar** — it is prominent because `outlet_id` is a required query param. Render it as a segmented pill row of outlet names when there are ≤4 outlets, otherwise a select. If none is chosen yet, the table area shows an empty state: "Pilih outlet untuk melihat stok."

Filter bar below: product search + a stock-condition filter (`Semua · Stok Aman · Stok Menipis · Stok Habis`).

**Data table:**
| Produk | SKU | Harga | Stok | Status Stok | Terakhir Diubah | (aksi) |
|---|---|---|---|---|---|---|
| thumb + name | mono | mono right | **large mono number, right-aligned, `body-strong`** | badge: `AMAN` success / `MENIPIS` warning / `HABIS` danger | relative time caption | "Sesuaikan" secondary sm button |

Rows with `HABIS` get a subtle `danger/subtle` row tint; `MENIPIS` gets `warning/subtle`.

**Owner variant:** identical, but the action column and the two header buttons are absent, and a caption sits under the page title: "Tampilan hanya-baca. Penyesuaian stok dilakukan oleh Admin."

---

### S-15a · Adjust stock (modal)

**API:** `PUT /inventory/{inventoryId}`

480px modal, title "Sesuaikan Stok".

Body: a read-only summary block on `bg/subtle` at the top — product name (`h3`), SKU + outlet name as caption. Then:
- A row showing **Stok Saat Ini: `20`** in `display` mono.
- **Stok Baru** number input with − / + steppers on either side, large (48px tall, centered mono value).
- A computed **delta chip** below it that updates live: `+5` in success or `−5` in danger, with the label "Perubahan".
- **Alasan** — a required textarea (2 rows) with placeholder "Contoh: Restock dari supplier". Helper: "**Alasan wajib diisi** dan akan tercatat dalam audit trail."

Footer: "Batal" + primary "Simpan Perubahan".

Error frames: empty reason → field error "Alasan wajib diisi untuk penyesuaian stok manual."; negative result → "Stok tidak boleh bernilai negatif."

---

### S-15b · Stock per outlet (drawer)

Opened from a product row anywhere. Right drawer, 480px. Header: product name + SKU. Body: a simple list, one row per outlet — outlet name on the left, stock number + status badge on the right. A total row at the bottom in `body-strong`. For Admin, each row has an inline "Sesuaikan" link.

---

### S-15c · Low stock alerts

**Route:** `/inventory/low-stock` · **Access:** ADMIN · **API:** `GET /inventory/low-stock?outlet_id=`

A dedicated page version of S-14's row 3, with an outlet filter and a fuller table. Header: `h1` "Stok Menipis" + a count subtitle "8 produk perlu perhatian." Each row's action is "Sesuaikan Stok". Include a `secondary` header button "Update Massal" that carries the filtered list into S-15d.

---

### S-15d · Bulk stock update

**API:** `PUT /inventory/bulk`

800px modal (or a full page on mobile). Title "Update Stok Massal".

Body: an **outlet select at the top** (required, disabled if pre-filled from context), then an editable table:
| Produk | Stok Saat Ini | Stok Baru | Perubahan | Alasan |
|---|---|---|---|---|
| name + SKU caption | mono, secondary | inline number input | live delta chip | inline text input |

A "+ Tambah Produk" ghost row at the bottom opens a product picker. Each row has a `×` to remove it. A footer summary strip: "**5 produk** akan diperbarui" on the left, "Batal" + "Simpan Semua" on the right.

Also design a **partial-failure result state**: after submit, rows that failed show a `danger/subtle` tint and an inline error message in the row, with a banner at the top "3 dari 5 produk berhasil diperbarui."

---

### S-15e · Transfer stock

**API:** `POST /inventory/transfer`

640px modal. Title "Transfer Stok Antar Outlet".

Body laid out as a visual transfer:
- **Produk** — a searchable product select at the top.
- A two-column block with a large centered arrow `→` between them:
  - **Left card "Dari Outlet":** outlet select, and once chosen, a caption "Stok tersedia: **20**" in `body-strong`.
  - **Right card "Ke Outlet":** outlet select (the source outlet is excluded from this list), and a caption "Stok saat ini: **15**".
- **Jumlah Transfer** — number input with steppers, with a "Maks. 20" helper and a "Transfer semua" ghost link.
- **Alasan** — required textarea.
- A **preview strip** on `bg/subtle` at the bottom that updates live: `Outlet A: 20 → 15` and `Outlet B: 15 → 20`.

Footer: "Batal" + primary "Transfer Stok".

**Error frame (insufficient stock):** `danger/subtle` banner "Stok di outlet asal tidak mencukupi." with a detail line "Diminta 5 · Tersedia 3", and the quantity field in error state.

---

### S-16 · Cashier POS ★★ the most important screen

**Route:** `/pos` · **Access:** CASHIER · **API:** `GET /products`, `GET /cart`, `POST /cart/items`, `PUT /cart/items/{id}`, `DELETE /cart/items/{id}`, `DELETE /cart/clear`

**Design this first at Tablet 1024×768 landscape, then adapt.** No sidebar. Full-bleed two-panel layout.

**Top bar (64px, `bg/surface`, bottom border):**
Left: merchant name (`body-strong`) + outlet name as a neutral badge — e.g. `Outlet A - Mall Central`. Center: nothing. Right: current time (`mono`), a "Riwayat" ghost button → S-21, and the cashier's avatar chip with their name.

**Left panel (≈62% width) — product picker:**
- A sticky sub-header containing a **large search input** (48px tall, magnifier icon, placeholder "Cari produk atau SKU…") and, below it, a **horizontally scrollable category chip row**: `Semua` (active by default) + one chip per category. Active chip = `accent/base` fill, white text.
- Below: a **product tile grid**, 4 columns at tablet, 5 at desktop, 2 at mobile, 16px gap. Each tile (per §2.4 #13): product name (2 lines, `body-strong`), price (`mono`, `h3` size, `accent/base`), and a stock caption bottom-left — `Stok: 20` in `text/tertiary`, or `Stok: 5` in `warning/base` when low, or a `HABIS` danger badge when zero. Tapping a tile adds 1 to the cart with a brief scale-down press animation.
- **Out-of-stock tiles are visually disabled**: 45% opacity, no press state, `HABIS` badge.
- Tiles already in the cart show a small `accent/base` count circle in the top-right corner.

**Right panel (≈38% width, `bg/surface`, left border, full height) — the cart:**
- Header: `h2` "Keranjang" + item count in a neutral badge, and a ghost `danger` text button "Kosongkan" on the right.
- Scrollable line-item list. Each line (see §2.4 #14): product name `body-strong` on line 1; `Rp 15.000 × 2` in `caption mono` on line 2; on the right, a **quantity stepper** (− 32px / value / + 32px) and below it the line subtotal in `mono body-strong`. A `×` remove icon appears on hover/long-press at the far right.
- **Sticky footer block** at the bottom of the panel, separated by a top border, on `bg/surface`:
  - `Subtotal` row: label secondary left, value mono right.
  - `Total` row: `h2` label left, **`display`-size mono value right in `text/primary`** — this is the biggest number on the screen.
  - A full-width `primary lg` (56px tall) button **"Bayar · Rp 45.000"** — putting the amount on the button reduces cashier error.

**Cart empty state:** centered in the right panel — cart icon in a `bg/subtle` circle, "Keranjang kosong", "Pilih produk di sebelah kiri untuk memulai transaksi." The Bayar button is disabled.

**Mobile (390):** the cart becomes a bottom sheet. A fixed bottom bar shows `3 item · Rp 45.000` and a "Lihat Keranjang" button; tapping expands the sheet to 85% height with the same content.

---

### S-17 · Payment (modal)

**API:** `POST /transactions` with `{ cart_id }`

560px modal over a dimmed POS screen. Title "Pembayaran".

Body:
- A prominent **amount block** centered on `bg/subtle`: caption "Total Tagihan", then `Rp 45.000` at 40px mono `text/primary`.
- **Metode Pembayaran** — two large selectable cards side by side (not a dropdown; this needs to be one tap):
  - **Tunai** — banknote icon, label "Tunai".
  - **Non-Tunai** — QR/card icon, label "Non-Tunai", caption "QRIS / Transfer / Kartu".
  Selected card gets an `accent/base` 2px border and `accent/subtle` fill.
- **If Tunai is selected**, reveal a **"Uang Diterima"** number input (large, mono, `Rp` prefix) with quick-amount chips below it — `Rp 50.000`, `Rp 100.000`, `Uang Pas`. Below that, a live **"Kembalian"** row: label left, value right in `success/base` at `h2` size — `Rp 5.000`. If the entered amount is less than the total, the row turns `danger/base` and reads `Kurang Rp 5.000`, and the confirm button disables.
- **If Non-Tunai is selected**, show a simple note on `info/subtle`: "Pembayaran dicatat secara manual. Pastikan pembayaran sudah diterima sebelum melanjutkan."

Footer: ghost "Batal" + `primary lg` **"Konfirmasi Pembayaran"**.

**PROCESSING state — required frame.** After confirm, the modal body is replaced by a centered spinner, `h3` "Memproses transaksi…", and `caption` "Jangan tutup atau muat ulang halaman." **The button is disabled and the modal cannot be dismissed** — this is the duplicate-transaction guard and the UI must express it.

---

### S-18 · Checkout error states

Three distinct frames, all rendered inside the S-17 modal (replacing the footer area with a banner, keeping the form visible so it can be corrected):

**S-18a · Insufficient stock (400).** `danger/subtle` banner: ⚠ "Stok tidak mencukupi untuk beberapa produk." Below it, a compact list of the offending items: product name, then `Diminta 5 · Tersedia 3` with the available count in `danger/base`. Footer buttons: "Tutup" ghost + primary "Sesuaikan Keranjang" (returns to S-16 with the affected lines highlighted in `danger/subtle`).

**S-18b · Price changed (409).** `warning/subtle` banner: ⚠ "Harga produk berubah sejak dimasukkan ke keranjang." A list showing, per product: name, then `Rp 15.000` struck through → `Rp 18.000` in `text/primary`. A new total is shown below. Footer: "Batal" + primary **"Gunakan Harga Baru"**. This state must exist — it is a real backend rejection (`PRICE_CHANGED`) and cashiers will hit it.

**S-18c · Unknown / connection lost.** `info/subtle` banner: "Koneksi terputus. Status transaksi belum diketahui." Body copy: "**Jangan buat transaksi baru.** Periksa riwayat transaksi terlebih dahulu untuk memastikan transaksi tidak tercatat dua kali." Footer: primary "Periksa Riwayat Transaksi" → S-21, ghost "Coba Lagi".

---

### S-19 · Checkout success & receipt

**Shown after** `POST /transactions` returns 201.

A 480px modal, deliberately celebratory but fast to dismiss:
- A 64px `success/subtle` circle with a green check, animated in with a scale bounce.
- `h1` "Pembayaran Berhasil"
- Transaction number in mono `body` secondary: `TRX-20260813-002`
- The total in `display` mono: `Rp 45.000`
- If cash: a row "Kembalian **Rp 5.000**" in `success/base`.
- A collapsible **"Lihat Rincian"** section that expands into a receipt-style list: merchant name, outlet, cashier, timestamp, a dashed divider, then each item as `2 × Coca Cola 1.5L ......... Rp 30.000`, a dashed divider, subtotal and total.
- Footer, stacked: full-width `primary lg` **"Transaksi Baru"** (clears the cart, returns to S-16 with focus in the search field) and a secondary row of two ghost buttons: **"Cetak Struk"** and **"Bagikan"**.

Also design a **printable receipt frame** — 80mm width (302px), white, mono type, centered merchant header, item lines, totals, transaction number, timestamp, and a "Terima kasih atas kunjungan Anda" footer.

---

### S-20 · (reserved — cashier quick product detail)

An optional 400px popover triggered by long-pressing a POS product tile: product name, SKU, price, stock at this outlet, and a quantity input with "Tambah ke Keranjang". Useful when the cashier needs to add 12 of something rather than tapping 12 times.

---

### S-21 · Transactions list

**Route:** `/transactions` · **Access:** all roles (Cashier is scoped to their own outlet) · **API:** `GET /transactions?outlet_id=&start_date=&end_date=&cashier_id=&page=&limit=`

Header: `h1` "Transaksi". For Cashier, add the subtitle "Transaksi di **Outlet A - Mall Central**." and **hide the outlet filter entirely** — they only ever see one outlet.

Filter bar: search by transaction number (mono input) + date-range picker + outlet select (Owner/Admin only) + cashier select (Owner/Admin only).

Above the table, a compact 3-tile summary strip for the current filter: `Total Transaksi 1.250` · `Total Omzet Rp 15.750.000` · `Rata-rata Rp 12.600`.

**Data table:**
| No. Transaksi | Tanggal & Waktu | Outlet | Kasir | Item | Total | Status | (aksi) |
|---|---|---|---|---|---|---|---|
| mono, `accent/base`, clickable | `13 Agu 2026, 14.30` | name | name | `3 item` | mono right, `body-strong` | `SELESAI` success badge | "Lihat" ghost |

Clicking a row opens S-22. Pagination footer.

**Empty states:** no transactions at all ("Belum ada transaksi"), and no results for the filter ("Tidak ada transaksi pada rentang tanggal ini." + "Reset filter").

**Mobile:** stacked cards — transaction number + total on line 1, date + outlet on line 2, status badge right.

---

### S-22 · Transaction detail

**Route:** `/transactions/{id}` · **Access:** all roles (scoped) · **API:** `GET /transactions/{transactionId}`

A right drawer (480px) on desktop/tablet, a full page on mobile. Structured like a digital receipt but in app chrome:

- Header: transaction number in `h2` mono, `SELESAI` success badge next to it, close `×`.
- **Meta block** on `bg/subtle`: a two-column definition list — `Tanggal 13 Agu 2026, 14.35`, `Outlet Outlet A - Mall Central`, `Kasir Budi Santoso`, `Metode Tunai`.
- **Items section**: `h3` "Item" then one row per item — product name `body-strong` on line 1, `Rp 15.000 × 2` in caption mono on line 2, and the line subtotal right-aligned in mono. A caption under the section: "Harga yang ditampilkan adalah harga saat transaksi terjadi."
- **Totals block**: `Subtotal` and then `Total` in `h2` / `display` mono.
- Footer: ghost "Cetak Struk" + ghost "Unduh PDF".

**Important:** there is **no** edit, void, cancel, or refund action anywhere on this screen. Completed transactions are immutable in this MVP. If you must acknowledge it, a disabled "Batalkan Transaksi" with a tooltip "Belum tersedia" is acceptable, but omitting it is better.

---

## 5. Prototype flows to wire

| ID | Flow | Path |
|---|---|---|
| **F-01** | Owner onboarding | S-02 → S-03 → S-06 → S-07 → S-06 → S-08 → S-09 → S-08 |
| **F-02** | Owner reads the business | S-01 → S-03 → change period → S-04 (tab 1 → tab 4) → S-05 → click "Analisis dengan AI" → S-05 PROCESSING → S-05 READY |
| **F-03** | Admin prepares the store | S-01 → S-14 → click "Stok Menipis" tile → S-15c → "Sesuaikan Stok" → S-15a → save → toast → S-15c updated |
| **F-04** | Admin catalog work | S-14 → S-13 → add category → S-11 → S-12 → save → S-11 with the new row highlighted |
| **F-05** | Admin transfers stock | S-15 → "Transfer Stok" → S-15e → confirm → toast → S-15 with both outlets updated |
| **F-06** | **Cashier happy path (the demo flow)** | S-01 → S-16 → tap 3 products → adjust a quantity → "Bayar" → S-17 → select Tunai → enter Rp 50.000 → confirm → S-17 PROCESSING → S-19 → "Transaksi Baru" → S-16 empty |
| **F-07** | Cashier hits insufficient stock | S-16 (add a low-stock product) → S-17 → confirm → S-18a → "Sesuaikan Keranjang" → S-16 with the line highlighted |
| **F-08** | Cashier hits a price change | S-16 → S-17 → confirm → S-18b → "Gunakan Harga Baru" → S-17 with the updated total → confirm → S-19 |
| **F-09** | Cashier checks history | S-16 → "Riwayat" → S-21 → row → S-22 |
| **F-10** | Role gating demo | Log in as each of the three roles from S-01 and show three different sidebars and landing screens (S-03 / S-14 / S-16) |

---

## 6. Sample data (use these exact values so screens agree with each other)

**Merchant:** `IndoMart Retail` · low stock threshold `10`

**Outlets**
| Name | Address | Status |
|---|---|---|
| Outlet A - Mall Central | Jl. Sudirman No. 123, Jakarta | AKTIF |
| Outlet B - City Plaza | Jl. Gatot Subroto No. 45, Jakarta | AKTIF |
| Outlet C - Grand Square | Jl. Thamrin No. 8, Jakarta | AKTIF |

**Users**
| Name | Email | Role | Outlet |
|---|---|---|---|
| John Doe | owner@indomart.com | OWNER | — |
| Sari Dewi | sari@indomart.com | ADMIN | — |
| Budi Santoso | budi@indomart.com | CASHIER | Outlet A |
| Ani Wijaya | ani@indomart.com | CASHIER | Outlet A |
| Rudi Hartono | rudi@indomart.com | CASHIER | Outlet B |

**Categories:** Minuman, Makanan Ringan, Kopi, Kebutuhan Harian, Perawatan Diri, Rokok, Beku, Roti

**Products**
| Name | SKU | Category | Price | Stock @ A |
|---|---|---|---|---|
| Coca Cola 1.5L | CC-1500 | Minuman | Rp 15.000 | 5 ⚠ menipis |
| Sprite 1.5L | SP-1500 | Minuman | Rp 15.000 | 24 |
| Air Mineral 600ml | MW-600 | Minuman | Rp 4.000 | 0 ✕ habis |
| Teh Botol 450ml | TB-450 | Minuman | Rp 5.000 | 48 |
| Chitato Sapi Panggang | CH-068 | Makanan Ringan | Rp 12.500 | 30 |
| Oreo Original 133g | OR-133 | Makanan Ringan | Rp 10.000 | 18 |
| Kopi Susu Botol 250ml | KS-250 | Kopi | Rp 18.000 | 12 |
| Premium Coffee Beans | PCB-001 | Kopi | Rp 35.000 | 50 (kurang laku) |
| Indomie Goreng | IM-001 | Makanan Ringan | Rp 3.500 | 120 |
| Sabun Mandi Lifebuoy | SB-100 | Perawatan Diri | Rp 8.500 | 22 |
| Roti Tawar Sari Roti | RT-400 | Roti | Rp 17.000 | 9 ⚠ menipis |
| Susu UHT Coklat 250ml | SU-250 | Minuman | Rp 6.500 | 40 |

**Dashboard figures (Bulan Ini):** omzet `Rp 15.750.000` (▲12,5%) · transaksi `1.250` (▲8,3%) · AOV `Rp 12.600` (▲6,8%) · produk terjual `3.420` · outlet `3` · karyawan `12` · produk `156` · kategori `8`.

**Sales trend (7 days):** `2.100.000 · 1.800.000 · 2.250.000 · 1.950.000 · 2.400.000 · 2.700.000 · 2.550.000` with transaction counts `180 · 150 · 190 · 165 · 210 · 230 · 220`.

**Outlet performance:** Outlet A `Rp 7.250.000` / 580 trx / 46,0% / ▲15,2% — Outlet B `Rp 5.100.000` / 420 trx / 32,4% / ▲6,1% — Outlet C `Rp 3.400.000` / 250 trx / 21,6% / ▼2,3%.

**Peak hours:** 12, 13, 19, 20. Busiest day Sabtu, quietest Senin.

**Sample cart:** 2 × Coca Cola 1.5L (`Rp 30.000`) + 1 × Chitato (`Rp 12.500`) + 1 × Oreo (`Rp 10.000`) → subtotal & total `Rp 52.500`. *(Where the flows above quote `Rp 45.000`, that's the smaller 2-item cart: 2 × Coca Cola + 1 × Sprite.)*

**AI insight sample:**
> **Peringatan Stok: Coca Cola 1.5L** · type `STOCK_WARNING`
> "Stok Coca Cola 1.5L di Outlet A diperkirakan habis dalam 2 hari berdasarkan kecepatan penjualan saat ini (rata-rata 12 unit/hari, sisa 5 unit). Pertimbangkan restock 50 unit. Outlet C memiliki kelebihan stok 45 unit dengan penjualan rendah — transfer antar outlet dapat menjadi opsi yang lebih hemat."
> Diperbarui 13 Agu 2026, 08.00

---

## 7. Global patterns

### 7.1 Every list screen needs four states
Design each as a separate frame: **loading** (skeleton), **populated**, **empty** (never populated), **no results** (filtered to nothing). The empty and no-results states must have different copy and different CTAs.

### 7.2 Error and feedback conventions
- **Field-level errors:** red border + 12px `danger/base` message below the field. Never a bare red border with no text.
- **Form-level errors:** a `danger/subtle` banner at the top of the form body, with an icon and a plain-language sentence.
- **Success:** toast, top-right, 4s, green check.
- **Destructive actions:** always a confirmation dialog naming the specific record ("Nonaktifkan **Outlet A - Mall Central**?") and stating what is preserved ("Riwayat transaksi tetap tersimpan.").
- **403:** a full-page state with a lock icon, "Anda tidak memiliki akses ke halaman ini.", and a button back to the role's home screen.
- **Session expired (401):** a modal "Sesi Anda telah berakhir. Silakan masuk kembali." with a single "Masuk" button.

### 7.3 Responsive rules
- Tables → stacked cards below 768px. Preserve the primary identifier and the primary number; demote everything else to a caption line.
- Modals → full-screen sheets below 768px, with a sticky footer for the action buttons.
- Multi-column dashboard grids → single column, preserving the row order given in each spec.
- The cashier POS is the exception: on mobile the cart becomes a bottom sheet rather than stacking below the product grid.

### 7.4 Accessibility
- Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI borders.
- **Status is never communicated by color alone** — always pair with a text label or icon (`STOK HABIS`, not just a red dot).
- Minimum touch target 44×44 on tablet/mobile; POS product tiles and cart steppers should be larger still.
- Visible focus ring: 2px `accent/base` at 40% opacity, 2px offset.

---

## 8. Explicitly out of scope — do not design these

Designing these would misrepresent the product. Leave them out entirely:

- Payment gateway integration, card readers, split payments, tips.
- Refund, void, or cancel of a completed transaction.
- Discounts, taxes, and service charges.
- Customer profiles, loyalty programs, gift cards, CRM.
- Purchase orders, suppliers, warehouses, or raw-material inventory.
- Product variants, modifiers, or per-outlet price overrides (one global price per product).
- Multi-currency.
- AI insight **history**, archive, or dismiss — one insight per merchant, overwritten each run.
- AI features for Admin or Cashier.
- Any AI action that changes data automatically (AI advises; the Owner decides).
- Owner or Admin performing a checkout.
- Offline mode / sync indicators.
- Shift management, clock-in/out, cash drawer reconciliation.

---

## 9. Notes for whoever builds the real frontend

These are backend facts the design must respect; they are also the places where the spec and the current backend code disagree.

1. **Money is a decimal string over the wire.** The API sends `"15750000.00"`, not a number. Parse and format for display; never do float math on it.
2. **`GET /inventory` requires `outlet_id`.** There is no all-outlets inventory list endpoint — this is why S-15 forces an outlet choice before showing a table.
3. **The Owner dashboard is one fat endpoint.** `GET /dashboard/owner` returns the entire S-03 payload in a single response (summary, sales_trend, outlet_performance, top_products, underperforming_products, time_pattern, aov_trend, recent_transactions, merchant_overview, period_comparison). One request, one loading state.
4. **Checkout accepts either `{cart_id}` or `{items:[…]}`.** The cart path is the primary flow; the direct-items path is a fallback.
5. **Checkout is idempotent.** A repeated identical request returns `200` with the existing transaction rather than creating a second one — which is exactly what S-18c's "check history first" copy is protecting.
6. **Known gaps between docs and code** (flagged, not designed around): the Prisma schema currently has **no `sku` field on Product**, **no `status` on Category**, and **no `Payment` or `StockMovement` model**, though `api-contract.md` and the FRD specify all of them. The schema also lacks `Transaction.status`. This brief follows the **API contract**, since that is what the frontend will consume — but the backend needs those fields added before these screens can be wired to real data.
7. **Product management access is ambiguous in the source docs.** `product-overview.md` §10 lists Product/Category as read-only for the Owner, while `api-contract.md` grants `OWNER, ADMIN` on `POST/PUT/DELETE /products` and `/categories`. This brief follows the API contract (both roles can manage), which is why the Owner sidebar includes Katalog. If the Owner is meant to be read-only there, drop S-12's entry points from the Owner nav and add the read-only caption used in S-15.
8. **Cashier transaction visibility is an open decision** (`OD-003` in the FRD): whether a cashier sees only their own transactions or all transactions at their outlet is unresolved. S-21 currently shows the whole outlet, with the cashier filter hidden.