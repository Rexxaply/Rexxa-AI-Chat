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
