import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_Vl_Q409047OLCzVwNr_9bsv8JBeAcr8",
  authDomain: "lofi-pomodoro-d826e.firebaseapp.com",
  projectId: "lofi-pomodoro-d826e",
  storageBucket: "lofi-pomodoro-d826e.appspot.com",
  messagingSenderId: "87292520484",
  appId: "1:87292520484:web:c940e99dfc6a9674d510b1",
  measurementId: "G-4P8PWD83KZ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
