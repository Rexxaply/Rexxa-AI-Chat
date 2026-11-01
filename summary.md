# 📦 REXXA AI — Ringkasan Riwayat Pengembangan

Dokumen ini merangkum seluruh riwayat commit GitHub dari awal proyek hingga sekarang.

**Repo:** `rexxa-ai` · **Branch:** `main` · **Total commit:** 11 · **Periode:** 2026-11-01

---

## 🗂️ Timeline Commit

| # | Hash | Tanggal | Ringkasan |
|---|------|---------|-----------|
| 1 | `5d7f9f6` | 2026-11-01 | 🎉 **first commit** — Inisialisasi proyek |
| 2 | `764346b` | 2026-11-01 | 🔒 **security:** SRI untuk CDN scripts, fallback aman tanpa DOMPurify, escape img src, validasi + konfirmasi sync link |
| 3 | `4f4fb2f` | 2026-11-01 | 🔒 **security:** syncKeys default off + konfirmasi risiko sebelum sinkronkan API key |
| 4 | `b00e05a` | 2026-11-01 | ✨ **feat:** marquee judul, file tool, PNG legalisasi, grup chat, swipe toast, gradasi bg, optimalisasi UI |
| 5 | `55ae297` | 2026-11-01 | ✨ **feat:** kamera, lampiran file/PDF, pencarian web & memori AI |
| 6 | `bc93da5` | 2026-11-01 | 🐛 **fix:** file tool pakai dialog tengah agar selalu terlihat |
| 7 | `4463ddb` | 2026-11-01 | ✨ **feat:** pisah bubble foto & teks, dropdown thinking radio style, dialog input grup custom, footer chat baru di bawah |
| 8 | `6261d42` | 2026-11-01 | ✨ **feat:** sidebar grup vertikal (chevron collapse, hapus/sematkan grup, keluarkan dari grup), sheet iOS smooth, scroll sidebar modern & dinamis |
| 9 | `a977b48` | 2026-11-01 | 📝 **docs:** tambah summary.md riwayat pengembangan |
| 10 | `dba93ab` | 2026-11-01 | 🐛✨ **fix+feat:** perbaiki deleteChats scope, pencarian web multi-sumber dengan kueri AI & tampilan sumber, optimalisasi responsif semua perangkat |
| 11 | `6b0bb0f` | 2026-11-01 | 🔒 **security:** safeUrl scheme allowlist untuk URL tak tepercaya (fix stored XSS di sources & tool file card) |

---

## 📖 Detail per Tahap

### 1️⃣ `5d7f9f6` — First Commit
Fondasi awal aplikasi **REXXA AI**: antarmuka chat berbasis web (single-file `index.html`), PWA (manifest + service worker), dukungan multi-profil AI, riwayat percakapan tersimpan di localStorage, dan integrasi API OpenAI-compatible.

### 2️⃣ `764346b` — Hardening Keamanan CDN & Sync
- **Subresource Integrity (SRI)** untuk semua script CDN — mencegah serangan supply-chain jika CDN dibobol.
- Fallback sanitasi aman saat DOMPurify gagal dimuat.
- Escape atribut `src` gambar untuk mencegah XSS.
- Validasi & dialog konfirmasi saat membuka link penyambung sinkronisasi.

### 3️⃣ `4f4fb2f` — Keamanan API Key
- Fitur sinkronisasi API key (`syncKeys`) kini **nonaktif secara default**.
- Tambahan dialog konfirmasi risiko sebelum pengguna menyinkronkan API key ke cloud.

### 4️⃣ `b00e05a` — Gelombang Fitur UI/UX
- **Marquee** pada judul chat yang kepanjangan.
- **File tool** untuk melampirkan dokumen.
- Ekspor **PNG** (fitur legalisasi/dokumen).
- Awal fitur **grup chat**.
- **Swipe toast** untuk menutup notifikasi dengan geser.
- Latar belakang gradasi baru + optimalisasi UI menyeluruh.

### 5️⃣ `55ae297` — Kamera, Lampiran & Kecerdasan
- **Kamera**: ambil foto langsung dari aplikasi (dengan deteksi perangkat, izin, dan flip kamera depan/belakang).
- **Lampiran file & PDF**: ekstraksi teks PDF (hingga 30 halaman) via pdf.js, batas 3 file per pesan.
- **Pencarian web**: AI menelusuri web sebelum menjawab.
- **Memori AI**: menyimpan fakta penting antar percakapan, bisa dikelola manual.

### 6️⃣ `bc93da5` — Perbaikan File Tool
File tool dipindah ke dialog tengah agar selalu terlihat dan tidak tertutup elemen lain.

### 7️⃣ `4463ddb` — Penyempurnaan Chat & Dialog
- **Bubble foto & teks dipisah** agar tampilan pesan lebih rapi.
- Dropdown "thinking" diubah menjadi gaya **radio**.
- Dialog input grup custom.
- Footer **"Chat baru"** dipindah ke bawah sidebar.

### 8️⃣ `6261d42` — Sidebar Grup Vertikal & Sheet iOS
- **Sidebar grup vertikal**: daftar grup tampil ke bawah seperti judul chat, dengan chevron (› / ⌄) untuk buka/tutup isi grup.
- **Aksi grup**: sematkan semua chat dalam grup, hapus grup beserta isinya (termasuk dari cloud bila sinkron aktif), rename via double-click.
- **Keluarkan dari grup**: ikon khusus pada chat di dalam grup untuk mengembalikannya ke daftar utama.
- **Dialog pindah grup**: pilih grup yang ada atau buat baru langsung dari dialog.
- **Sheet "Tambahkan ke chat"**: animasi slide-from-bottom halus ala iOS (`cubic-bezier(.32,.72,0,1)`), lengkap dengan animasi tutup.
- **Scroll sidebar modern**: scrollbar tipis menyatu dengan background (sama seperti area chat), tinggi daftar grup dihitung dinamis agar daftar "Terbaru" tidak pernah tenggelam.

### 9️⃣ `a977b48` — Dokumentasi
- Menambahkan file `summary.md` ini: ringkasan riwayat pengembangan dari awal proyek.

### 🔟 `dba93ab` — Perbaikan Sync, Pencarian Web & Responsif
- **Fix:** scope `deleteChats` yang sebelumnya error saat menghapus chat dari cloud.
- **Pencarian web multi-sumber**: kueri pencarian dibuat oleh AI dari konteks percakapan, hasil dari SearXNG + Google News RSS, dan tampilan daftar sumber (judul + host) di bawah jawaban AI.
- **Responsif menyeluruh**: breakpoint 820px, dukungan tablet/ponsel kecil/landscape, anti-overflow, dan touch target yang nyaman.

### 1️⃣1️⃣ `6b0bb0f` — Fix Stored XSS (Audit Keamanan)
- **Helper `safeUrl()`** baru: allowlist skema URL ketat (`https:`, `http:`, `blob:`, plus `data:image/*` opsional) — menolak `javascript:`, `vbscript:`, `data:text/html`, dan varian case/whitespace.
- **Fix F1:** URL "sumber web" di jawaban AI divalidasi sebelum dirender — menutup stored XSS yang bisa tersinkron ke semua perangkat lewat Supabase.
- **Fix F2:** URL kartu file hasil tool divalidasi + di-escape — menutup stored XSS via `download_url` jahat dan breakout atribut.
- Diverifikasi dengan unit test (9/9 PASS) dan syntax check penuh.

---

## 🏷️ Statistik

- **Commit fitur (`feat`):** 5
- **Commit keamanan (`security`):** 3
- **Commit perbaikan (`fix`):** 2 (1 murni fix, 1 gabungan fix+feat)
- **Commit dokumentasi (`docs`):** 1
- **File utama:** `index.html` (arsitektur single-file)
- **Pendukung:** `manifest.webmanifest`, `sw.js`, `icons/`, `supabase.sql`

---

> Dibuat otomatis dari `git log` branch `main`. Terakhir diperbarui: commit `6b0bb0f`.
