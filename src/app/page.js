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
import Image from "next/image";
import Dashboard from "./components/Timer/Dashboard";
import Timer from "./components/Timer/Timer";
import UserStatistics from "./components/Timer/UserStatistics";
import Modal from "./components/Timer/Modal";
import SettingsForm from "./components/Timer/SettingsForm";
import LoginRegisterForm from "./components/Timer/LoginRegisterForm";
import GithubStats from "./components/Timer/GithubStats";
import LocationWidget from "./components/Timer/LocationWidget";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, increment } from "firebase/firestore";
import {
  exchangeCodeForToken,
  fetchGitHubUser,
  fetchUserEvents,
} from "./github";

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
  locMode: "time",
};

const DEFAULT_WALLPAPER = "/images/background.jpg";

const WALLPAPERS = [
  "background.jpg",
  "black.jpg",
  "car.gif",
  "falcon.gif",
  "future.gif",
  "japan.jpg",
  "parlor.gif",
  "petroleum.gif",
  "spaceship.gif",
  "waterfall.jpg",
  "your_name.jpg",
];

export default function Page() {
  /* ===================================================================
   *  1) Status Login Firebase
   * =================================================================== */
  const [sudahLogin, setSudahLogin] = useState(false);
  const [idPengguna, setIdPengguna] = useState(null);
  const [bukaStatistik, setBukaStatistik] = useState(false);
  const [bukaGithubStats, setBukaGithubStats] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [githubUser, setGithubUser] = useState(null);
  const [githubEvents, setGithubEvents] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setSudahLogin(!!user);
      setIdPengguna(user ? user.displayName : null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isLoggedIn || sudahLogin) {
      setLoginOpen(false);
    }
  }, [isLoggedIn, sudahLogin]);

  // GitHub OAuth: cek kode dari redirect dan muat data jika token ada
  useEffect(() => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const code = params ? params.get("code") : null;
    const tokenLocal =
      typeof window !== "undefined" ? localStorage.getItem("gh_token") : null;

    const handleToken = async (token) => {
      try {
        const u = await fetchGitHubUser(token);
        setGithubUser(u);
        const ev = await fetchUserEvents(token, u.login);
        setGithubEvents(ev);
      } catch (e) {
        console.error(e);
      }
    };

    if (tokenLocal) {
      handleToken(tokenLocal);
    } else if (code) {
      exchangeCodeForToken(code).then((t) => {
        if (t) {
          if (typeof window !== "undefined") {
            localStorage.setItem("gh_token", t);
            const url = new URL(window.location.href);
            url.searchParams.delete("code");
            window.history.replaceState({}, "", url.toString());
          }
          handleToken(t);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!githubUser) return;
    const token =
      typeof window !== "undefined" ? localStorage.getItem("gh_token") : null;
    if (!token) return;
    const id = setInterval(async () => {
      try {
        const ev = await fetchUserEvents(token, githubUser.login);
        setGithubEvents(ev);
      } catch (e) {
        console.error(e);
      }
    }, 60000);
    return () => clearInterval(id);
  }, [githubUser]);

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
  const [wallpaperIdx, setWallpaperIdx] = useState(0);

  useEffect(() => {
    try {
      const w = localStorage.getItem(KEY_WALLPAPER);
      if (w) {
        setWallpaperSrc(w);
        const idx = WALLPAPERS.findIndex((n) => w.endsWith(n));
        if (idx >= 0) setWallpaperIdx(idx);
      }
    } catch {}
  }, []);

  const gantiWallpaper = () => {
    const next = (wallpaperIdx + 1) % WALLPAPERS.length;
    const nama = WALLPAPERS[next];
    const src = `/images/${nama}`;
    setWallpaperIdx(next);
    setWallpaperSrc(src);
    try {
      localStorage.setItem(KEY_WALLPAPER, src);
    } catch {}
  };

  /* ===================================================================
   *  5) Modal Pengaturan
   * =================================================================== */
  const [bukaPengaturan, setBukaPengaturan] = useState(false);

  /* ===================================================================
   *  6) Info login untuk anak
   * =================================================================== */
  const infoLogin = useMemo(
    () => ({
      loggedIn: sudahLogin,
      userId: idPengguna,
      githubUser,
      githubEvents,
    }),
    [sudahLogin, idPengguna, githubUser, githubEvents]
  );

  /* ===================================================================
   *  7) Render
   * =================================================================== */
  return (
    <main className="halaman-utama">
      {/* Wallpaper */}
      <Wallpaper src={wallpaperSrc} alt="latar pixel" />

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

        {/* lokasi: waktu atau cuaca */}
        <LocationWidget mode={pengaturanTimer.locMode} />
        <LocationWidget />

        {/* githubstats */}
        <button
          className="Db__ikonbtn"
          onClick={() => setBukaGithubStats((prev) => !prev)}
          aria-label="github stats"
        >
          <Image
            src="/images/github.png"
            alt="ikon github"
            width={24}
            height={24}
            className="Db__ikonimg Db__ikonimg--github"
            priority
          />
        </button>

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
        {!(sudahLogin && githubUser) && (
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
        )}
        <div className="Db__status">
          <span
            className={`Db__dot ${
              sudahLogin || githubUser ? "is-on" : "is-off"
            }`}
            aria-label={sudahLogin || githubUser ? "login" : "offline"}
          />
          <span className="Db__status-teks">
            {githubUser
              ? `halo, ${githubUser.login}`
              : sudahLogin
              ? idPengguna
                ? `halo, ${idPengguna}`
                : "login"
              : "offline"}
          </span>
        </div>
      </div>

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
      <Modal
        buka={bukaStatistik}
        tutup={() => setBukaStatistik(false)}
        lebar="lg"
      >
        <UserStatistics
          loggedIn={infoLogin.loggedIn}
          userId={infoLogin.userId}
          totalTime={statRingkas.totalTime}
          timeStudied={statRingkas.timeStudied}
          timeOnBreak={statRingkas.timeOnBreak}
        />
      </Modal>

      {/* Music Player */}
      <div className="area-music-bawah">
        <MusicPlayer
          namaWallpaper={WALLPAPERS[wallpaperIdx].replace(/\..+$/, "")}
          onGantiWallpaper={gantiWallpaper}
        />
      </div>

      {/* Modal Pengaturan */}
      <Modal
        buka={bukaPengaturan}
        tutup={() => setBukaPengaturan(false)}
        lebar="lg"
      >
        <SettingsForm
          workLen={pengaturanTimer.workLen}
          setWorkLen={(v) =>
            setPengaturanTimer((prev) => ({ ...prev, workLen: v }))
          }
          shortBreakLen={pengaturanTimer.shortBreakLen}
          setShortBreakLen={(v) =>
            setPengaturanTimer((prev) => ({ ...prev, shortBreakLen: v }))
          }
          longBreakLen={pengaturanTimer.longBreakLen}
          setLongBreakLen={(v) =>
            setPengaturanTimer((prev) => ({ ...prev, longBreakLen: v }))
          }
          longBrInterval={pengaturanTimer.longBrInterval}
          setLongBrInterval={(v) =>
            setPengaturanTimer((prev) => ({ ...prev, longBrInterval: v }))
          }
          volume={pengaturanTimer.volume}
          setVolume={(v) =>
            setPengaturanTimer((prev) => ({ ...prev, volume: v }))
          }
          locMode={pengaturanTimer.locMode}
          setLocMode={(v) =>
            setPengaturanTimer((prev) => ({ ...prev, locMode: v }))
          }
          onTutup={() => setBukaPengaturan(false)}
          onLogoutGitHub={() => {
            setGithubUser(null);
            setGithubEvents([]);
          }}
        />
      </Modal>

      {/* Modal login/register */}
      <Modal buka={loginOpen} tutup={() => setLoginOpen(false)} lebar="lg">
        <LoginRegisterForm setIsLoggedIn={setIsLoggedIn} />
      </Modal>

      {/* GitHub Stats Modal */}
      <Modal
        buka={bukaGithubStats}
        tutup={() => setBukaGithubStats(false)}
        lebar="lg"
      >
        <GithubStats
          githubUser={infoLogin.githubUser}
          githubEvents={infoLogin.githubEvents}
        />
      </Modal>
    </main>
  );
}
