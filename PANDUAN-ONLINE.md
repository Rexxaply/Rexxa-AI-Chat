# Cara menjalankan REXXA AI secara online

Folder ini sudah siap di-upload ke hosting gratis. Setelah online, buka link-nya
di laptop dan HP, lalu pasang sebagai aplikasi.

## Pilihan 1 – Netlify Drop (paling cepat, ±1 menit)
1. Buka https://app.netlify.com/drop
2. Seret **seluruh folder `rexxa-ai`** (bukan file zip-nya) ke halaman itu.
3. Kamu langsung dapat link `https://nama-acak.netlify.app`.
4. Buat akun / login agar situs tidak terhapus, lalu ganti nama situs di
   Site configuration → Change site name (misal `rexxa-ai.netlify.app`).
5. Untuk update: buka situsmu di Netlify → Deploys → seret folder baru.

## Pilihan 2 – GitHub Pages (permanen, gratis)
1. Buat akun di https://github.com lalu buat repository baru, misal `rexxa-ai` (Public).
2. Klik **Add file → Upload files**, seret semua isi folder
   (`index.html`, `manifest.webmanifest`, `sw.js`, `supabase.sql`, folder `icons`), lalu Commit.
3. Buka **Settings → Pages**, pilih Source: *Deploy from a branch*,
   Branch: `main` / `(root)`, lalu Save.
4. Tunggu 1–2 menit, link-nya: `https://USERNAME.github.io/rexxa-ai/`

## Pasang sebagai aplikasi
- **Laptop (Chrome/Edge):** klik "Pasang aplikasi" di sidebar, atau ikon pasang di address bar.
- **Android (Chrome):** "Pasang aplikasi" di sidebar, atau menu ⋮ → *Instal aplikasi*.
- **iPhone (Safari):** tombol Bagikan → *Tambahkan ke Layar Utama*.

## Sinkron otomatis laptop ↔ HP
Ikuti **PANDUAN-SINKRON.md** untuk mengaktifkan sinkronisasi lewat Supabase.

## Memindahkan data secara manual (tanpa sinkron)
1. Di laptop: Dashboard → Akun & data → **Ekspor semua data** → pilih OK
   agar API key ikut (khusus untuk perangkat sendiri).
2. Kirim file `.json` itu ke HP (Google Drive, WhatsApp ke diri sendiri, dll).
3. Di HP: Dashboard → Akun & data → **Impor data** → pilih file tadi.

## Penting
- **Jangan tulis API key di dalam file `index.html`.** Situsnya publik; isi API key
  lewat aplikasi saja, karena tersimpan di browser perangkatmu.
- Ollama / LM Studio di laptop (`http://localhost`) hanya bisa dipakai dari laptop
  itu, tidak dari HP.
