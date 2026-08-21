# Keamanan Frontend — XSS, CSP, dan Sanitasi Input

**Terakhir diperbarui:** Agustus 2026
**Cakupan:** aplikasi web di repo ini saja. Otorisasi, tenancy, dan validasi
otoritatif adalah tanggung jawab backend (`docs/api-contract.md` §0).

---

## 1. Ringkasan

Audit menyeluruh terhadap seluruh `src/` menemukan **tidak ada celah XSS yang
aktif**. Perubahan pada dokumen ini karena itu bukan menambal lubang, melainkan
membuat keadaan aman tersebut **dijamin oleh struktur kode**, bukan oleh ingatan
penulis kode berikutnya — dan menambahkan satu lapis yang sebelumnya memang
tidak ada sama sekali: Content-Security-Policy.

| Kontrol | Berkas | Melindungi dari |
|---|---|---|
| Escaping by construction | `src/lib/html.ts` | Nilai dari API yang masuk ke markup struk |
| Sandbox frame cetak | `src/lib/print-receipt.ts` | Skrip yang lolos escaping tetap tidak bisa jalan |
| Normalisasi input | `src/lib/validation.ts` | Karakter tak terlihat, bidi override, homograf |
| CSP + header keamanan | `vite.config.ts`, `netlify.toml`, `docker/security-headers.conf` | Eksekusi skrip pihak ketiga, clickjacking, MIME sniffing |
| Larangan lint | `eslint.config.js` | Sink XSS baru masuk diam-diam di kemudian hari |

---

## 2. Model ancaman

Yang dilindungi: **token sesi**. JWT disimpan di `sessionStorage`
(`src/lib/token-storage.ts`), sehingga dapat dibaca oleh skrip mana pun yang
berhasil berjalan di origin aplikasi. Konsekuensinya langsung: satu XSS =
pengambilalihan sesi, dengan seluruh hak peran pengguna tersebut.

Sumber data yang **tidak dipercaya** — meskipun berasal dari merchant sendiri:

1. Respons API (nama produk, nama outlet, nama merchant, nama kasir, pesan error).
2. Input form (react-hook-form + zod).
3. Query param URL (`?outlet=`) dan path param (`/transactions/:id`).
4. `sessionStorage` / `localStorage` (token, preferensi tema).
5. Teks hasil LLM pada halaman AI Insights.

Yang **di luar cakupan** dokumen ini: XSS tersimpan yang berasal dari backend
(backend wajib memvalidasi inputnya sendiri — frontend tidak bisa menjamin itu),
CSRF (API memakai bearer token, bukan cookie), dan keamanan transport (TLS).

---

## 3. Hasil audit permukaan serangan

Diperiksa di seluruh `src/`:

| Yang dicari | Ditemukan |
|---|---|
| `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML` | **Tidak ada** |
| `eval`, `new Function` | **Tidak ada** |
| `document.write` | **1** — `src/lib/print-receipt.ts`, ke dalam iframe struk |
| `href` / `src` dinamis, `window.open`, `location.href =` | **Tidak ada**; seluruh link literal dari `nav-config.ts` |
| Upload berkas, `FileReader`, `URL.createObjectURL` | **Tidak ada** |
| `postMessage` / listener `message` | **Tidak ada** |
| Renderer HTML/Markdown di `package.json` | **Tidak ada** |

Artinya React adalah satu-satunya yang merender nilai ke DOM, dan React
meng-escape setiap nilai yang dicetaknya. **Satu-satunya** tempat string menjadi
markup adalah struk cetak.

---

## 4. Kontrol yang diterapkan

### 4.1 Escaping by construction (`src/lib/html.ts`)

Sebelumnya template struk aman hanya karena setiap interpolasi diberi
`escapeHtml(...)` secara manual — sembilan tempat, satu kali lupa sudah cukup,
dan tidak ada tes yang menangkapnya. Sekarang escaping dipindahkan ke mesin
template:

```ts
safeHtml`<div>${nilaiDariApi}</div>`; // otomatis di-escape
safeHtml`<div>${raw('<br />')}</div>`; // mentah, harus dinyatakan eksplisit
```

Default-nya aman; pengecualiannya (`raw`) eksplisit dan mudah dicari dengan
grep. Fragmen bersarang di-escape **satu kali**, tidak dua kali.

> **Catatan:** tag-nya bernama `safeHtml`, bukan `html`, karena Prettier
> mengenali nama `html` dan akan memformat ulang isi template sebagai HTML —
> yang mengubah spasi pada struk, dan ikut mengubah snapshot serta hasil cetak
> di kertas.

`escapeHtml` hanya benar untuk **konteks teks dan atribut ber-tanda-kutip**. Ia
tidak cukup untuk atribut tanpa kutip, isi `<script>`/`<style>`, atau posisi URL
(`href={...}` butuh pengecekan skema, bukan escaping). Struk tidak memiliki satu
pun konteks tersebut, dan jangan ditambahkan.

### 4.2 Sandbox pada frame cetak (`src/lib/print-receipt.ts`)

```
sandbox="allow-same-origin allow-modals"
```

`allow-scripts` sengaja **tidak** diberikan: bila suatu saat ada nilai yang lolos
dari escaping, ia mendarat sebagai markup mati, bukan skrip yang berjalan di
origin aplikasi tempat token berada. `allow-same-origin` tetap ada karena parent
harus menulis ke `contentDocument` dan memanggil `print()`; kombinasi itu baru
berbahaya bila disertai `allow-scripts` — dan justru itulah yang ditahan.

### 4.3 Normalisasi input (`src/lib/validation.ts`)

`safeText` (satu baris) dan `optionalText` (multi-baris, mempertahankan enter):
normalisasi NFC, buang karakter kontrol C0/C1, zero-width, bidi override, dan
BOM, lalu rapikan spasi. `requiredString` dibangun di atas `safeText`, jadi
seluruh form yang sudah ada ikut ternormalisasi tanpa perubahan.

**Ini bukan pertahanan XSS, dan tidak boleh dijadikan begitu.** `<`, `>`, `&` dan
tanda kutip adalah karakter sah pada nama seperti `Kopi & Susu` atau
`Ukuran > 500ml`. Memfilternya di sisi input akan merusak data asli, tetap bisa
diakali, dan tidak membuat apa pun lebih aman — keamanannya ada di tempat nilai
itu **dirender** (§4.1), bukan di tempat ia diketik.

Yang sebenarnya dicegah: dua produk yang terlihat identik tetapi tidak saling
cocok saat dicari, dan bidi override yang membalik urutan nama saat dicetak di
struk pelanggan.

Kotak filter/pencarian sengaja tidak diberi skema: nilainya hanya masuk ke
`buildQueryString` (`src/api/transport.ts`) yang meng-encode lewat
`URLSearchParams`, dan tidak pernah menjadi markup.

### 4.4 Content-Security-Policy

CSP lengkap dipasang sebagai `<meta>` pada dokumen hasil build (plugin di
`vite.config.ts`), supaya berlaku sama di Netlify, di image nginx, maupun di
`vite preview`. Direktif yang tidak bisa dinyatakan lewat meta —
`frame-ancestors` — dipasang sebagai header asli di `netlify.toml` dan
`docker/security-headers.conf`; keduanya berlaku bersamaan.

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self' data:; connect-src 'self' <origin API>;
worker-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self';
form-action 'self'
```

Yang membuatnya berharga adalah `script-src 'self'` **tanpa** `'unsafe-inline'`:
skrip inline yang berhasil disuntikkan tidak akan dieksekusi. Ini berlaku juga di
dalam frame struk, karena dokumen hasil `document.write` mewarisi CSP induknya —
jadi §4.2 dan §4.4 saling menutupi.

Hal yang harus dijaga saat mengubah konfigurasi:

- **`style-src 'unsafe-inline'` wajib ada.** Radix dan recharts menulis atribut
  `style` inline saat runtime, dan struk membawa blok `<style>` inline.
  Menghapusnya merusak tampilan aplikasi dan hasil cetak.
- **`script-src 'self'` bergantung pada vite-plugin-pwa** yang saat ini
  memancarkan registrasi service worker sebagai berkas eksternal
  (`/registerSW.js`), bukan skrip inline. Bila konfigurasi PWA diubah, periksa
  ulang `dist/index.html`.
- **Build `live` wajib menyetel `VITE_API_URL`.** Origin-nya disisipkan ke
  `connect-src`. Bila tidak diset, aplikasi memakai default
  `http://localhost:3000/api/v1` sementara CSP hanya mengizinkan `'self'`,
  sehingga semua request diblokir. Gagalnya menutup, bukan membuka — dan terlihat
  jelas di console.
- **CSP dev sengaja tidak dipasang** (`apply: 'build'`), karena dev server
  membutuhkan preamble inline dari `@vitejs/plugin-react`.

Header lain: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, dan `Permissions-Policy` yang
menolak kamera/mikrofon/lokasi/pembayaran.

> **Jebakan nginx:** `add_header` pada satu `location` **membuang** seluruh header
> yang diwarisi dari blok `server`. `docker/nginx.conf` menyetel `Cache-Control`
> di dua location, jadi `security-headers.conf` harus di-include ulang di dalam
> **setiap** location. Location baru yang ditambahkan nanti wajib ikut
> meng-include-nya.

### 4.5 Larangan lint (`eslint.config.js`)

`no-restricted-syntax` melarang `dangerouslySetInnerHTML`, penulisan
`innerHTML`/`outerHTML`, `insertAdjacentHTML`, dan `document.write`; ditambah
`no-eval`, `no-implied-eval`, `no-new-func`, dan `no-script-url` (`javascript:`
pada href). Pesannya mengarahkan ke `src/lib/html.ts`. Satu-satunya pengecualian
adalah `src/lib/print-receipt.ts`, dibatasi per berkas.

Tujuannya bukan menemukan masalah hari ini — tidak ada — melainkan memastikan
permukaan serangan tetap nol seiring aplikasi bertambah besar.

---

## 5. Risiko tersisa

Dicatat apa adanya; tidak satu pun ditutup oleh perubahan ini.

1. **Token di `sessionStorage`, terbaca oleh skrip.** Ini yang membuat XSS
   berdampak besar. Solusi sebenarnya adalah cookie `httpOnly`, dan itu menunggu
   backend mengirim `Set-Cookie` (sudah dicatat di `src/lib/token-storage.ts`).
   Sampai saat itu, CSP dan §4.1–4.2 adalah kompensasinya.
2. **`style-src 'unsafe-inline'`** membuka jalan bagi serangan berbasis CSS
   (mis. penyusunan ulang tampilan). Tidak bisa dihapus tanpa mengganti cara
   Radix dan recharts bekerja.
3. **`.passthrough()` pada skema analysis job** (`src/services/insights.ts`)
   membiarkan field tak dikenal dari API ikut lewat. Aman selama tidak ada yang
   merendernya, tetapi ini satu-satunya tempat data API tidak dibatasi skema.
4. **Teks insight dari LLM** (`src/pages/dashboard/ai-insights.tsx`) dirender
   sebagai JSX child, sehingga di-escape React. Aman **justru karena** itu JSX
   child. Jangan pernah mengubahnya menjadi render Markdown/HTML tanpa sanitizer
   — ini konten yang paling tidak dapat diprediksi di seluruh aplikasi.
5. **Validasi frontend bukan otoritas.** Seluruh normalisasi di §4.3 dapat
   dilewati dengan memanggil API langsung. Backend tetap wajib memvalidasi.

---

## 6. Cara memverifikasi

```bash
npm test                            # termasuk regresi XSS struk & sandbox frame cetak
npx tsc --noEmit
npm run build && npx vite preview   # cek console: tidak boleh ada CSP violation
```

Yang tidak bisa dites otomatis dan **wajib dicek manusia**:

1. Cetak struk di Chrome dan Firefox — "Cetak Struk" dan "Unduh PDF". Struk harus
   tampil 80mm dengan gaya utuh dan dialog cetak harus terbuka. Ini penerimaan
   untuk §4.2.
2. Buka setiap halaman pada hasil `vite preview` (login, dashboard, POS, produk,
   transaksi, analitik) dan pastikan console bersih dari pelanggaran CSP.
3. Uji asap: buat produk bernama `<img src=x onerror=alert(1)>`, jual, lalu cetak
   struknya. Nama harus muncul sebagai teks apa adanya, tanpa alert.
4. `docker compose build && docker compose up`, lalu `curl -I http://localhost/`
   **dan** `curl -I http://localhost/assets/<berkas>.js` — header keamanan harus
   muncul di keduanya (membuktikan include per-location bekerja).
