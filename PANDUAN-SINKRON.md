# Sinkronisasi otomatis laptop ↔ HP (Supabase)

Setelah aktif, chat, profil AI, pengaturan, dan statistik penggunaan otomatis
sama di semua perangkat yang masuk dengan akun yang sama. Perubahan muncul
dalam hitungan detik, dan perangkat yang offline akan menyusul saat online lagi.

## Langkah 1 – Siapkan Supabase (sekali saja, ±5 menit)
1. Daftar gratis di https://supabase.com, lalu klik **New project**.
   Isi nama (misal `rexxa`), buat password database, pilih region terdekat
   (misal Singapore), lalu tunggu project selesai dibuat.
2. Buka menu **SQL Editor** → **New query**. Tempel seluruh isi file
   `supabase.sql` (atau klik **Salin SQL** di tab Sinkronisasi), lalu klik **Run**.
   Harus muncul "Success".
3. Buka **Authentication → URL Configuration**, isi **Site URL** dengan
   alamat situs REXXA-mu (misal `https://rexxa-ai.netlify.app`), lalu Save.
   Ini agar link konfirmasi email kembali ke aplikasimu.
4. Buka **Project Settings → API** (atau **API Keys**), salin:
   - **Project URL** → `https://xxxx.supabase.co`
   - kunci **anon** atau **publishable** (`eyJ…` atau `sb_publishable_…`)

   ⚠️ Jangan pernah memakai kunci **service_role** atau **secret**.

## Langkah 2 – Aktifkan di laptop
1. Buka REXXA AI → **Dashboard → Sinkronisasi**.
2. Tempel Project URL dan kunci, lalu klik **Hubungkan**.
3. Klik **Daftar akun baru** dengan email dan password.
4. Buka email dari Supabase, klik link konfirmasi, lalu kembali dan klik **Masuk**.
   Semua chat yang sudah ada di laptop langsung diunggah.

## Langkah 3 – Tambahkan HP
1. Di laptop, klik **Salin link penyambung**, lalu kirim link itu ke HP
   (misal lewat WhatsApp ke diri sendiri).
2. Buka link di HP. URL dan kunci sudah terisi otomatis.
3. Klik **Masuk** dengan email dan password yang sama.

Titik hijau "Tersinkron" di pojok kiri bawah menandakan sinkron aktif.

## Catatan
- Kalau chat yang sama diubah di dua perangkat pada saat bersamaan,
  perubahan yang terakhir dikirim yang dipakai.
- Opsi **Sinkronkan API key** (default aktif) membuat HP langsung bisa dipakai.
  Key tersimpan di database Supabase-mu sendiri dan dilindungi Row Level
  Security, jadi hanya akunmu yang bisa membacanya. Matikan kalau kamu lebih
  suka mengisi key manual di tiap perangkat.
- Paket gratis Supabase memberi 500 MB database. Pantau di tab
  Sinkronisasi → **Ruang database**; aplikasi memberi peringatan di 80% dan 95%.
- Gambar paling memakan ruang. Matikan **Sinkronkan gambar** agar gambar hanya
  disimpan di perangkat pengirim, atau pakai **Hapus gambar dari chat lama**.
- Kalau database penuh, Supabase menjadikannya read-only. Chat tetap jalan di
  perangkat dan perubahan menunggu. Jalankan `supabase-darurat.sql` di SQL Editor
  (menghapus gambar, teks aman), lalu `vacuum full public.rexxa_items;` sebagai
  query terpisah, lalu klik **Sinkronkan sekarang**.
- Project Supabase gratis akan dijeda kalau tidak dipakai sekitar seminggu.
  Buka dashboard Supabase lalu klik **Restore** untuk menyalakannya lagi.

## Menghapus data di cloud
Buka tab Sinkronisasi → **Data di cloud** → **Lihat data di cloud**:
- Centang percakapan lalu **Hapus**: pilih hapus dari cloud & semua perangkat,
  atau dari cloud saja (tetap di perangkat ini, ikon 📱 di sidebar).
- **Bersihkan** jejak terhapus: membuang penanda hapus yang tersisa.
- **Zona berbahaya**: hapus semua riwayat chat, atau hapus akun sinkron beserta
  seluruh datanya di cloud.
Satu percakapan juga bisa dijadikan "hanya di perangkat ini" lewat menu ⋯.

## Sudah pernah menjalankan SQL versi lama?
Jalankan ulang `supabase.sql` yang baru (aman, data tidak hilang) agar indikator
ruang database dan fitur kelola data cloud aktif.
