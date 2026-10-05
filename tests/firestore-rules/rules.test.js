import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, increment, setDoc, setLogLevel } from "firebase/firestore";

const UID = "pengguna_a";
const UID_LAIN = "pengguna_b";
const TANGGAL = "2026-10-05";

let lingkungan;

const dbPengguna = (uid = UID) => lingkungan.authenticatedContext(uid).firestore();
const dbTamu = () => lingkungan.unauthenticatedContext().firestore();

const dataAgregat = (tambahan = {}) => ({
  totalMenit: increment(25),
  menitFokus: increment(25),
  menitIstirahat: increment(0),
  diperbaruiPada: new Date(),
  terakhirPeriode: "work",
  ...tambahan,
});

const dataHarian = (tambahan = {}) => ({
  totalMenit: increment(5),
  menitFokus: increment(0),
  menitIstirahat: increment(5),
  tanggal: TANGGAL,
  diperbaruiPada: new Date(),
  ...tambahan,
});

const dataPreferensi = (tambahan = {}) => ({
  workLen: 25,
  shortBreakLen: 5,
  longBreakLen: 15,
  longBrInterval: 4,
  volume: 80,
  locMode: "time",
  displayNameSource: "google",
  z: Date.now(),
  ...tambahan,
});

before(async () => {
  setLogLevel("error");
  lingkungan = await initializeTestEnvironment({
    projectId: "demo-pomo-pixel",
    firestore: {
      rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"),
    },
  });
});

beforeEach(async () => {
  await lingkungan.clearFirestore();
});

after(async () => {
  await lingkungan?.cleanup();
});

describe("users/{uid}/statistik/agregat", () => {
  const ref = (db, uid = UID) => doc(db, "users", uid, "statistik", "agregat");

  test("pemilik dapat membuat, menambah, dan membaca", async () => {
    await assertSucceeds(setDoc(ref(dbPengguna()), dataAgregat(), { merge: true }));
    await assertSucceeds(setDoc(ref(dbPengguna()), dataAgregat(), { merge: true }));
    await assertSucceeds(getDoc(ref(dbPengguna())));
  });

  test("pengguna lain dan tamu ditolak", async () => {
    await assertFails(setDoc(ref(dbPengguna(UID_LAIN), UID), dataAgregat(), { merge: true }));
    await assertFails(getDoc(ref(dbPengguna(UID_LAIN), UID)));
    await assertFails(setDoc(ref(dbTamu(), UID), dataAgregat(), { merge: true }));
    await assertFails(getDoc(ref(dbTamu(), UID)));
  });

  test("field asing, nilai negatif, dan periode tidak dikenal ditolak", async () => {
    await assertFails(setDoc(ref(dbPengguna()), dataAgregat({ admin: true }), { merge: true }));
    await assertFails(setDoc(ref(dbPengguna()), dataAgregat({ totalMenit: -5 }), { merge: true }));
    await assertFails(
      setDoc(ref(dbPengguna()), dataAgregat({ terakhirPeriode: "hack" }), { merge: true }),
    );
  });
});

describe("users/{uid}/statistik_harian/{tanggal}", () => {
  test("pemilik dapat menulis dokumen hari ini", async () => {
    const ref = doc(dbPengguna(), "users", UID, "statistik_harian", TANGGAL);
    await assertSucceeds(setDoc(ref, dataHarian(), { merge: true }));
  });

  test("tanggal tidak cocok atau format id salah ditolak", async () => {
    const ref = doc(dbPengguna(), "users", UID, "statistik_harian", TANGGAL);
    await assertFails(setDoc(ref, dataHarian({ tanggal: "2026-01-01" }), { merge: true }));
    const refSalah = doc(dbPengguna(), "users", UID, "statistik_harian", "kemarin");
    await assertFails(setDoc(refSalah, dataHarian({ tanggal: "kemarin" }), { merge: true }));
  });
});

describe("users/{uid}", () => {
  const dataProfil = { name: "Uji", email: "uji@example.com", updatedAt: new Date() };

  test("login Google dapat menulis profil, termasuk dokumen dengan field lama", async () => {
    await lingkungan.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", UID), {
        name: "Lama",
        email: "lama@example.com",
        totalTime: 10,
        timeStudied: 5,
        timeOnBreak: 5,
      });
    });
    await assertSucceeds(setDoc(doc(dbPengguna(), "users", UID), dataProfil, { merge: true }));
  });

  test("field asing dan akses pengguna lain ditolak", async () => {
    await assertFails(
      setDoc(doc(dbPengguna(), "users", UID), { ...dataProfil, role: "admin" }, { merge: true }),
    );
    await assertFails(getDoc(doc(dbPengguna(UID_LAIN), "users", UID)));
  });
});

describe("users/{uid}/preferensi/app", () => {
  const ref = (db) => doc(db, "users", UID, "preferensi", "app");

  test("preferensi valid diterima", async () => {
    await assertSucceeds(setDoc(ref(dbPengguna()), dataPreferensi(), { merge: true }));
  });

  test("nilai di luar rentang ditolak", async () => {
    await assertFails(setDoc(ref(dbPengguna()), dataPreferensi({ volume: 150 }), { merge: true }));
    await assertFails(setDoc(ref(dbPengguna()), dataPreferensi({ workLen: 0 }), { merge: true }));
    await assertFails(setDoc(ref(dbPengguna()), dataPreferensi({ locMode: "x" }), { merge: true }));
  });
});

test("path di luar skema ditolak", async () => {
  await assertFails(setDoc(doc(dbPengguna(), "lain", "x"), { a: 1 }));
  await assertFails(setDoc(doc(dbPengguna(), "users", UID, "rahasia", "x"), { a: 1 }));
});
