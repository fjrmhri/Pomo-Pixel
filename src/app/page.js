"use client";

/**
 * Halaman Utama: Lofi Music + Pomodoro Timer
 * --------------------------------------------------------------------
 * Mengorkestrasi:
 *  - Wallpaper  : gambar latar dari /public/images
 *  - Dashboard  : kontrol sesi (work/short/long) + tombol pengaturan
 *  - Timer      : pomodoro utama (tanpa draggable)
 *  - Statistik  : ringkasan menit (tanpa draggable)
 *  - MusicPlayer: pemutar musik + efek ambience (tanpa overlay)
 *  - Modal + SettingsForm: pengaturan durasi & volume
 *
 * Persistensi (localStorage):
 *  - lp_pengaturan_v1
 *  - lp_periode_v1
 *  - lp_wallpaper_src_v1
 *  - lp_stats_total_v1
 *  - lp_stats_daily_<YYYY-MM-DD>
 *
 * Sinkron ke Firestore saat sesi selesai (jika login):
 *  - users/<uid>/statistik/agregat
 *  - users/<uid>/statistik/harian/<YYYY-MM-DD>
 */

import { useEffect, useMemo, useState } from "react";
import Wallpaper from "./components/Music/Wallpaper";
import MusicPlayer from "./components/Music/MusicPlayer";

import Dashboard from "./components/Timer/Dashboard";
import Timer from "./components/Timer/Timer";
import UserStatistics from "./components/Timer/UserStatistics";
import Modal from "./components/Timer/Modal";
import SettingsForm from "./components/Timer/SettingsForm";

import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, increment } from "firebase/firestore";

// ---------- util tanggal ----------
const formatTanggal = (d = new Date()) => {
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${y}-${m}-${dd}`;
};

// ---------- kunci localStorage ----------
const KEY_PENGATURAN = "lp_pengaturan_v1";
const KEY_PERIODE = "lp_periode_v1";
const KEY_WALLPAPER = "lp_wallpaper_src_v1";
const KEY_STATS_TOTAL = "lp_stats_total_v1";

// ---------- nilai default ----------
const DEFAULT_PENGATURAN = {
  workLen: 25, // menit fokus
  shortBreakLen: 5, // menit istirahat pendek
  longBreakLen: 15, // menit istirahat panjang
  longBrInterval: 4, // setiap ke-4 sesi fokus → long break
  volume: 80, // volume notifikasi (0-100)
};

const DEFAULT_WALLPAPER = "/images/background.jpg";

export default function Page() {
  /* ===================================================================
   *  1) Status Login Firebase
   * =================================================================== */
  const [sudahLogin, setSudahLogin] = useState(false);
  const [idPengguna, setIdPengguna] = useState(null);
  const [bukaStatistik, setBukaStatistik] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setSudahLogin(!!user);
      setIdPengguna(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  /* ===================================================================
   *  2) Pengaturan & Periode Aktif
   * =================================================================== */
  const [pengaturanTimer, setPengaturanTimer] = useState(DEFAULT_PENGATURAN);
  const [periodeAktif, setPeriodeAktif] = useState("work"); // "work" | "short" | "long"

  // muat dari localStorage sekali saat mount
  useEffect(() => {
    try {
      const rawCfg = localStorage.getItem(KEY_PENGATURAN);
      if (rawCfg) {
        const cfg = JSON.parse(rawCfg);
        // gabungkan agar kunci baru tetap ada
        setPengaturanTimer((prev) => ({ ...prev, ...cfg }));
      }
      const p = localStorage.getItem(KEY_PERIODE);
      if (p === "work" || p === "short" || p === "long") setPeriodeAktif(p);
    } catch (e) {
      console.warn("[page] gagal memuat pengaturan/periode:", e);
    }
  }, []);

  // simpan perubahan ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem(KEY_PENGATURAN, JSON.stringify(pengaturanTimer));
    } catch (e) {
      console.warn("[page] gagal menyimpan pengaturan:", e);
    }
  }, [pengaturanTimer]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY_PERIODE, String(periodeAktif));
    } catch (e) {
      console.warn("[page] gagal menyimpan periode:", e);
    }
  }, [periodeAktif]);

  /* ===================================================================
   *  3) Statistik Ringkas (state + localStorage + Firestore)
   * =================================================================== */
  const [statRingkas, setStatRingkas] = useState({
    totalTime: 0, // total menit (fokus + istirahat)
    timeStudied: 0, // menit fokus
    timeOnBreak: 0, // menit istirahat
  });

  // muat ringkasan dari localStorage (bukan wajib, supaya UI cepat muncul)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY_STATS_TOTAL);
      if (raw) {
        const d = JSON.parse(raw);
        setStatRingkas({
          totalTime: Number(d.totalMenit || 0),
          timeStudied: Number(d.menitFokus || 0),
          timeOnBreak: Number(d.menitIstirahat || 0),
        });
      }
    } catch (e) {
      console.warn("[page] gagal memuat statistik ringkas:", e);
    }
  }, []);

  // callback dari Timer ketika satu sesi selesai
  const catatMenitSesi = async ({
    fokusMenit = 0,
    istirahatMenit = 0,
    totalMenit = 0,
    periodeSelesai = "", // "work"|"short"|"long"
  }) => {
    // 1) update state ringkas
    setStatRingkas((prev) => ({
      totalTime: (prev.totalTime || 0) + Number(totalMenit || 0),
      timeStudied: (prev.timeStudied || 0) + Number(fokusMenit || 0),
      timeOnBreak: (prev.timeOnBreak || 0) + Number(istirahatMenit || 0),
    }));

    // 2) simpan agregat ke localStorage
    try {
      const raw = localStorage.getItem(KEY_STATS_TOTAL);
      const d = raw
        ? JSON.parse(raw)
        : { totalMenit: 0, menitFokus: 0, menitIstirahat: 0 };
      const baru = {
        totalMenit: Number(d.totalMenit || 0) + Number(totalMenit || 0),
        menitFokus: Number(d.menitFokus || 0) + Number(fokusMenit || 0),
        menitIstirahat:
          Number(d.menitIstirahat || 0) + Number(istirahatMenit || 0),
      };
      localStorage.setItem(KEY_STATS_TOTAL, JSON.stringify(baru));
    } catch (e) {
      console.warn("[page] gagal menyimpan agregat ke localStorage:", e);
    }

    // 3) simpan harian ke localStorage
    try {
      const kH = `lp_stats_daily_${formatTanggal()}`;
      const rawH = localStorage.getItem(kH);
      const dH = rawH
        ? JSON.parse(rawH)
        : { totalMenit: 0, menitFokus: 0, menitIstirahat: 0 };
      const baruH = {
        totalMenit: Number(dH.totalMenit || 0) + Number(totalMenit || 0),
        menitFokus: Number(dH.menitFokus || 0) + Number(fokusMenit || 0),
        menitIstirahat:
          Number(dH.menitIstirahat || 0) + Number(istirahatMenit || 0),
      };
      localStorage.setItem(kH, JSON.stringify(baruH));
    } catch (e) {
      console.warn("[page] gagal menyimpan harian ke localStorage:", e);
    }

    // 4) simpan ke Firestore (jika login)
    if (sudahLogin && idPengguna) {
      try {
        const tanggal = formatTanggal();
        // agregat
        await setDoc(
          doc(db, "users", idPengguna, "statistik", "agregat"),
          {
            totalMenit: increment(Number(totalMenit || 0)),
            menitFokus: increment(Number(fokusMenit || 0)),
            menitIstirahat: increment(Number(istirahatMenit || 0)),
            diperbaruiPada: new Date(),
            terakhirPeriode: String(periodeSelesai || ""),
          },
          { merge: true }
        );
        // harian
        await setDoc(
          doc(db, "users", idPengguna, "statistik", "harian", tanggal),
          {
            totalMenit: increment(Number(totalMenit || 0)),
            menitFokus: increment(Number(fokusMenit || 0)),
            menitIstirahat: increment(Number(istirahatMenit || 0)),
            tanggal,
            diperbaruiPada: new Date(),
          },
          { merge: true }
        );
      } catch (e) {
        console.error("[page] gagal menyimpan statistik ke Firestore:", e);
        // tidak fatal; UI tetap jalan dengan localStorage/state
      }
    }
  };

  /* ===================================================================
   *  5) Wallpaper (gambar latar)
   * =================================================================== */
  const [wallpaperSrc, setWallpaperSrc] = useState(DEFAULT_WALLPAPER);

  useEffect(() => {
    try {
      const w = localStorage.getItem(KEY_WALLPAPER);
      if (w) setWallpaperSrc(w);
    } catch {}
  }, []);

  const gantiWallpaper = (srcBaru) => {
    const aman =
      typeof srcBaru === "string" && srcBaru.trim().length > 0
        ? srcBaru
        : DEFAULT_WALLPAPER;
    setWallpaperSrc(aman);
    try {
      localStorage.setItem(KEY_WALLPAPER, aman);
    } catch {}
  };

  /* ===================================================================
   *  6) Modal Pengaturan
   * =================================================================== */
  const [bukaPengaturan, setBukaPengaturan] = useState(false);

  const simpanPengaturan = (baru) => {
    // normalisasi + validasi angka
    const norm = {
      workLen: Math.max(1, Number(baru.workLen ?? pengaturanTimer.workLen)),
      shortBreakLen: Math.max(
        1,
        Number(baru.shortBreakLen ?? pengaturanTimer.shortBreakLen)
      ),
      longBreakLen: Math.max(
        1,
        Number(baru.longBreakLen ?? pengaturanTimer.longBreakLen)
      ),
      longBrInterval: Math.max(
        2,
        Number(baru.longBrInterval ?? pengaturanTimer.longBrInterval)
      ),
      volume: Math.min(
        100,
        Math.max(0, Number(baru.volume ?? pengaturanTimer.volume))
      ),
    };
    setPengaturanTimer(norm);
    setBukaPengaturan(false);
  };

  /* ===================================================================
   *  7) Info login untuk anak
   * =================================================================== */
  const infoLogin = useMemo(
    () => ({ loggedIn: sudahLogin, userId: idPengguna }),
    [sudahLogin, idPengguna]
  );

  /* ===================================================================
   *  8) Render
   * =================================================================== */
  return (
    <main className="halaman-utama">
      {/* Wallpaper latar (cover penuh) */}
      <Wallpaper
        src={wallpaperSrc}
        alt="latar pixel"
        onChangeSrc={
          gantiWallpaper
        } /* opsional kalau Wallpaper menyediakan picker */
      />

      {/* Dashboard (kiri-atas) */}
      <div className="area-kiri-atas">
        <Dashboard
          /* kontrol periode */
          periodeAktif={periodeAktif}
          setPeriodeAktif={setPeriodeAktif}
          onPilihPeriode={(p) => setPeriodeAktif(p)}
          /* pengaturan (membuka modal) */
          onBukaPengaturan={() => setBukaPengaturan(true)}
          onBukaStatistik={() => setBukaStatistik((prev) => !prev)}
          /* info login (opsional dipakai Dashboard) */
          loggedIn={infoLogin.loggedIn}
          userId={infoLogin.userId}
          /* dukung ganti wallpaper dari dashboard */
          onGantiWallpaper={gantiWallpaper}
        />
      </div>

      {/* Timer (tengah) */}
      <Timer
        /* konfigurasi timer */
        workLen={pengaturanTimer.workLen}
        shortBreakLen={pengaturanTimer.shortBreakLen}
        longBreakLen={pengaturanTimer.longBreakLen}
        longBrInterval={pengaturanTimer.longBrInterval}
        volume={pengaturanTimer.volume}
        /* periode aktif */
        currentPeriod={periodeAktif}
        setCurrentPeriod={setPeriodeAktif}
        /* callback statistik saat sesi selesai */
        onCatatMenit={catatMenitSesi}
      />

      {/* Statistik (kiri-atas di bawah Dashboard) */}
      {bukaStatistik && (
        <>
          <div
            className="Stat__overlay"
            onClick={() => setBukaStatistik(false)} // klik luar = tutup
          />
          <UserStatistics
            loggedIn={infoLogin.loggedIn}
            userId={infoLogin.userId}
            totalTime={statRingkas.totalTime}
            timeStudied={statRingkas.timeStudied}
            timeOnBreak={statRingkas.timeOnBreak}
          />
        </>
      )}

      {/* Music Player (tengah-bawah) */}
      <div className="area-music-bawah">
        <MusicPlayer />
      </div>

      {/* Modal Pengaturan */}
      <Modal
        buka={bukaPengaturan}
        tutup={() => setBukaPengaturan(false)}
        judul="pengaturan pomodoro"
        deskripsi="atur durasi fokus & istirahat, serta volume notifikasi."
        lebar="md"
      >
        <SettingsForm
          pengaturan={pengaturanTimer}
          setPengaturan={setPengaturanTimer}
          /* Jika SettingsForm memanggil onSimpan(baru) */
          onSimpan={simpanPengaturan}
          /* Jika SettingsForm pakai onSelesai() */
          onSelesai={() => setBukaPengaturan(false)}
        />
      </Modal>
    </main>
  );
}
