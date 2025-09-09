<p align="center">
  <img src="https://img.shields.io/github/stars/fjrmhri/Pomo-Pixel?style=for-the-badge&logo=github&color=8b5cf6" alt="Stars"/>
  <img src="https://img.shields.io/github/license/fjrmhri/Pomo-Pixel?style=for-the-badge&color=10b981" alt="License"/>
  <img src="https://img.shields.io/badge/Next.js-15.3.4-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Firebase-12.1.0-FFCA28?style=for-the-badge&logo=firebase" alt="Firebase"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4-38bdf8?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS"/>
</p>

# ⏱️🎵 Pomo-Pixel - Pomodoro Timer & Lofi Player

**Pomo-Pixel** adalah aplikasi web produktivitas yang memadukan *pomodoro timer*, pemutar musik lofi, dan wallpaper pixel yang menenangkan. Dibangun dengan Next.js dan Tailwind CSS, proyek ini menghadirkan lingkungan fokus yang santai, lengkap dengan autentikasi pengguna dan pencatatan statistik belajar.

---

## 📸 Preview Aplikasi

<p align="center">
  <img src="public/preview/preview.png" alt="Preview Pomo-Pixel" />
</p>

---

## ✨ Fitur Utama

### ⏳ Pomodoro Timer
- Periode **fokus**, **istirahat singkat**, dan **istirahat panjang** yang dapat dikustomisasi
- Tombol **mulai/jeda/reset** dengan transisi otomatis antar periode
- **Notifikasi suara** dan indikator waktu real-time
- **Keyboard shortcut** (Space untuk mulai/jeda, R untuk reset, 1/2/3 untuk ganti periode)

### 🎶 Pemutar Musik Lofi
- Lebih dari **90 track** lofi dalam genre *chill*, *jazzy*, dan *sleepy*
- Kontrol: play/pause, prev/next, seek bar, volume, **shuffle**, dan **repeat**
- **Pengaturan tersimpan** di localStorage agar preferensi tetap terjaga
- Efek suara ringan saat ganti lagu dan integrasi dengan wallpaper

### 🌌 Wallpaper Pixel & Ambience
- Koleksi **live wallpaper** bergaya pixel yang dapat diganti sesuai mood

### 🔐 Autentikasi & GitHub Stats
- Login via **email** atau **GitHub OAuth**
- Simpan statistik fokus/istirahat ke **Firebase Firestore**
- Tampilkan **GitHub stats** beserta riwayat push & pull request terbaru

### 🕒 Waktu & Cuaca Berdasarkan Lokasi
- Meminta izin lokasi saat pertama kali membuka aplikasi
- Tampilkan **jam real-time** atau **cuaca** (pilih salah satu lewat menu Pengaturan)
- Jika izin lokasi ditolak, fitur ini disembunyikan otomatis

### 📊 Dasbor Statistik
- Panel statistik harian dan total menit yang dihabiskan
- Pemilihan periode via tombol atau shortcut keyboard
- Komponen terpisah untuk login, registrasi, dan pengaturan timer

---

## 🧭 Alur Penggunaan Pomodoro

**Masuk ke Website**  
Begitu pengguna mengakses website, mereka akan langsung diarahkan ke sesi Fokus (Focus Session).

**Sesi Fokus**  
Pengguna dapat mengatur waktu fokus sesuai preferensi mereka.  
Setelah waktu fokus selesai, website akan otomatis berpindah ke sesi Istirahat Singkat (Short Break).

**Sesi Istirahat Singkat**  
Pengguna bisa mengatur durasi istirahat singkat.  
Setelah sesi istirahat singkat selesai, website akan kembali ke sesi Fokus.

**Interval Long Break**  
Website akan mencatat setiap kali sesi fokus dan sesi istirahat singkat selesai.  
Setelah mencapai interval yang ditentukan oleh pengguna (misalnya 4 kali sesi fokus dan istirahat singkat), website akan otomatis berpindah ke sesi Istirahat Panjang (Long Break).  
Pengguna bisa mengatur durasi istirahat panjang sesuai keinginan.

**Looping Proses**  
Setelah sesi istirahat panjang selesai, website akan kembali ke sesi Fokus dan mulai siklus kembali.

---

## 🛠️ Teknologi

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

## 🚀 Instalasi & Menjalankan

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

## 📂 Struktur Proyek
```
src/
└── app/
    ├── components/
    │   ├── Music/             # Pemutar musik & pengaturan wallpaper
    │   └── Timer/             # Timer, dashboard, login, statistik, GitHub stats
    ├── api/github/            # Endpoint OAuth callback
    └── styles/                # File CSS modular
public/
├── tracks/                    # Kumpulan musik lofi
├── images/                    # Wallpaper pixel
├── effects/, sounds/          # SFX dan audio lainnya
└── preview/                   # Gambar pratinjau
```

---

## 📄 Lisensi
Proyek ini menggunakan lisensi [MIT](LICENSE).

---

## 🙏 Kredit & Aset
- 🎶 Musik: [ItzAshOffcl/lofi-resources](https://github.com/ItzAshOffcl/lofi-resources)
- 🖼️ Wallpaper & inspirasi kode: [DerickPascual/pomodoros](https://github.com/DerickPascual/pomodoros)

---

## 🤝 Kontribusi
1. Fork repository
2. Buat branch fitur (`git checkout -b fitur-baru`)
3. Commit perubahan (`git commit -m 'Tambah fitur'`)
4. Push ke branch (`git push origin fitur-baru`)
5. Buka Pull Request

---

**Nikmati vibes lofi, biarkan musik menemani aktivitasmu 🎶☕🌙**
