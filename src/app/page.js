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

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, increment, setDoc } from "firebase/firestore";
import Dashboard from "./components/Timer/Dashboard";
import Timer from "./components/Timer/Timer";
import Modal from "./components/Timer/Modal";
import SettingsForm from "./components/Timer/SettingsForm";
import LoginRegisterForm from "./components/Timer/LoginRegisterForm";
import LocationWidget from "./components/Timer/LocationWidget";
import Footer from "./components/Timer/Footer";
import Wallpaper from "./components/Music/Wallpaper";
import { useToast } from "./components/ui/useToast";
import {
  exchangeCodeForToken,
  fetchGitHubUser,
  fetchUserEvents,
} from "./github";
import { auth, db } from "./firebase";

const SITE_URL = "https://pomo-pixel.vercel.app";

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
    logError(
      `gagal membaca localStorage untuk ${key}${context ? ` (${context})` : ""}`,
      error,
    );
    return null;
  }
};

const safeWriteLocalStorage = (key, value, context) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    logError(
      `gagal menyimpan localStorage untuk ${key}${context ? ` (${context})` : ""}`,
      error,
    );
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

const MusicPlayer = dynamic(() => import("./components/Music/MusicPlayer"), {
  ssr: false,
});

const UserStatistics = dynamic(
  () => import("./components/Timer/UserStatistics"),
  { ssr: false },
);

const GithubStats = dynamic(() => import("./components/Timer/GithubStats"), {
  ssr: false,
});

export default function Page() {
  const { toast } = useToast();
  const hasShownFirstTimerToast = useRef(false);
  const hasShownShareToast = useRef(false);
  /* ===================================================================
   *  1) Status Login Firebase & GitHub
   * =================================================================== */
  const [googleUser, setGoogleUser] = useState(null);
  const [idPengguna, setIdPengguna] = useState(null);
  const [bukaStatistik, setBukaStatistik] = useState(false);
  const [bukaGithubStats, setBukaGithubStats] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [githubUser, setGithubUser] = useState(null);
  const [githubEvents, setGithubEvents] = useState([]);
  const [displayNameSource, setDisplayNameSource] = useState("google");
  const [showEntryScreen, setShowEntryScreen] = useState(false);
  const [entryHydrated, setEntryHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("lp_preferensi_v1");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (
        data &&
        (data.displayNameSource === "google" ||
          data.displayNameSource === "github")
      ) {
        setDisplayNameSource(data.displayNameSource);
      }
    } catch (error) {
      logError("gagal membaca preferensi display name", error);
    }
  }, []);

  useEffect(() => {
    const started = safeReadLocalStorage("pomo_started", "memuat status awal");
    setShowEntryScreen(started !== "true");
    setEntryHydrated(true);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      try {
        setGoogleUser(
          user
            ? {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
              }
            : null,
        );
        setIdPengguna(user ? user.uid || null : null);
      } catch (error) {
        logError("gagal memperbarui status login", error);
      }
    });
    return () => unsub();
  }, []);

  const displayName = useMemo(() => {
    const googleName =
      googleUser &&
      (googleUser.displayName || googleUser.email || googleUser.uid);
    const githubName = githubUser && (githubUser.name || githubUser.login);

    if (displayNameSource === "google") {
      return googleName || githubName || null;
    }
    if (displayNameSource === "github") {
      return githubName || googleName || null;
    }
    return googleName || githubName || null;
  }, [displayNameSource, githubUser, googleUser]);

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
      "membaca token GitHub",
    );

    if (tokenLocal) {
      void handleGitHubToken(tokenLocal);
      return;
    }

    if (!code) return;

    exchangeCodeForToken(code)
      .then((token) => {
        if (!token) return;
        safeWriteLocalStorage(
          KEY_GITHUB_TOKEN,
          token,
          "menyimpan token GitHub",
        );
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
      "memuat token GitHub untuk refresh",
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
      "memuat pengaturan timer",
    );
    const cfg = safeParseJSON(rawCfg, null, "memuat pengaturan timer");
    if (cfg && typeof cfg === "object") {
      setPengaturanTimer((prev) => ({ ...prev, ...cfg }));
    }

    const periodeTersimpan = safeReadLocalStorage(
      KEY_PERIODE,
      "memuat periode aktif",
    );
    if (["work", "short", "long"].includes(periodeTersimpan || "")) {
      setPeriodeAktif(periodeTersimpan);
    }
  }, []);

  useEffect(() => {
    try {
      const json = JSON.stringify(pengaturanTimer);
      safeWriteLocalStorage(KEY_PENGATURAN, json, "menyimpan pengaturan timer");
    } catch (error) {
      logError("gagal menyerialisasi pengaturan timer", error);
    }
  }, [pengaturanTimer]);

  useEffect(() => {
    safeWriteLocalStorage(
      KEY_PERIODE,
      String(periodeAktif),
      "menyimpan periode aktif",
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
      "memuat statistik ringkas",
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

      if (periodeSelesai === "work" && !hasShownShareToast.current) {
        hasShownShareToast.current = true;
        toast({
          title: "Nice work. Share your focus streak.",
        });
      }

      const raw = safeReadLocalStorage(
        KEY_STATS_TOTAL,
        "membaca statistik ringkas",
      );
      const parsedStats = safeParseJSON(raw, null, "membaca statistik ringkas");
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
          "menyimpan statistik ringkas",
        );
      } catch (error) {
        logError("gagal menyerialisasi statistik ringkas", error);
      }

      if (!googleUser || !idPengguna) {
        return;
      }

      try {
        const tanggal = formatTanggal();
        // Struktur Firestore:
        // - users/{uid}/statistik/agregat (total semua waktu)
        // - users/{uid}/statistik_harian/{YYYY-MM-DD} (data per hari)
        await setDoc(
          doc(db, "users", idPengguna, "statistik", "agregat"),
          {
            totalMenit: increment(total),
            menitFokus: increment(fokus),
            menitIstirahat: increment(istirahat),
            diperbaruiPada: new Date(),
            terakhirPeriode: String(periodeSelesai || ""),
          },
          { merge: true },
        );
        await setDoc(
          doc(db, "users", idPengguna, "statistik_harian", tanggal),
          {
            totalMenit: increment(total),
            menitFokus: increment(fokus),
            menitIstirahat: increment(istirahat),
            tanggal,
            diperbaruiPada: new Date(),
          },
          { merge: true },
        );
      } catch (error) {
        logError("gagal menyimpan statistik ke Firestore", error);
      }
    },
    [idPengguna, googleUser, toast],
  );

  /* ===================================================================
   *  4) Wallpaper
   * =================================================================== */
  const [wallpaperSrc, setWallpaperSrc] = useState(DEFAULT_WALLPAPER);
  const [wallpaperIdx, setWallpaperIdx] = useState(0);
  const preloadRef = useRef(null);

  useEffect(() => {
    const stored = safeReadLocalStorage(KEY_WALLPAPER, "memuat wallpaper");
    if (!stored) return;
    setWallpaperSrc(stored);
    const idx = WALLPAPERS.findIndex((nama) => stored.endsWith(nama));
    if (idx >= 0) {
      setWallpaperIdx(idx);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = (wallpaperIdx + 1) % WALLPAPERS.length;
    const nextSrc = buildWallpaperSrc(WALLPAPERS[next]);
    const img = new window.Image();
    img.src = nextSrc;
    preloadRef.current = img;
    return () => {
      if (preloadRef.current) {
        preloadRef.current.onload = null;
        preloadRef.current.onerror = null;
        preloadRef.current = null;
      }
    };
  }, [wallpaperIdx]);

  const gantiWallpaper = useCallback(() => {
    const next = (wallpaperIdx + 1) % WALLPAPERS.length;
    const nama = WALLPAPERS[next];
    const src = buildWallpaperSrc(nama);

    if (typeof window === "undefined") {
      setWallpaperSrc(src);
      setWallpaperIdx(next);
      safeWriteLocalStorage(KEY_WALLPAPER, src, "menyimpan wallpaper");
      return;
    }

    if (preloadRef.current) {
      preloadRef.current.onload = null;
      preloadRef.current.onerror = null;
      preloadRef.current = null;
    }

    const img = new window.Image();
    preloadRef.current = img;
    img.onload = () => {
      setWallpaperSrc(src);
      setWallpaperIdx(next);
      safeWriteLocalStorage(KEY_WALLPAPER, src, "menyimpan wallpaper");
      preloadRef.current = null;
    };
    img.onerror = (error) => {
      console.error("Gagal preload wallpaper:", src, error);
      setWallpaperSrc(src);
      setWallpaperIdx(next);
      safeWriteLocalStorage(KEY_WALLPAPER, src, "menyimpan wallpaper");
      preloadRef.current = null;
    };
    img.src = src;
  }, [wallpaperIdx]);

  const handleStartFocus = useCallback(() => {
    safeWriteLocalStorage("pomo_started", "true", "menyimpan status awal");
    setShowEntryScreen(false);
    toast({ title: "Focus mode started" });
  }, [toast]);

  const handleTimerStart = useCallback(() => {
    if (hasShownFirstTimerToast.current) return;
    hasShownFirstTimerToast.current = true;
    toast({
      title: "Stay focused. You're doing great.",
    });
  }, [toast]);

  const handleShare = useCallback(async () => {
    const shareText =
      "Pomo Pixel is an aesthetic pomodoro timer with lofi music for focus and productivity.";

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Pomo Pixel",
          text: shareText,
          url: SITE_URL,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(SITE_URL);
        toast({
          title: "Link copied",
          description: "Pomo Pixel URL copied to clipboard.",
          variant: "success",
        });
        return;
      }
      throw new Error("Clipboard API tidak tersedia");
    } catch (error) {
      logError("gagal membagikan tautan", error);
      toast({
        title: "Share failed",
        description: "Could not copy the site link.",
        variant: "error",
      });
    }
  }, [toast]);

  /* ===================================================================
   *  5) Modal Pengaturan
   * =================================================================== */
  const [bukaPengaturan, setBukaPengaturan] = useState(false);

  /* ===================================================================
   *  6) Info login untuk anak
   * =================================================================== */
  const infoLogin = useMemo(
    () => ({
      loggedIn: Boolean(googleUser),
      userId: idPengguna,
      githubUser,
      githubEvents,
    }),
    [googleUser, idPengguna, githubUser, githubEvents],
  );

  /* ===================================================================
   *  7) Render
   * =================================================================== */
  return (
    <main className="halaman-utama" id="top">
      <section className="visually-hidden" aria-label="Pomo Pixel overview">
        <h1>
          Pomo Pixel is an aesthetic pomodoro timer with lofi music and focus
          stats
        </h1>
        <p>
          Use this minimalist productivity timer for deep work, study sessions,
          and distraction-free planning with a built-in lofi focus timer.
        </p>
      </section>

      {/* Wallpaper */}
      <Wallpaper src={wallpaperSrc} alt="latar pixel" />

      {entryHydrated && showEntryScreen ? (
        <section className="entry-screen" aria-label="Mulai fokus" id="hero">
          <div className="entry-screen__panel">
            <p className="entry-screen__eyebrow">Aesthetic pomodoro</p>
            <h2 className="entry-screen__title">
              Focus deeper with a calm, aesthetic pomodoro timer built for real
              productivity.
            </h2>
            <p className="entry-screen__subtitle">
              Lofi ambience, simple sessions, and clean focus tools help you
              get into flow faster.
            </p>
            <div className="entry-screen__actions">
              <button
                type="button"
                className="pixel-btn entry-screen__cta"
                onClick={handleStartFocus}
              >
                Start Focus Now
              </button>
              <button
                type="button"
                className="pixel-btn entry-screen__cta"
                onClick={handleShare}
              >
                Share
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Tabs Sesi kiri-atas */}
      <div className="area-kiri-atas" id="sessions">
        <Dashboard
          periodeAktif={periodeAktif}
          setPeriodeAktif={setPeriodeAktif}
        />
      </div>

      {/* Tombol kanan-atas: akun + pengaturan + statistik + status */}
      <div className="area-kanan-atas" id="controls">
        {/* status login */}

        {/* lokasi: waktu atau cuaca */}
        <LocationWidget mode={pengaturanTimer.locMode} />

        {/* githubstats */}
        {githubUser ? (
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
        ) : null}

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
        {!(googleUser && githubUser) && (
          <button
            className="account-button"
            onClick={() => setLoginOpen(true)}
            aria-label="login"
          >
            <User size={20} color="#ffffff" strokeWidth={2.25} />
          </button>
        )}
        <div className="Db__status">
          <span
            className={`Db__dot ${
              googleUser || githubUser ? "is-on" : "is-off"
            }`}
            aria-label={googleUser || githubUser ? "login" : "offline"}
          />
          <span className="Db__status-teks">
            {displayName ? `halo, ${displayName}` : "offline"}
          </span>
        </div>
      </div>

      {/* Timer */}
      <section id="timer" aria-label="Pomodoro timer">
        <Timer
          workLen={pengaturanTimer.workLen}
          shortBreakLen={pengaturanTimer.shortBreakLen}
          longBreakLen={pengaturanTimer.longBreakLen}
          longBrInterval={pengaturanTimer.longBrInterval}
          volume={pengaturanTimer.volume}
          currentPeriod={periodeAktif}
          setCurrentPeriod={setPeriodeAktif}
          onCatatMenit={catatMenitSesi}
          onMulai={handleTimerStart}
        />
      </section>

      {/* Statistik */}
      <Modal
        buka={bukaStatistik}
        tutup={() => setBukaStatistik(false)}
        lebar="lg"
      >
        {bukaStatistik ? (
          <UserStatistics
            loggedIn={infoLogin.loggedIn}
            userId={infoLogin.userId}
            totalTime={statRingkas.totalTime}
            timeStudied={statRingkas.timeStudied}
            timeOnBreak={statRingkas.timeOnBreak}
          />
        ) : null}
      </Modal>

      {/* Music Player */}
      <div className="area-music-bawah" id="music">
        <MusicPlayer
          namaWallpaper={WALLPAPERS[wallpaperIdx].replace(/\..+$/, "")}
          onGantiWallpaper={gantiWallpaper}
        />
      </div>

      <Footer />

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
          googleUser={googleUser}
          githubUser={githubUser}
          displayNameSource={displayNameSource}
          onDisplayNameSourceChange={(value) => {
            if (value === "google" || value === "github") {
              setDisplayNameSource(value);
            }
          }}
          onLogoutGitHub={() => {
            setGithubUser(null);
            setGithubEvents([]);
          }}
        />
      </Modal>

      {/* Modal login/register */}
      <Modal buka={loginOpen} tutup={() => setLoginOpen(false)} lebar="lg">
        <LoginRegisterForm
          googleUser={googleUser}
          githubUser={githubUser}
          onClose={() => setLoginOpen(false)}
        />
      </Modal>

      {/* GitHub Stats Modal */}
      <Modal
        buka={bukaGithubStats}
        tutup={() => setBukaGithubStats(false)}
        lebar="lg"
      >
        {bukaGithubStats && githubUser ? (
          <GithubStats
            githubUser={infoLogin.githubUser}
            githubEvents={infoLogin.githubEvents}
          />
        ) : null}
      </Modal>
    </main>
  );
}
