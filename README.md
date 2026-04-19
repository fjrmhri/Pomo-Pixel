# Pomo-Pixel

Pomo-Pixel adalah aplikasi fokus berbasis Next.js yang menggabungkan pomodoro timer, pemutar musik lofi, wallpaper pixel, login Google dan GitHub, serta statistik sesi fokus.

## Description

Pomo-Pixel dirancang untuk sesi belajar atau kerja yang sederhana dan stabil. Aplikasi ini menyediakan timer fokus, kontrol musik, rotasi wallpaper, statistik penggunaan, dan integrasi GitHub dalam satu antarmuka.

## Features

- Pomodoro timer dengan mode fokus, istirahat singkat, dan istirahat panjang
- Keyboard shortcut untuk kontrol timer
- Pemutar musik lofi dengan genre, seek, volume, shuffle, dan repeat
- Wallpaper pixel yang dapat diganti
- Login Google dengan Firebase Authentication
- Login GitHub dengan OAuth
- Statistik fokus lokal dan Firestore
- Riwayat aktivitas GitHub untuk akun yang terhubung
- Widget jam real-time atau cuaca berdasarkan lokasi

## Tech Stack

- Next.js 15
- React 19
- Firebase Authentication
- Firebase Firestore
- GitHub OAuth and REST API
- Tailwind CSS 4
- CSS component styles
- Vercel Analytics and Speed Insights

## Installation

```bash
git clone https://github.com/fjrmhri/Pomo-Pixel.git
cd Pomo-Pixel
npm install
```

## Environment Variables

Create `.env.local` in the project root.

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXT_PUBLIC_GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback
```

## Usage

Start development:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## Deployment

Deploy on Vercel with the same environment variables used locally. Ensure the GitHub OAuth callback URL matches the deployed domain and `/api/github/callback`.

## Project Structure

```text
src/app/
  api/github/callback/   GitHub OAuth callback route
  components/            UI components
  styles/                Component stylesheets
  firebase.js            Firebase client setup
  github.js              GitHub OAuth helpers
  layout.js              Root layout
  page.js                Main application page
public/
  images/                Wallpapers and icons
  tracks/                Music files
  sounds/                Notification sounds
  effects/               UI sound effects
```

## Notes

- GitHub login requires both `NEXT_PUBLIC_GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
- Firebase configuration is required for Google login and remote statistics.
- Music tracks and wallpaper assets are served from `public/`.
