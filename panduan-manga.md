# Notifikasi chapter manga baru — REXXA AI

Sumber: **MangaDex** · Bahasa: **Indonesia** · Dicek: **tiap jam**.
Butuh **Sinkronisasi Supabase** yang sudah aktif.

## Setup (sekali, ±10 menit) — semua tombol salin ada di menu **Manga**
1. **SQL Manga** → Supabase → SQL Editor → tempel isi `supabase-manga.sql` → Run.
2. **Edge Function** → Supabase → Edge Functions → *Deploy a new function* → *Via Editor*
   - Nama: `rexxa-manga`
   - Tempel isi `supabase-functions/rexxa-manga/index.ts` → **Deploy**
   - Buka pengaturan function → **matikan "Verify JWT"** (function memeriksa login sendiri).
3. Di REXXA → **Manga** → **Hubungkan**. Kunci notifikasi & secret jadwal dibuat otomatis.
4. **Salin SQL jadwal** → jalankan di SQL Editor → **Saya sudah menjalankan**.
5. **Aktifkan** notifikasi di setiap HP/laptop yang ingin menerima.

## Pemakaian
- Cari judul → **Ikuti**. Chapter Indonesia yang rilis setelahnya memicu notifikasi.
- Ketuk notifikasi → langsung membuka chapter di MangaDex.
- 🔔 per manga untuk membisukan, 🗑 untuk berhenti mengikuti, **Cek sekarang** untuk cek manual.
- Tab **Update** berisi daftar chapter baru (badge di sidebar).

## Catatan
- Banyak judul berlisensi resmi tidak ada di MangaDex, dan terjemahan Indonesia lebih sedikit dari Inggris.
- Notifikasi bisa terlambat sampai ±1 jam (jadwal menit ke-7 tiap jam).
- Notifikasi push perlu REXXA dibuka dari situs https (Netlify/GitHub Pages) di Chrome Android.
- Pengecekan diberi jeda antar permintaan agar sesuai batas MangaDex.

## Unduh dari link (function v1.7.0)
Di menu **Manga**, tempel link di kartu **Unduh dari link** lalu tekan **Buka** (atau langsung tempel, otomatis terbaca).
Sheet **Unduh chapter** terbuka seperti biasa: pilih chapter / rentang, format **ZIP** atau **CBZ per chapter**.

| Situs | Link yang bisa dipakai | Catatan |
|---|---|---|
| **MangaDex** | `mangadex.org/title/…` atau `mangadex.org/chapter/…` | Ada pilihan kualitas Asli / Hemat data |
| **Omega Scans** | `omegascans.org/series/<judul>` atau `…/series/<judul>/chapter-1` | Lewat API resmi Omega Scans. Chapter **Premium** (berkoin) tampil terkunci dan tidak bisa diunduh |
| **Situs tema MangaThemesia** | Halaman judul atau chapter | Dikenali otomatis (banyak situs komik Indonesia) |
| **Situs tema Madara** | Halaman judul atau chapter | Dikenali otomatis. Situs yang mengenkripsi gambar (*chapter protector*) belum didukung |

- Link chapter → chapter itu langsung tercentang di daftar.
- Jumlah halaman & ukuran untuk situs selain MangaDex baru diketahui saat mengunduh.
- Gambar diambil lewat Edge Function (alamatnya ditandatangani server, jadi bukan proxy terbuka) dan wajib login akun sinkron.
- Bila muncul "dilindungi Cloudflare", situs menolak server Supabase. Coba lagi nanti.
- Bila muncul "Edge Function masih versi lama": salin kode function terbaru dari menu Manga → Deploy ulang `rexxa-manga`.
- Gunakan untuk baca pribadi/offline. Hormati situs sumber dan pembuat karyanya.

## Riwayat link & simpan ke folder
- **Riwayat link** (tombol jam di sebelah **Buka**): link yang pernah dibuka/diunduh. Ketuk untuk membuka lagi tanpa salin-tempel.
  - Bila pernah mengunduh, chapter **lanjutan** (setelah chapter terakhir yang diunduh) otomatis tercentang. Chapter yang sudah diunduh bertanda **✓ Sudah diunduh**.
  - Hapus per item (ikon tempat sampah) atau **Hapus semua**. Maks. 30 link, terhapus otomatis setelah 30 hari.
  - Ikut sinkron ke semua perangkat bila Sinkronisasi Supabase aktif (tabel `rexxa_items`, tidak perlu SQL baru).
- **Simpan ke → Folder pilihan…** (Chrome/Edge, Chrome Android 132+): pilih folder sekali, file langsung ditulis ke sana.
  - Opsi **subfolder per judul** dan **lewati chapter yang sudah ada** (khusus CBZ per chapter).
  - Folder diingat per perangkat (tidak ikut sinkron). Setelah aplikasi dibuka ulang, browser bisa meminta izin lagi: ketuk **Izinkan**.
  - Firefox/Safari/iPhone: otomatis memakai folder Unduhan.

## Jelajah, baca di aplikasi & bookmark (function v1.9.0)
Tab **Jelajah** di menu Manga: pilih sumber **Shinigami**, **Komiku**, **Kiryuu**, atau **WestManga**, cari judul, lalu baca langsung di REXXA.

- **Tipe**: Semua · Manga · Manhwa · Manhua (difilter oleh situsnya; label tipe tampil di sampul).
- **Urutkan**: Update terbaru · Populer. Ketiga situs tidak menyediakan populer per periode (harian/bulanan/tahunan), jadi yang ada hanya populer keseluruhan.
- **Per halaman**: 10 judul di HP, 15 di layar lebar (≥ 820 px), dengan tombol Sebelumnya/Berikutnya. Pilihan tipe & urutan diingat.

**Update dari versi sebelumnya (sekali saja):**
1. **Salin SQL Manga** → Supabase → SQL Editor → Run (menambah migrasi `supabase-migrations/2026-11-13_web_sources.sql`; aman dijalankan ulang).
2. **Salin kode function** → Supabase → Edge Functions → `rexxa-manga` → Code → tempel → **Deploy**.

> v1.9.0 menambah WestManga: jalankan ulang **SQL Manga** (migrasi `2026-11-13b_westmanga.sql`) lalu deploy ulang function.

**Pemakaian**
- Ketuk judul → **Mulai baca / Lanjut Chapter X**. Reader punya mode **Webtoon ↕**, **Halaman →**, dan **Manga ←**; ketuk gambar untuk menyembunyikan bar.
- Posisi baca tersimpan di perangkat; chapter yang sudah dibaca diberi tanda.
- **Bookmark** → judul masuk tab **Diikuti** dan ikut dicek tiap jam. Chapter baru muncul di tab **Update** dan dikirim sebagai notifikasi; ketuk notifikasinya untuk langsung membuka chapter itu di reader.
- 🔔 di tab Diikuti untuk membisukan, 🗑 (atau tombol **Di-bookmark**) untuk menghapus bookmark.

**Catatan**
- Saat bookmark dibuat, chapter terbaru dijadikan patokan, jadi notifikasi hanya untuk chapter yang rilis sesudahnya. Chapter lama (> 7 hari) yang baru muncul tidak dinotifikasi.
- Maks. 40 judul situs web dicek per jalan cron (jeda ±1 detik antar judul); sisanya giliran jam berikutnya. Situs yang sedang down dilewati sampai jalan berikutnya.
- Domain situs sering pindah. Kalau rusak, isi secret di Edge Functions → Secrets: `SHNGM_API`, `SHNGM_SITE`, `KOMIKU_SITE`, `KOMIKU_API`, `KIRYUU_SITE`, `WEST_SITE` (boleh beberapa, pisahkan koma).
- **Shinigami** memakai Cloudflare yang menolak server Supabase. Karena itu jelajah & baca Shinigami diambil **langsung dari HP** (server hanya cadangan), dan bookmark Shinigami **dicek oleh aplikasi** saat dibuka (maks. 15 judul, tiap ±20 menit); hasilnya dikirim ke server lalu jadi riwayat Update & notifikasi ke semua perangkat. Artinya notifikasi Shinigami baru muncul setelah REXXA dibuka di salah satu perangkat. Unduh ZIP/CBZ Shinigami tidak tersedia selama server diblokir.

## Baca dari folder HP (tanpa server)
Tab **Jelajah → Folder HP**: pilih folder atau file. Semua dibaca di perangkat, tidak diunggah.

- **Bentuk yang dikenali**: `Seri/Chapter 1/001.webp…`, folder perpustakaan `Komik/Seri/Chapter/…`, satu folder chapter, gambar lepas, atau **CBZ/ZIP** (satu arsip = satu chapter; arsip berisi beberapa folder = beberapa chapter). Chapter dari folder & CBZ dengan judul seri yang sama digabung.
- **Urutan** mengikuti nomor chapter/halaman (`2` sebelum `10`).
- **Tipe dikenali otomatis** dari beberapa halaman contoh:
  - rasio tinggi:lebar ≥ 2 → **Manhwa/Manhua · strip panjang** → mode **Webtoon**, strip disambung tanpa celah;
  - hitam-putih → **Manga** → mode **Manga ←** (kanan ke kiri);
  - berwarna per halaman → mode **Halaman →**.
  Mode yang kamu ganti di reader diingat per seri.
- Halaman dimuat saat mendekati layar, jadi strip yang sangat panjang tetap ringan.
- Setelah aplikasi ditutup, pilih ulang foldernya (batasan browser); posisi baca tetap tersimpan.
- Kalau **Pilih folder** tidak tersedia di HP, pakai **Pilih file** lalu tandai semua gambar satu chapter, atau pilih file CBZ/ZIP.
