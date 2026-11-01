# 📦 REXXA AI — Ringkasan Riwayat Pengembangan

Dokumen ini merangkum seluruh riwayat commit GitHub dari awal proyek hingga sekarang.

**Repo:** `rexxa-ai` · **Branch:** `main` · **Total commit:** 14 · **Periode:** 2026-11-01

> Catatan: commit bertipe *security* sengaja tidak dicantumkan dalam ringkasan ini.

---

## 🗂️ Timeline Commit

| # | Hash | Tanggal | Ringkasan |
|---|------|---------|-----------|
| 1 | `5d7f9f6` | 2026-11-01 | 🎉 **first commit** — Inisialisasi proyek |
| 2 | `b00e05a` | 2026-11-01 | ✨ **feat:** marquee judul, file tool, PNG legalisasi, grup chat, swipe toast, gradasi bg, optimalisasi UI |
| 3 | `55ae297` | 2026-11-01 | ✨ **feat:** kamera, lampiran file/PDF, pencarian web & memori AI |
| 4 | `bc93da5` | 2026-11-01 | 🐛 **fix:** file tool pakai dialog tengah agar selalu terlihat |
| 5 | `4463ddb` | 2026-11-01 | ✨ **feat:** pisah bubble foto & teks, dropdown thinking radio style, dialog input grup custom, footer chat baru di bawah |
| 6 | `6261d42` | 2026-11-01 | ✨ **feat:** sidebar grup vertikal (chevron collapse, hapus/sematkan grup, keluarkan dari grup), sheet iOS smooth, scroll sidebar modern & dinamis |
| 7 | `a977b48` | 2026-11-01 | 📝 **docs:** tambah summary.md riwayat pengembangan |
| 8 | `dba93ab` | 2026-11-01 | 🐛✨ **fix+feat:** perbaiki deleteChats scope, pencarian web multi-sumber dengan kueri AI & tampilan sumber, optimalisasi responsif semua perangkat (breakpoint 820px, tablet/ponsel kecil/landscape, anti-overflow, touch target) |
| 9 | `82b299d` | 2026-11-01 | 📝 **docs:** update summary.md (11 commit) |
| 10 | `0f2e2d6` | 2026-11-01 | ⏪ **revert:** kembalikan kode sebelum patch URL sanitasi |
| 11 | `f2c065d` | 2026-11-01 | ✨ **feat:** tool upscale gambar (Lanczos + unsharp mask), kartu file dokumen di chat, sheet iOS halus, chip model mobile di topbar |

---

## 📖 Detail per Tahap

### 1️⃣ `5d7f9f6` — First Commit
Fondasi awal aplikasi **REXXA AI**: antarmuka chat berbasis web (single-file `index.html`), PWA (manifest + service worker), dukungan multi-profil AI, riwayat percakapan tersimpan di localStorage, dan integrasi API OpenAI-compatible.

### 2️⃣ `b00e05a` — Gelombang Fitur UI/UX
- **Marquee** pada judul chat yang kepanjangan.
- **File tool** untuk melampirkan dokumen.
- Ekspor **PNG** (fitur legalisasi/dokumen).
- Awal fitur **grup chat**.
- **Swipe toast** untuk menutup notifikasi dengan geser.
- Latar belakang gradasi baru + optimalisasi UI menyeluruh.

### 3️⃣ `55ae297` — Kamera, Lampiran & Kecerdasan
- **Kamera**: ambil foto langsung dari aplikasi (dengan deteksi perangkat, izin, dan flip kamera depan/belakang).
- **Lampiran file & PDF**: ekstraksi teks PDF (hingga 30 halaman) via pdf.js, batas 3 file per pesan.
- **Pencarian web**: AI menelusuri web sebelum menjawab.
- **Memori AI**: menyimpan fakta penting antar percakapan, bisa dikelola manual.

### 4️⃣ `bc93da5` — Perbaikan File Tool
File tool dipindah ke dialog tengah agar selalu terlihat dan tidak tertutup elemen lain.

### 5️⃣ `4463ddb` — Penyempurnaan Chat & Dialog
- **Bubble foto & teks dipisah** agar tampilan pesan lebih rapi.
- Dropdown "thinking" diubah menjadi gaya **radio**.
- Dialog input grup custom.
- Footer **"Chat baru"** dipindah ke bawah sidebar.

### 6️⃣ `6261d42` — Sidebar Grup Vertikal & Sheet iOS
- **Sidebar grup vertikal**: daftar grup tampil ke bawah seperti judul chat, dengan chevron (› / ⌄) untuk buka/tutup isi grup.
- **Aksi grup**: sematkan semua chat dalam grup, hapus grup beserta isinya (termasuk dari cloud bila sinkron aktif), rename via double-click.
- **Keluarkan dari grup**: ikon khusus pada chat di dalam grup untuk mengembalikannya ke daftar utama.
- **Dialog pindah grup**: pilih grup yang ada atau buat baru langsung dari dialog.
- **Sheet "Tambahkan ke chat"**: animasi slide-from-bottom halus ala iOS (`cubic-bezier(.32,.72,0,1)`), lengkap dengan animasi tutup.
- **Scroll sidebar modern**: scrollbar tipis menyatu dengan background (sama seperti area chat), tinggi daftar grup dihitung dinamis agar daftar "Terbaru" tidak pernah tenggelam.

### 7️⃣ `a977b48` — Dokumentasi Riwayat
Menambahkan `summary.md` berisi ringkasan riwayat pengembangan proyek.

### 8️⃣ `dba93ab` — Perbaikan & Responsif Menyeluruh
- **Fix**: scope `deleteChats` diperbaiki agar tidak bocor.
- **Pencarian web multi-sumber**: DuckDuckGo, Wikipedia (id/en), SearXNG, Google News RSS — dijalankan paralel, dedup, dan kueri dioptimalkan AI. Hasil ditampilkan sebagai daftar sumber di bawah jawaban.
- **Optimalisasi responsif**: breakpoint 820px, dukungan tablet/ponsel kecil/landscape, anti-overflow, dan touch target yang nyaman.

### 9️⃣ `82b299d` — Dokumentasi
Pembaruan `summary.md` hingga 11 commit.

### 🔟 `0f2e2d6` — Revert
Mengembalikan kode ke keadaan sebelum patch sanitasi URL karena menimbulkan regresi.

### 1️⃣1️⃣ `f2c065d` — Tool Upscale Gambar & Penyempurnaan Mobile
- **Tool `upscale_image`**: model AI bisa memperbesar gambar lampiran (2×/4×) langsung dari percakapan. Resize bertahap maks 2×/langkah dengan smoothing kualitas tinggi (≈ Lanczos) + unsharp mask ringan; hasil PNG bisa diunduh.
- **Registry gambar sesi** (`toolImageStore`): gambar lampiran diberi `image_id` agar bisa dirujuk tool; batas 16 MP untuk input & output demi keamanan RAM HP.
- **Kartu file dokumen**: hasil mode file (PPT/DOC/XLS/PDF/HTML/MD/TXT/CSV) tampil sebagai kartu unduh di chat; konten kecil tertanam sebagai dataUrl, konten besar disimpan di memori sesi.
- **Chip model di topbar (mobile)**: pemilih profil/model berpindah otomatis antara composer (desktop) dan topbar (mobile), tahan terhadap perubahan DOM saat sheet terbuka.
- **Sheet iOS halus**: scrim sheet di-lift ke `<body>` saat menu terbuka agar urutan z-index selalu benar.

---

## 🏷️ Statistik

- **Commit fitur (`feat` / `fix+feat`):** 6
- **Commit perbaikan (`fix`):** 1
- **Commit dokumentasi (`docs`):** 2
- **Commit revert:** 1
- **Commit keamanan:** tidak dicantumkan sesuai permintaan
- **File utama:** `index.html` (arsitektur single-file)
- **Pendukung:** `manifest.webmanifest`, `sw.js`, `icons/`, `supabase.sql`

---

> Dibuat otomatis dari `git log` branch `main`. Terakhir diperbarui: commit `f2c065d`.
