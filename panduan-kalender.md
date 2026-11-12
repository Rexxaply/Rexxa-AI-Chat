# Kalender, Agenda & Alarm — REXXA AI

## Membuat event
- **Lewat chat:** tulis saja, misalnya *"ingatkan aku rapat tim besok jam 10 di kantor, 30 menit sebelumnya, pasang alarm juga"*. Muncul kartu event di chat.
- **Manual:** tombol 📎 di kolom ketik → **Event**, atau sidebar → **Agenda** → **Event baru**.

## Menyimpan ke kalender HP
Pada kartu event tekan **Tambah ke kalender**:
- **Google Calendar** – event terisi otomatis, tinggal ketuk *Simpan*. Pengingat memakai setelan bawaan Google Calendar.
- **Aplikasi kalender lain (.ics)** – file diunduh; ketuk notifikasi unduhan lalu pilih aplikasi kalender (mis. Samsung Calendar). Pengingat khusus ikut terbawa.

## Alarm
Tombol **Alarm** mencoba membuka aplikasi Jam dengan jam terisi (khusus Android).
Jika Chrome tidak mengizinkan, REXXA menawarkan pengingat kalender atau menyalin detail alarm untuk diatur manual.
Catatan: aplikasi Jam hanya menyimpan *jam*, bukan tanggal — untuk event beberapa hari lagi, pasang alarm H-1 atau pakai pengingat kalender.

## Pengingat di REXXA
Selama REXXA terbuka, pengingat berbunyi/tampil sendiri. Aktifkan notifikasi lewat Agenda → **Aktifkan notifikasi**.
Saat REXXA tertutup, yang membunyikan pengingat adalah kalender HP.

## Sinkron
Event di Agenda ikut tersinkron lewat Supabase (tanpa perlu menjalankan SQL baru).
Menghapus event di Agenda tidak menghapus event yang sudah masuk ke kalender HP.
