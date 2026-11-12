# Membuat APK REXXA sendiri (Firebase & Supabase sendiri)

Untuk kamu yang memakai Supabase sendiri dan ingin notifikasi manga muncul di APK.
APK ini terpisah dari APK `com.rexxa.ai`, jadi keduanya bisa terpasang berdampingan di satu HP.
Yang dibutuhkan: akun GitHub, akun Google (Firebase), dan Supabase yang sudah disiapkan sesuai `panduan-sinkron.md` dan `panduan-manga.md`.

## 1. Fork repo
1. Buka https://github.com/Rexxaply/Rexxa-AI-Chat lalu klik **Fork** → **Create fork**.
2. Di repo fork-mu, buka tab **Actions**, lalu klik **I understand my workflows, go ahead and enable them**.

## 2. Tentukan ID aplikasi
Pilih ID unik berhuruf kecil, misalnya `com.budi.rexxa`. ID ini tidak bisa diganti setelah APK dipakai, karena APK dengan ID lain dianggap aplikasi berbeda.

## 3. Firebase
1. Buka https://console.firebase.google.com → **Create a project** (Analytics boleh dimatikan).
2. Klik ikon **Android**. Isi **Android package name** persis dengan ID aplikasi dari langkah 2 → **Register app**.
3. Unduh **google-services.json**. Langkah SDK berikutnya cukup dilewati (Next sampai Continue to console).
4. Ikon gerigi → **Project settings → Service accounts → Generate new private key**. Simpan file JSON ini baik-baik: **rahasia**, jangan dibagikan atau diunggah ke GitHub.

## 4. Pengaturan di repo fork
Di repo fork: **Settings → Secrets and variables → Actions**.

Tab **Variables** → **New repository variable**:
| Name | Value |
|---|---|
| `APP_ID` | ID aplikasi dari langkah 2, mis. `com.budi.rexxa` |
| `APP_NAME` | Nama di layar HP, mis. `REXXA Budi` |

Tab **Secrets** → **New repository secret**:
| Name | Value |
|---|---|
| `GOOGLE_SERVICES_JSON` | Seluruh isi file `google-services.json` dari langkah 3 |

### Kunci tanda tangan sendiri (disarankan)
Tanpa ini, APK-mu ditandatangani kunci debug yang ada di repo publik. Siapa pun bisa membuat APK dengan tanda tangan yang sama. Buat kunci sendiri sekali saja (di laptop dengan Java, atau Termux: `pkg install openjdk-17`):

```
keytool -genkeypair -v -keystore rexxa.keystore -alias rexxa -keyalg RSA -keysize 2048 -validity 10000 -storepass PASSWORDMU -keypass PASSWORDMU -dname "CN=REXXA"
base64 -w0 rexxa.keystore > rexxa.keystore.txt
```

Lalu tambahkan secret:
| Name | Value |
|---|---|
| `APK_KEYSTORE_B64` | Isi file `rexxa.keystore.txt` |
| `APK_KEYSTORE_PASSWORD` | `PASSWORDMU` |

Simpan `rexxa.keystore` dan password-nya. Kalau hilang, update berikutnya tidak bisa dipasang menimpa: APK harus di-uninstall dulu.

## 5. Bangun APK
1. Tab **Actions → Build APK → Run workflow → Run workflow**.
2. Tunggu ±5 menit sampai centang hijau. Kalau merah, buka langkah yang gagal. Pesan `Package … tidak terdaftar di google-services.json` berarti `APP_ID` tidak sama dengan package di Firebase.
3. Unduh APK dari HP: `https://github.com/<akunmu>/Rexxa-AI-Chat/releases/tag/apk-terbaru` → `rexxa-ai.apk`.

## 6. Hubungkan notifikasi ke Supabase-mu
1. Supabase → **Edge Functions → Secrets → Add new secret**: Name `FCM_SERVICE_ACCOUNT`, Value seluruh isi file kunci akun layanan dari langkah 3.4.
2. Beri izin kirim notifikasi. Buka https://console.cloud.google.com (pilih proyek Firebase-mu), klik ikon terminal **>_** (Cloud Shell), lalu jalankan. Ganti `PROJECT_ID` dan email dengan milikmu. Email ada di file kunci (`client_email`) atau di **IAM & Admin → Service Accounts**:
   ```
   gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:firebase-adminsdk-xxxxx@PROJECT_ID.iam.gserviceaccount.com" --role="roles/firebasecloudmessaging.admin"
   ```
3. Pastikan Edge Function `rexxa-manga` sudah versi 1.10.2 atau lebih baru.
4. Di APK: masuk Sinkronisasi dengan Supabase-mu → **Manga → Diikuti → Aktifkan notifikasi** → **Pop-up tidak muncul? → Kirim tes**, lalu kunci layar. Hasil yang benar: `1/1 APK`.

## Update
Saat repo asli diperbarui, buka repo fork → **Sync fork → Update branch**. APK baru dibangun otomatis; unduh lagi dan pasang menimpa versi lama.
