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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const KEY_GITHUB_TOKEN = "gh_token";

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

const logError = (context, error) => {
  console.error(`[page] ${context}`, error);
};

const safeReadLocalStorage = (key, context) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    logError(`gagal membaca localStorage untuk ${key}${context ? ` (${context})` : ""}`, error);
    return null;
  }
};

const safeWriteLocalStorage = (key, value, context) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    logError(`gagal menyimpan localStorage untuk ${key}${context ? ` (${context})` : ""}`, error);
  }
};

const safeParseJSON = (value, fallback, context) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    logError(`gagal mengurai JSON${context ? ` (${context})` : ""}`, error);
    return fallback;
  }
};

const buildWallpaperSrc = (fileName) => `/images/${fileName}`;

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
  const loginStateRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      try {
        const loggedIn = Boolean(user);
        setSudahLogin(loggedIn);
        setIsLoggedIn(loggedIn);
        setIdPengguna(user ? user.displayName || user.uid || null : null);
      } catch (error) {
        logError("gagal memperbarui status login", error);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const logged = Boolean(isLoggedIn || sudahLogin || githubUser);
    const wasLogged = loginStateRef.current;
    loginStateRef.current = logged;

    if (loginOpen && logged && !wasLogged) {
      setLoginOpen(false);
    }
  }, [githubUser, isLoggedIn, sudahLogin, loginOpen]);

  const handleGitHubToken = useCallback(async (token) => {
    if (!token) return;
    try {
      const user = await fetchGitHubUser(token);
      setGithubUser(user);
      const events = await fetchUserEvents(token, user.login);
      setGithubEvents(events);
    } catch (error) {
      logError("gagal memuat data GitHub", error);
      setGithubUser(null);
      setGithubEvents([]);
    }
  }, []);

  // GitHub OAuth: cek kode dari redirect dan muat data jika token ada
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const tokenLocal = safeReadLocalStorage(
      KEY_GITHUB_TOKEN,
      "membaca token GitHub"
    );

    if (tokenLocal) {
      void handleGitHubToken(tokenLocal);
      return;
    }

    if (!code) return;

    exchangeCodeForToken(code)
      .then((token) => {
        if (!token) return;
        safeWriteLocalStorage(KEY_GITHUB_TOKEN, token, "menyimpan token GitHub");
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("code");
          window.history.replaceState({}, "", url.toString());
        } catch (error) {
          logError("gagal membersihkan parameter kode GitHub", error);
        }
        void handleGitHubToken(token);
      })
      .catch((error) => {
        logError("gagal menukar kode GitHub menjadi token", error);
      });
  }, [handleGitHubToken]);

  const refreshGithubEvents = useCallback(async () => {
    if (!githubUser) return;
    const token = safeReadLocalStorage(
      KEY_GITHUB_TOKEN,
      "memuat token GitHub untuk refresh"
    );
    if (!token) return;
    try {
      const events = await fetchUserEvents(token, githubUser.login);
      setGithubEvents(events);
    } catch (error) {
      logError("gagal memperbarui aktivitas GitHub", error);
    }
  }, [githubUser]);

  useEffect(() => {
    if (!githubUser) return;
    void refreshGithubEvents();
    const id = setInterval(() => {
      void refreshGithubEvents();
    }, 60000);
    return () => clearInterval(id);
  }, [githubUser, refreshGithubEvents]);

  /* ===================================================================
   *  2) Pengaturan & Periode Aktif
   * =================================================================== */
  const [pengaturanTimer, setPengaturanTimer] = useState(DEFAULT_PENGATURAN);
  const [periodeAktif, setPeriodeAktif] = useState("work");

  useEffect(() => {
    const rawCfg = safeReadLocalStorage(
      KEY_PENGATURAN,
      "memuat pengaturan timer"
    );
    const cfg = safeParseJSON(rawCfg, null, "memuat pengaturan timer");
    if (cfg && typeof cfg === "object") {
      setPengaturanTimer((prev) => ({ ...prev, ...cfg }));
    }

    const periodeTersimpan = safeReadLocalStorage(
      KEY_PERIODE,
      "memuat periode aktif"
    );
    if (["work", "short", "long"].includes(periodeTersimpan || "")) {
      setPeriodeAktif(periodeTersimpan);
    }
  }, []);

  useEffect(() => {
    try {
      const json = JSON.stringify(pengaturanTimer);
      safeWriteLocalStorage(
        KEY_PENGATURAN,
        json,
        "menyimpan pengaturan timer"
      );
    } catch (error) {
      logError("gagal menyerialisasi pengaturan timer", error);
    }
  }, [pengaturanTimer]);

  useEffect(() => {
    safeWriteLocalStorage(
      KEY_PERIODE,
      String(periodeAktif),
      "menyimpan periode aktif"
    );
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
    const raw = safeReadLocalStorage(
      KEY_STATS_TOTAL,
      "memuat statistik ringkas"
    );
    const data = safeParseJSON(raw, null, "memuat statistik ringkas");
    if (!data || typeof data !== "object") return;
    setStatRingkas({
      totalTime: Number(data.totalMenit || 0),
      timeStudied: Number(data.menitFokus || 0),
      timeOnBreak: Number(data.menitIstirahat || 0),
    });
  }, []);

  const catatMenitSesi = useCallback(
    async ({
      fokusMenit = 0,
      istirahatMenit = 0,
      totalMenit = 0,
      periodeSelesai = "",
    }) => {
      const total = Number(totalMenit || 0);
      const fokus = Number(fokusMenit || 0);
      const istirahat = Number(istirahatMenit || 0);

      setStatRingkas((prev) => ({
        totalTime: (prev.totalTime || 0) + total,
        timeStudied: (prev.timeStudied || 0) + fokus,
        timeOnBreak: (prev.timeOnBreak || 0) + istirahat,
      }));

      const raw = safeReadLocalStorage(
        KEY_STATS_TOTAL,
        "membaca statistik ringkas"
      );
      const parsedStats = safeParseJSON(
        raw,
        null,
        "membaca statistik ringkas"
      );
      const sebelumnya =
        parsedStats && typeof parsedStats === "object"
          ? parsedStats
          : {
              totalMenit: 0,
              menitFokus: 0,
              menitIstirahat: 0,
            };

      const agregat = {
        totalMenit: Number(sebelumnya.totalMenit || 0) + total,
        menitFokus: Number(sebelumnya.menitFokus || 0) + fokus,
        menitIstirahat: Number(sebelumnya.menitIstirahat || 0) + istirahat,
      };

      try {
        safeWriteLocalStorage(
          KEY_STATS_TOTAL,
          JSON.stringify(agregat),
          "menyimpan statistik ringkas"
        );
      } catch (error) {
        logError("gagal menyerialisasi statistik ringkas", error);
      }

      if (!sudahLogin || !idPengguna) {
        return;
      }

      try {
        const tanggal = formatTanggal();
        await setDoc(
          doc(db, "users", idPengguna, "statistik", "agregat"),
          {
            totalMenit: increment(total),
            menitFokus: increment(fokus),
            menitIstirahat: increment(istirahat),
            diperbaruiPada: new Date(),
            terakhirPeriode: String(periodeSelesai || ""),
          },
          { merge: true }
        );
        await setDoc(
          doc(db, "users", idPengguna, "statistik", "harian", tanggal),
          {
            totalMenit: increment(total),
            menitFokus: increment(fokus),
            menitIstirahat: increment(istirahat),
            tanggal,
            diperbaruiPada: new Date(),
          },
          { merge: true }
        );
      } catch (error) {
        logError("gagal menyimpan statistik ke Firestore", error);
      }
    },
    [idPengguna, sudahLogin]
  );

  /* ===================================================================
   *  4) Wallpaper
   * =================================================================== */
  const [wallpaperSrc, setWallpaperSrc] = useState(DEFAULT_WALLPAPER);
  const [wallpaperIdx, setWallpaperIdx] = useState(0);

  useEffect(() => {
    const stored = safeReadLocalStorage(
      KEY_WALLPAPER,
      "memuat wallpaper"
    );
    if (!stored) return;
    setWallpaperSrc(stored);
    const idx = WALLPAPERS.findIndex((nama) => stored.endsWith(nama));
    if (idx >= 0) {
      setWallpaperIdx(idx);
    }
  }, []);

  const gantiWallpaper = useCallback(() => {
    setWallpaperIdx((current) => {
      const next = (current + 1) % WALLPAPERS.length;
      const nama = WALLPAPERS[next];
      const src = buildWallpaperSrc(nama);
      setWallpaperSrc(src);
      safeWriteLocalStorage(KEY_WALLPAPER, src, "menyimpan wallpaper");
      return next;
    });
  }, []);

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
