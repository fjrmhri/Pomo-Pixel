"use client";

/**
 * SettingsForm (Pengaturan Pomodoro)
 * -------------------------------------------------------------------
 * - Mengatur durasi sesi, interval long break, dan volume notifikasi.
 * - Simpan ke Firestore (jika login) atau localStorage (jika belum).
 * - Cocok dengan komponen Timer & Dashboard yang sudah kita buat.
 * - UI bergaya pixel + font Monocraft, responsif.
 *
 * Props yang diharapkan dari parent:
 * - workLen, setWorkLen                (menit)
 * - shortBreakLen, setShortBreakLen    (menit)
 * - longBreakLen, setLongBreakLen      (menit)
 * - longBrInterval, setLongBrInterval  (berapa kali work sebelum long)
 * - volume, setVolume                  (0..100)
 * - timerPosition, setTimerPosition    ({x, y}) [opsional]
 * - statsPosition, setStatsPosition    ({x, y}) [opsional]
 *
 * - userId (opsional, jika tidak dipasang kita ambil dari auth.currentUser)
 *
 * Integrasi:
 * - Firebase: db, auth dari src/app/firebase.js
 * - File audio: /public/sounds/minecraft_level_up.mp3
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import "../../styles/SettingsForm.css";
import UserStatistics from "./UserStatistics";
import { db, auth } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const NAMA_KOLEKSI = "users";
const NAMA_DOKUMEN_PREFERENSI = "preferensi"; // users/<uid>/preferensi

export default function SettingsForm({
  workLen,
  setWorkLen,
  shortBreakLen,
  setShortBreakLen,
  longBreakLen,
  setLongBreakLen,
  longBrInterval,
  setLongBrInterval,
  volume,
  setVolume,
  timerPosition,
  setTimerPosition,
  statsPosition,
  setStatsPosition,
  userId, // opsional
  onTutup, // opsional: untuk menutup modal dari parent
  className = "",
}) {
  // ---------- state UI & pesan ----------
  const [sedangMuat, setSedangMuat] = useState(false);
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanSukses, setPesanSukses] = useState("");
  const [pesanError, setPesanError] = useState("");

  // data sementara untuk input (agar editing tidak langsung commit)
  const [nilaiWork, setNilaiWork] = useState(workLen || 25);
  const [nilaiShort, setNilaiShort] = useState(shortBreakLen || 5);
  const [nilaiLong, setNilaiLong] = useState(longBreakLen || 15);
  const [nilaiIntervalLong, setNilaiIntervalLong] = useState(
    longBrInterval || 4
  );
  const [nilaiVolume, setNilaiVolume] = useState(volume ?? 80);

  // user login saat ini
  const [uidAktif, setUidAktif] = useState(userId || null);

  // ref audio untuk preview bunyi
  const refSfx = useRef(null);

  // ---------- ambil UID login (kalau userId belum diberikan) ----------
  useEffect(() => {
    if (userId) {
      setUidAktif(userId);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setUidAktif(user ? user.uid : null);
    });
    return () => unsub();
  }, [userId]);

  // ---------- baca preferensi tersimpan (Firestore atau localStorage) ----------
  useEffect(() => {
    const muatPreferensi = async () => {
      setSedangMuat(true);
      setPesanError("");
      try {
        if (uidAktif) {
          // dari Firestore: users/<uid>/preferensi
          const d = await getDoc(
            doc(db, NAMA_KOLEKSI, uidAktif, NAMA_DOKUMEN_PREFERENSI, "app")
          );
          if (d.exists()) {
            const v = d.data() || {};
            // gunakan fallback agar tidak undefined
            setNilaiWork(Number(v.workLen ?? nilaiWork));
            setNilaiShort(Number(v.shortBreakLen ?? nilaiShort));
            setNilaiLong(Number(v.longBreakLen ?? nilaiLong));
            setNilaiIntervalLong(Number(v.longBrInterval ?? nilaiIntervalLong));
            setNilaiVolume(Number(v.volume ?? nilaiVolume));
          }
        } else {
          // dari localStorage
          const raw = localStorage.getItem("lp_preferensi_v1");
          if (raw) {
            const v = JSON.parse(raw);
            setNilaiWork(Number(v.workLen ?? nilaiWork));
            setNilaiShort(Number(v.shortBreakLen ?? nilaiShort));
            setNilaiLong(Number(v.longBreakLen ?? nilaiLong));
            setNilaiIntervalLong(Number(v.longBrInterval ?? nilaiIntervalLong));
            setNilaiVolume(Number(v.volume ?? nilaiVolume));
          }
        }
      } catch (e) {
        console.error(e);
        setPesanError("Gagal memuat preferensi. Nilai default dipakai.");
      } finally {
        setSedangMuat(false);
      }
    };
    muatPreferensi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uidAktif]);

  // Initialize `bacaTotal` for UserStatistics (Add this state)
  const [bacaTotal, setBacaTotal] = useState({
    totalMenit: 0,
    menitFokus: 0,
    menitIstirahat: 0,
  });

  // ---------- validasi sederhana ----------
  const validasi = () => {
    const e = [];
    const isInt = (n) => Number.isInteger(Number(n));
    const inRange = (n, a, b) => Number(n) >= a && Number(n) <= b;

    // semua durasi minimal 1 menit
    if (!isInt(nilaiWork) || !inRange(nilaiWork, 1, 600))
      e.push("Durasi fokus harus 1–600 menit.");
    if (!isInt(nilaiShort) || !inRange(nilaiShort, 1, 600))
      e.push("Durasi istirahat singkat harus 1–600 menit.");
    if (!isInt(nilaiLong) || !inRange(nilaiLong, 1, 600))
      e.push("Durasi istirahat panjang harus 1–600 menit.");

    // interval long break masuk akal
    if (!isInt(nilaiIntervalLong) || !inRange(nilaiIntervalLong, 2, 12))
      e.push("Interval long break harus 2–12.");

    // volume 0..100
    if (!isInt(nilaiVolume) || !inRange(nilaiVolume, 0, 100))
      e.push("Volume harus 0–100.");

    if (e.length > 0) {
      setPesanError(e.join(" "));
      return false;
    }
    setPesanError("");
    return true;
  };

  // ---------- simpan preferensi ----------
  const simpanPreferensi = async (ev) => {
    ev?.preventDefault?.();
    setPesanSukses("");
    if (!validasi()) return;

    setSedangSimpan(true);
    try {
      if (uidAktif) {
        // Simpan ke Firestore
        await setDoc(
          doc(db, NAMA_KOLEKSI, uidAktif, NAMA_DOKUMEN_PREFERENSI, "app"),
          {
            workLen: Number(nilaiWork),
            shortBreakLen: Number(nilaiShort),
            longBreakLen: Number(nilaiLong),
            longBrInterval: Number(nilaiIntervalLong),
            volume: Number(nilaiVolume),
            z: Date.now(), // timestamp sederhana untuk troubleshooting
          },
          { merge: true }
        );
      } else {
        // Simpan ke localStorage
        localStorage.setItem(
          "lp_preferensi_v1",
          JSON.stringify({
            workLen: Number(nilaiWork),
            shortBreakLen: Number(nilaiShort),
            longBreakLen: Number(nilaiLong),
            longBrInterval: Number(nilaiIntervalLong),
            volume: Number(nilaiVolume),
          })
        );
      }

      // Commit ke state parent agar Timer langsung ter-update
      setWorkLen?.(Number(nilaiWork));
      setShortBreakLen?.(Number(nilaiShort));
      setLongBreakLen?.(Number(nilaiLong));
      setLongBrInterval?.(Number(nilaiIntervalLong));
      setVolume?.(Number(nilaiVolume));

      setPesanSukses("Pengaturan berhasil disimpan.");
    } catch (e) {
      console.error(e);
      setPesanError(
        "Gagal menyimpan pengaturan. Periksa koneksi dan coba lagi."
      );
    } finally {
      setSedangSimpan(false);
    }
  };

  // ---------- reset ke nilai bawaan ----------
  const resetKeBawaan = () => {
    setNilaiWork(25);
    setNilaiShort(5);
    setNilaiLong(15);
    setNilaiIntervalLong(4);
    setNilaiVolume(80);
    setPesanSukses("");
    setPesanError("");
  };

  // ---------- reset posisi draggable ----------
  const resetPosisiTimer = () => {
    try {
      setTimerPosition?.({ x: 0, y: 0 });
      setPesanSukses("Posisi Timer direset.");
    } catch {
      setPesanError("Gagal mereset posisi Timer (fungsi tidak tersedia).");
    }
  };

  const resetPosisiStatistik = () => {
    try {
      setStatsPosition?.({ x: 0, y: 0 });
      setPesanSukses("Posisi Statistik direset.");
    } catch {
      setPesanError("Gagal mereset posisi Statistik (fungsi tidak tersedia).");
    }
  };

  // ---------- preview bunyi ----------
  const cobaBunyi = () => {
    try {
      if (!refSfx.current) return;
      refSfx.current.currentTime = 0;
      refSfx.current.volume = Math.min(
        Math.max(Number(nilaiVolume || 0) / 100, 0),
        1
      );
      refSfx.current.play().catch(() => {});
    } catch (e) {
      console.error(e);
      setPesanError("Tidak dapat memutar bunyi percobaan.");
    }
  };

  // ---------- isi form ----------
  return (
    <div className={`Set__bungkus ${className}`}>
      {/* audio untuk test bunyi */}
      <audio
        ref={refSfx}
        src="/sounds/minecraft_level_up.mp3"
        preload="auto"
        aria-hidden
      />

      <form className="Set" onSubmit={simpanPreferensi}>
        {/* Header */}
        <div className="Set__header">
          <div className="Set__judul">
            <Image
              src="/images/settings.png"
              alt="ikon pengaturan"
              width={24}
              height={24}
              className="Set__ikon"
              priority
            />
            <h2>pengaturan</h2>
          </div>

          <div className="Set__aksi">
            <button
              type="button"
              className="Set__btn kecil"
              onClick={resetKeBawaan}
              title="Reset ke nilai bawaan"
            >
              reset
            </button>
            {typeof onTutup === "function" && (
              <button
                type="button"
                className="Set__btn kecil"
                onClick={onTutup}
                title="Tutup"
              >
                tutup
              </button>
            )}
          </div>
        </div>

        {/* Informasi login */}
        <div className="Set__info">
          <span className={`Set__dot ${uidAktif ? "on" : "off"}`} />
          <span className="Set__info-teks">
            {sedangMuat
              ? "memuat…"
              : uidAktif
              ? "tersambung Firebase"
              : "mode lokal (localStorage)"}
          </span>
        </div>

        {/* Grid input */}
        <div className="Set__grid">
          <label className="Set__label">
            <span>fokus (menit)</span>
            <input
              type="number"
              className="Set__input"
              value={nilaiWork}
              min={1}
              max={600}
              step={1}
              onChange={(e) => setNilaiWork(e.target.value)}
            />
          </label>

          <label className="Set__label">
            <span>istirahat singkat (menit)</span>
            <input
              type="number"
              className="Set__input"
              value={nilaiShort}
              min={1}
              max={600}
              step={1}
              onChange={(e) => setNilaiShort(e.target.value)}
            />
          </label>

          <label className="Set__label">
            <span>istirahat panjang (menit)</span>
            <input
              type="number"
              className="Set__input"
              value={nilaiLong}
              min={1}
              max={600}
              step={1}
              onChange={(e) => setNilaiLong(e.target.value)}
            />
          </label>

          <label className="Set__label">
            <span>interval long break</span>
            <input
              type="number"
              className="Set__input"
              value={nilaiIntervalLong}
              min={2}
              max={12}
              step={1}
              onChange={(e) => setNilaiIntervalLong(e.target.value)}
            />
          </label>

          <label className="Set__label">
            <span>volume notifikasi (0–100)</span>
            <div className="Set__range">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={nilaiVolume}
                onChange={(e) => setNilaiVolume(Number(e.target.value))}
                aria-label="volume notifikasi"
              />
              <span className="Set__range-angka">{nilaiVolume}</span>
              <button
                type="button"
                className="Set__btn kecil"
                onClick={cobaBunyi}
                title="Coba bunyi"
              >
                coba
              </button>
            </div>
          </label>
        </div>

        {/* Aksi bawah */}
        <div className="Set__footer">
          <div className="Set__resetpos">
            <button
              type="button"
              className="Set__btn"
              onClick={resetPosisiTimer}
              title="Reset posisi Timer"
            >
              reset posisi timer
            </button>
            <button
              type="button"
              className="Set__btn"
              onClick={resetPosisiStatistik}
              title="Reset posisi Statistik"
            >
              reset posisi statistik
            </button>
          </div>

          <button
            className="Set__btn utama"
            type="submit"
            disabled={sedangSimpan}
          >
            {sedangSimpan ? "menyimpan…" : "simpan pengaturan"}
          </button>
        </div>

        {/* Pesan status */}
        {pesanError && (
          <div className="Set__alert error" role="alert">
            {pesanError}
          </div>
        )}
        {pesanSukses && <div className="Set__alert sukses">{pesanSukses}</div>}
      </form>
    </div>
  );
}
