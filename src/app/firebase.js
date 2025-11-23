import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase menggunakan variabel lingkungan.
// Catatan: Jika ada variabel yang kosong, aplikasi tetap berjalan tetapi log akan
// memberi tahu developer agar cepat diperbaiki.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Inisialisasi aman supaya tidak ganda pada hot-reload Next.js.
const createFirebaseApp = () => {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    console.warn(
      `[firebase] Variabel env belum lengkap: ${missingKeys.join(", ")}. ` +
        "Pastikan .env lokal sudah diisi."
    );
  }

  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    return initializeApp(firebaseConfig);
  } catch (error) {
    // Log detail agar debugging lebih mudah tanpa menghentikan proses build.
    console.error("[firebase] Gagal inisialisasi aplikasi:", error);
    throw error;
  }
};

const app = createFirebaseApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
