# Instruksi Pengembangan Sistem Absensi (Alice-Mobile)

## 🎯 Konteks & Tujuan Utama
Kamu bertindak sebagai Senior React Native & UI/UX Developer. Proyek ini adalah `Alice-Mobile`, sebuah aplikasi mobile khusus absensi karyawan menggunakan framework React Native (Expo) dengan TypeScript. 

Tugas utamamu adalah menyempurnakan alur autentikasi (Login) dan membangun halaman utama (Home) yang berisi fitur absensi (Check-in & Check-out) yang sepenuhnya terintegrasi dengan REST API yang sudah ada. Desain antarmuka harus menggunakan tren UI/UX modern (bersih, minimalis, *glassmorphism* atau *soft shadow* yang elegan, dan interaktif).

## 📂 Struktur Proyek Saat Ini
Aplikasi ini menggunakan Expo Router. Berikut adalah gambaran struktur *codebase* yang sudah ada dan harus dipertahankan:
- `app/` (Routing utama): Berisi `index.tsx`, `login.tsx`, `home.tsx`, `camera.tsx`, `_layout.tsx`.
- `src/config/api.ts`: Konfigurasi base URL API.
- `src/components/`: Untuk komponen UI yang dapat digunakan ulang (Reusable).
- `src/services/`: Untuk fungsi pemanggilan API (Fetch/Axios).

## 🔌 Spesifikasi API
- **Base URL Backend:** `https://cimahi.avisenahospitals.com/api`
- API untuk Login dan Absensi sudah *ready to use* dan di-deploy via Vercel.
- **Dokumentasi API:** Tersedia secara lokal di direktori `C:/Next/Alice`. Silakan baca dan pelajari *endpoint*, *payload*, serta *response* dari dokumentasi di folder tersebut sebelum mengimplementasikan integrasi.

## 📋 Detail Tugas & Fitur yang Harus Dibuat

### 1. Halaman Login (`app/login.tsx`)
- Perbaiki dan pastikan halaman login berjalan sempurna dengan API backend.
- **UI/UX:** Desain *form login* yang modern. Gunakan validasi input yang baik, indikator *loading* saat memproses data, dan penanganan *error* (misal: password salah) menggunakan *toast* atau *alert* yang estetis.
- Simpan token autentikasi secara aman (rekomendasi: `expo-secure-store`) dan buat logika *redirect* otomatis ke `app/home.tsx` jika sesi masih aktif.

### 2. Halaman Utama / Dashboard Absensi (`app/home.tsx`)
- Buat *dashboard* yang menyapa pengguna dengan nama mereka (diambil dari data sesi login).
- Tampilkan jam digital real-time dan tanggal hari ini di bagian atas.
- **Fitur Utama:** Buat dua tombol aksi utama (CTA) berukuran besar dan jelas:
  - 🟢 **Check-in (Masuk)**
  - 🔴 **Check-out (Pulang)**
- Tampilkan status absensi hari ini (apakah sudah absen masuk, waktu absen masuk, dan apakah sudah absen pulang).
- **Integrasi Kamera/Lokasi:** Pastikan saat tombol ditekan, aplikasi siap memanggil layar `app/camera.tsx` atau meminta izin lokasi jika diperlukan oleh dokumentasi API absensi.

### 3. Integrasi & Servis (`src/services/`)
- Buat file `authService.ts` dan `attendanceService.ts` di dalam `src/services/` untuk memisahkan logika UI dengan logika pemanggilan API.
- Gunakan konfigurasi URL dari `src/config/api.ts`.
- Tambahkan *interceptor* jika menggunakan Axios, atau fungsi pembantu bawaan untuk selalu menyisipkan token *Bearer* di setiap *request* absensi.

## 🎨 Panduan Desain (UI/UX)
- Gunakan skema warna yang terlihat profesional namun segar (misalnya warna biru medis/korporat sebagai aksen).
- Sudut elemen yang membulat (*rounded corners*).
- Berikan efek *feedback* visual saat tombol ditekan (gunakan `TouchableOpacity` atau `Pressable` dengan animasi opasitas/skala).
- Pastikan tipografi bersih dan hierarki teksnya jelas (judul tebal, teks bantuan berwarna abu-abu).

## 🚀 Langkah Eksekusi yang Diharapkan darimu:
1. Analisis dokumentasi API di `C:/Next/Alice` terlebih dahulu (khususnya alur autentikasi dan absensi).
2. Tulis atau perbarui kode di `src/services/` untuk memetakan *endpoint* tersebut.
3. Rancang UI untuk `login.tsx` dan pastikan alur autentikasinya kokoh.
4. Rancang UI untuk `home.tsx` dengan fitur tombol Check-in dan Check-out modern.
5. Berikan penjelasan singkat setiap selesai memodifikasi file.

Silakan mulai dengan meninjau dokumentasi API, lalu kita kerjakan mulai dari penyempurnaan fitur Login.