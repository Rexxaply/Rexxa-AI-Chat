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
