# Pomo-Pixel

SEO title: Pomo Pixel – Aesthetic Pomodoro Timer with Lofi Music & Focus Stats

Pomo-Pixel is an aesthetic pomodoro timer built with Next.js for deep work, study sessions, and distraction-free focus. It combines a lofi focus timer, minimalist productivity UI, wallpaper rotation, and focus stats in one lightweight web app.

Live website: https://pomo-pixel.vercel.app

## Description

Pomo-Pixel dirancang untuk sesi belajar atau kerja yang sederhana dan stabil. Aplikasi ini menyediakan aesthetic pomodoro timer, focus timer with music, rotasi wallpaper, statistik penggunaan, dan integrasi GitHub dalam satu antarmuka.

Pomo-Pixel is built for users who want a calmer focus ritual without losing momentum. It works as a lightweight productivity tool for study blocks, deep work sessions, and daily routines with lofi music in the background.

The project targets keywords around aesthetic pomodoro, lofi focus timer, and minimalist productivity timer while keeping the product fast, simple, and usable on the web.

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

`NEXT_PUBLIC_GITHUB_REDIRECT_URI` is optional, but when set it must exactly match the "Authorization callback URL" of the GitHub OAuth App. If empty, `<origin>/api/github/callback` is used.

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

## Testing

```bash
npm run lint        # ESLint (next/core-web-vitals)
npm test            # unit tests for src/app/lib (node:test, no extra deps)
npm run test:rules  # Firestore security rules on the emulator (needs Java 21+)
```

CI (`.github/workflows/ci.yml`) runs lint, unit tests, and build with dummy Firebase values, plus the Firestore rules tests.

## Firestore Security Rules

Rules live in `firestore.rules`: each user can only read/write documents under `users/{uid}`, with key and type validation. Deploy them manually after changes:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project <firebase-project-id>
```

## Deployment

Deploy on Vercel with the same environment variables used locally. Ensure the GitHub OAuth callback URL matches the deployed domain and `/api/github/callback`.

## Project Structure

```text
src/app/
  api/github/callback/   GitHub OAuth callback route
  api/github/session/    GitHub session (user + events) route
  components/            UI components
  lib/                   Pure logic (timer, statistics, GitHub events) + tests
  styles/                Component stylesheets
  firebase.js            Firebase client setup
  github.js              GitHub OAuth helpers
  layout.js              Root layout
  page.js                Main application page
tests/firestore-rules/   Firestore rules tests (separate package)
firestore.rules          Firestore security rules
public/
  images/                Wallpapers and icons
  tracks/                Music files
  sounds/                Notification sounds
  effects/               UI sound effects
```

## Notes

- GitHub login requires both `NEXT_PUBLIC_GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
- Firebase configuration is required for Google login and remote statistics. When signed in, the statistics panel shows account (Firestore) data; otherwise it shows this device's local data.
- Music tracks and wallpaper assets are served from `public/`.
