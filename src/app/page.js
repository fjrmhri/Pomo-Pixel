"use client";

/**
 * Halaman Utama: Lofi Music + Pomodoro Timer
 * --------------------------------------------------------------------
 * - Wallpaper (gambar latar)
 * - Dashboard (kontrol timer + tombol pengaturan)
 * - Timer utama
 * - Statistik ringkas
 * - Music Player
 * - Modal pengaturan
 * - Modal login/register
 */

import { useEffect, useMemo, useState } from "react";
import Wallpaper from "./components/Music/Wallpaper";
import MusicPlayer from "./components/Music/MusicPlayer";
import NextImage from "next/image";
import Image from "next/image";
import Dashboard from "./components/Timer/Dashboard";
import Timer from "./components/Timer/Timer";
import UserStatistics from "./components/Timer/UserStatistics";
import Modal from "./components/Timer/Modal";
import SettingsForm from "./components/Timer/SettingsForm";
import LoginRegisterForm from "./components/Timer/LoginRegisterForm";
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
  workLen: 25,
  shortBreakLen: 5,
  longBreakLen: 15,
  longBrInterval: 4,
  volume: 80,
};

const DEFAULT_WALLPAPER = "/images/background.jpg";

export default function Page() {
  /* ===================================================================
   *  1) Status Login Firebase
   * =================================================================== */
  const [sudahLogin, setSudahLogin] = useState(false);
  const [idPengguna, setIdPengguna] = useState(null);
  const [bukaStatistik, setBukaStatistik] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
  const [periodeAktif, setPeriodeAktif] = useState("work");

  useEffect(() => {
    try {
      const rawCfg = localStorage.getItem(KEY_PENGATURAN);
      if (rawCfg) {
        const cfg = JSON.parse(rawCfg);
        setPengaturanTimer((prev) => ({ ...prev, ...cfg }));
      }
      const p = localStorage.getItem(KEY_PERIODE);
      if (p === "work" || p === "short" || p === "long") setPeriodeAktif(p);
    } catch (e) {
      console.warn("[page] gagal memuat pengaturan/periode:", e);
    }
  }, []);

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
   *  3) Statistik Ringkas
   * =================================================================== */
  const [statRingkas, setStatRingkas] = useState({
    totalTime: 0,
    timeStudied: 0,
    timeOnBreak: 0,
  });

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

  const catatMenitSesi = async ({
    fokusMenit = 0,
    istirahatMenit = 0,
    totalMenit = 0,
    periodeSelesai = "",
  }) => {
    setStatRingkas((prev) => ({
      totalTime: (prev.totalTime || 0) + Number(totalMenit || 0),
      timeStudied: (prev.timeStudied || 0) + Number(fokusMenit || 0),
      timeOnBreak: (prev.timeOnBreak || 0) + Number(istirahatMenit || 0),
    }));

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

    // Firestore (opsional jika login)
    if (sudahLogin && idPengguna) {
      try {
        const tanggal = formatTanggal();
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
      }
    }
  };

  /* ===================================================================
   *  4) Wallpaper
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
   *  5) Modal Pengaturan
   * =================================================================== */
  const [bukaPengaturan, setBukaPengaturan] = useState(false);

  const simpanPengaturan = (baru) => {
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
   *  6) Info login untuk anak
   * =================================================================== */
  const infoLogin = useMemo(
    () => ({ loggedIn: sudahLogin, userId: idPengguna }),
    [sudahLogin, idPengguna]
  );

  /* ===================================================================
   *  7) Render
   * =================================================================== */
  return (
    <main className="halaman-utama">
      {/* Wallpaper */}
      <Wallpaper
        src={wallpaperSrc}
        alt="latar pixel"
        onChangeSrc={gantiWallpaper}
      />

      {/* Tabs Sesi kiri-atas */}
      <div className="area-kiri-atas">
        <Dashboard
          periodeAktif={periodeAktif}
          setPeriodeAktif={setPeriodeAktif}
        />
      </div>

      {/* Tombol kanan-atas: akun + pengaturan + statistik + status */}
      <div className="area-kanan-atas">
        {/* status login */}

        {/* statistik */}
        <button
          className="Db__ikonbtn"
          onClick={() => setBukaStatistik((prev) => !prev)}
          aria-label="statistik"
        >
          <Image
            src="/images/stats.png"
            alt="ikon statistik"
            width={24}
            height={24}
            className="Db__ikonimg"
            priority
          />
        </button>
        {/* pengaturan */}
        <button
          className="Db__ikonbtn"
          onClick={() => setBukaPengaturan(true)}
          aria-label="pengaturan"
        >
          <Image
            src="/images/settings.png"
            alt="ikon pengaturan"
            width={24}
            height={24}
            className="Db__ikonimg"
            priority
          />
        </button>
        {/* akun */}
        <button className="account-button" onClick={() => setLoginOpen(true)}>
          <Image
            src="/images/info.png"
            alt="ikon akun"
            width={20}
            height={20}
            className="account-icon"
            priority
          />
        </button>
        <div className="Db__status">
          <span
            className={`Db__dot ${sudahLogin ? "is-on" : "is-off"}`}
            aria-label={sudahLogin ? "login" : "offline"}
          />
          <span className="Db__status-teks">
            {sudahLogin
              ? idPengguna
                ? `halo, ${idPengguna}`
                : "login"
              : "offline"}
          </span>
        </div>
      </div>

      {/* Pop-up login/register */}
      {loginOpen && (
        <div className="login-popup-overlay">
          <div className="login-popup">
            <LoginRegisterForm setIsLoggedIn={setIsLoggedIn} />
            <button onClick={() => setLoginOpen(false)}>Tutup</button>
          </div>
        </div>
      )}

      {/* Timer */}
      <Timer
        workLen={pengaturanTimer.workLen}
        shortBreakLen={pengaturanTimer.shortBreakLen}
        longBreakLen={pengaturanTimer.longBreakLen}
        longBrInterval={pengaturanTimer.longBrInterval}
        volume={pengaturanTimer.volume}
        currentPeriod={periodeAktif}
        setCurrentPeriod={setPeriodeAktif}
        onCatatMenit={catatMenitSesi}
      />

      {/* Statistik */}
      {bukaStatistik && (
        <>
          <div
            className="Stat__overlay"
            onClick={() => setBukaStatistik(false)}
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

      {/* Music Player */}
      <div className="area-music-bawah">
        <MusicPlayer />
      </div>

      {/* Modal Pengaturan */}
      <Modal
        buka={bukaPengaturan}
        tutup={() => setBukaPengaturan(false)}
        lebar="md"
      >
        <SettingsForm
          pengaturan={pengaturanTimer}
          setPengaturan={setPengaturanTimer}
          onSimpan={simpanPengaturan}
          onSelesai={() => setBukaPengaturan(false)}
        />
      </Modal>

      {/* Modal login/register */}
      <Modal
        buka={loginOpen}
        tutup={() => setLoginOpen(false)}
        judul="Akun"
        deskripsi="Kelola login / register akun Anda."
      >
        <LoginRegisterForm />
      </Modal>
    </main>
  );
}
