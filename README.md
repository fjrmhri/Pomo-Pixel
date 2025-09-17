<p align="center">
  <img src="https://img.shields.io/github/stars/fjrmhri/Pomo-Pixel?style=for-the-badge&logo=github&color=8b5cf6" alt="Stars"/>
  <img src="https://img.shields.io/github/license/fjrmhri/Pomo-Pixel?style=for-the-badge&color=10b981" alt="License"/>
  <img src="https://img.shields.io/badge/Next.js-15.3.4-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Firebase-12.1.0-FFCA28?style=for-the-badge&logo=firebase" alt="Firebase"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4-38bdf8?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS"/>
</p>

# Pomo-Pixel

**Pomo-Pixel** adalah website produktivitas berbasis web yang menggabungkan **pomodoro timer**, **musik lofi**, dan **wallpaper pixel**. Tujuannya membantu fokus belajar atau bekerja dengan suasana santai.

---

## Preview Aplikasi

<p align="center">
  <img src="public/preview/preview.png" alt="Preview Pomo-Pixel" />
</p>

---

## Fitur Utama

### Pomodoro Timer

- Periode fokus, istirahat singkat, dan istirahat panjang yang bisa dikustomisasi
- Kontrol mulai/jeda/reset dengan transisi otomatis
- Notifikasi suara dan indikator waktu real-time
- Keyboard shortcut (Space = mulai/jeda, R = reset, 1/2/3 = ganti periode)

### Pemutar Musik Lofi

- 90+ track lofi dalam genre chill, jazzy, sleepy
- Kontrol play/pause, prev/next, seek, volume, shuffle, repeat
- Preferensi tersimpan di localStorage
- Efek suara ringan saat ganti lagu

### Wallpaper Pixel

- Koleksi live wallpaper bergaya pixel yang bisa diganti sesuai mood

### Autentikasi & Statistik GitHub

- Login via email atau GitHub OAuth
- Simpan statistik fokus/istirahat di Firebase Firestore
- Tampilkan riwayat aktivitas GitHub (push & pull request)

### Waktu & Cuaca

- Tampilkan jam real-time atau cuaca sesuai lokasi
- Fitur otomatis nonaktif jika izin lokasi ditolak

### Dasbor Statistik

- Statistik harian dan total menit fokus
- Navigasi periode lewat tombol atau shortcut
- Komponen terpisah untuk login, registrasi, dan pengaturan timer

---

## Teknologi

### Frontend

- **Next.js 15** dengan App Router
- **React 19**

### Styling & Animasi

- **Tailwind CSS 4** & plugin forms, typography, animate
- CSS modular untuk komponen (Timer, MusicPlayer, dll.)

### Backend & Autentikasi

- **Firebase Authentication & Firestore**
- **GitHub REST API** untuk OAuth dan riwayat aktivitas

### Tools

- Node.js 18+
- Linting menggunakan `next lint`

---

## Instalasi & Menjalankan

### Prasyarat

- **Node.js 18** atau lebih tinggi
- **npm** atau package manager lain

### Instalasi

```bash
# Clone repository
git clone https://github.com/fjrmhri/Pomo-Pixel.git
cd Pomo-Pixel

# Install dependencies
npm install
```

### Konfigurasi Environment

Buat file `.env.local` di root dengan isi berikut:

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

### Mode Pengembangan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk melihat aplikasi.

### Build Produksi

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

---

## Kredit & Aset

- 🎶 Musik: [ItzAshOffcl/lofi-resources](https://github.com/ItzAshOffcl/lofi-resources)
- 🖼️ Wallpaper & inspirasi kode: [DerickPascual/pomodoros](https://github.com/DerickPascual/pomodoros)

---

## Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b fitur-baru`)
3. Commit perubahan (`git commit -m 'Tambah fitur'`)
4. Push ke branch (`git push origin fitur-baru`)
5. Buka Pull Request

---

**Nikmati vibes lofi, biarkan musik menemani aktivitasmu 🎶☕🌙**
