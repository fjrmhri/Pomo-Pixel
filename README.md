<p align="center">
  <img src="https://img.shields.io/github/stars/fjrmhri/Pomo-Pixel?style=for-the-badge&logo=github&color=8b5cf6" alt="Stars"/>
  <img src="https://img.shields.io/github/license/fjrmhri/Pomo-Pixel?style=for-the-badge&color=10b981" alt="License"/>
  <img src="https://img.shields.io/badge/Next.js-15.3.4-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Firebase-12.1.0-FFCA28?style=for-the-badge&logo=firebase" alt="Firebase"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4-38bdf8?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS"/>
</p>

# Pomo-Pixel

Pomo-Pixel adalah aplikasi produktivitas bergaya lofi yang menggabungkan **pomodoro timer**, **musik**, dan **wallpaper pixel** agar sesi fokus tetap rileks tanpa mengubah alur UI/UX yang sudah ada.

## Fitur Utama
- Pomodoro timer dengan periode fokus/istirahat yang bisa diatur, notifikasi suara, dan pintasan keyboard (Space, R, 1/2/3).
- Pemutar musik lofi dengan 90+ lagu, kontrol lengkap (play/pause, prev/next, seek, shuffle, repeat), serta penyimpanan preferensi di localStorage.
- Pilihan wallpaper pixel yang dapat diganti cepat dari pemutar musik.
- Autentikasi Firebase dan pencatatan menit fokus/istirahat ke Firestore.
- Integrasi GitHub OAuth untuk menampilkan aktivitas Push/Pull Request terbaru.
- Widget waktu/cuaca ringan sesuai mode pengaturan.

## Prasyarat
- Node.js 18 atau lebih baru.
- npm (atau package manager setara).

## Instalasi & Menjalankan (Lokal)
```bash
# Klon repositori
git clone https://github.com/fjrmhri/Pomo-Pixel.git
cd Pomo-Pixel

# Pasang dependensi
npm install

# Jalankan mode pengembangan
npm run dev
```
Buka http://localhost:3000 untuk melihat aplikasi.

Untuk build produksi lokal:
```bash
npm run build
npm start
```

## Konfigurasi Environment
Buat file `.env.local` di root proyek dengan variabel berikut:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
NEXT_PUBLIC_GITHUB_REDIRECT_URI=http://localhost:3000/
```
Pastikan nilai sesuai kredensial Firebase dan aplikasi OAuth GitHub Anda.

## Skrip yang Tersedia
- `npm run dev` – Menjalankan Next.js dalam mode pengembangan.
- `npm run build` – Membuat build produksi.
- `npm start` – Menjalankan build produksi yang sudah dibuat.
- `npm run lint` – Menjalankan pemeriksaan lint (Next.js ESLint).

## Struktur Singkat
- `src/app` – Komponen utama (Timer, Music, Wallpaper) dan halaman.
- `public` – Aset musik, efek suara, dan wallpaper.

## Deploy ke Vercel
Pomo-Pixel didesain untuk dijalankan di [Vercel](https://vercel.com/). Setelah membuat akun dan menyiapkan variabel lingkungan yang sama seperti pada `.env.local`, lakukan langkah berikut:

1. Fork atau import repositori ini ke Vercel.
2. Pada pengaturan proyek Vercel, tambahkan variabel environment yang sama dengan yang digunakan secara lokal.
3. Pilih framework **Next.js** (Auto-detect) dan pastikan root proyek berada di direktori ini.
4. Simpan konfigurasi dan lakukan deploy. Build otomatis akan memanggil `npm install` dan `npm run build` sesuai konfigurasi default Vercel.

Tidak ada konfigurasi tambahan yang diperlukan untuk server khusus, Nginx, atau VPS. Semua deployment dilakukan langsung melalui Vercel.

## Lisensi
Proyek ini berlisensi MIT sebagaimana tercantum pada berkas [LICENSE](LICENSE).

---
Selamat menikmati suasana fokus dengan nuansa lofi di Pomo-Pixel! 🎶☕
