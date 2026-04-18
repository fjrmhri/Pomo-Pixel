import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { logoutGitHub } from "../../github";

function SettingsForm({ googleUser, githubUser }) {
  const handleLogoutGoogle = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Error signing out:", e);
    }
  };

  const handleLogoutGitHub = () => {
    try {
      logoutGitHub();
    } catch (e) {
      console.error("Error logging out GitHub:", e);
    }
  };

  return (
    <div className="pixel-card p-4 max-w-md mx-auto">
      <h3 className="Sf__section-title">Pengaturan</h3>
      <div className="mt-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>Google</div>
            <div>
              {googleUser ? (
                <button onClick={handleLogoutGoogle} className="Sf__btn Sf__btn--danger">
                  Logout Google
                </button>
              ) : (
                <div className="text-xs">Not connected</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>GitHub</div>
            <div>
              {githubUser ? (
                <button onClick={handleLogoutGitHub} className="Sf__btn Sf__btn--danger">
                  Logout GitHub
                </button>
              ) : (
                <div className="text-xs">Not connected</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsForm;
  onLogoutGitHub,
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
    longBrInterval || 4,
  );
  const [nilaiVolume, setNilaiVolume] = useState(volume ?? 80);
  const [nilaiLocMode, setNilaiLocMode] = useState(locMode || "time");
  const [nilaiDisplayNameSource, setNilaiDisplayNameSource] = useState(
    displayNameSource === "github" ? "github" : "google",
  );

  // user login saat ini
  const [uidAktif, setUidAktif] = useState(userId || null);

  // ref audio untuk preview bunyi
  const refSfx = useRef(null);

  // ---------- ambil UID login (kalau userId belum diberikan) ----------
  useEffect(() => {
    if (displayNameSource === "google" || displayNameSource === "github") {
      setNilaiDisplayNameSource(displayNameSource);
    }
  }, [displayNameSource]);

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
            doc(db, NAMA_KOLEKSI, uidAktif, NAMA_DOKUMEN_PREFERENSI, "app"),
          );
          if (d.exists()) {
            const v = d.data() || {};
            // gunakan fallback agar tidak undefined
            setNilaiWork(Number(v.workLen ?? nilaiWork));
            setNilaiShort(Number(v.shortBreakLen ?? nilaiShort));
            setNilaiLong(Number(v.longBreakLen ?? nilaiLong));
            setNilaiIntervalLong(Number(v.longBrInterval ?? nilaiIntervalLong));
            setNilaiVolume(Number(v.volume ?? nilaiVolume));
            setNilaiLocMode(String(v.locMode ?? nilaiLocMode));
            setNilaiDisplayNameSource(
              v.displayNameSource === "github" ? "github" : "google",
            );
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
            setNilaiLocMode(String(v.locMode ?? nilaiLocMode));
            setNilaiDisplayNameSource(
              v.displayNameSource === "github" ? "github" : "google",
            );
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
      const preferensi = {
        workLen: Number(nilaiWork),
        shortBreakLen: Number(nilaiShort),
        longBreakLen: Number(nilaiLong),
        longBrInterval: Number(nilaiIntervalLong),
        volume: Number(nilaiVolume),
        locMode: String(nilaiLocMode),
        displayNameSource: String(nilaiDisplayNameSource),
      };

      // Simpan ke localStorage juga wajib
      localStorage.setItem("lp_preferensi_v1", JSON.stringify(preferensi));

      if (uidAktif) {
        // Simpan ke Firestore
        await setDoc(
          doc(db, NAMA_KOLEKSI, uidAktif, NAMA_DOKUMEN_PREFERENSI, "app"),
          {
            ...preferensi,
            z: Date.now(), // timestamp sederhana untuk troubleshooting
          },
          { merge: true },
        );
      }

      // Commit ke state parent agar Timer langsung ter-update
      setWorkLen?.(Number(nilaiWork));
      setShortBreakLen?.(Number(nilaiShort));
      setLongBreakLen?.(Number(nilaiLong));
      setLongBrInterval?.(Number(nilaiIntervalLong));
      setVolume?.(Number(nilaiVolume));
      setLocMode?.(String(nilaiLocMode));

      setPesanSukses("Pengaturan berhasil disimpan.");
      onDisplayNameSourceChange?.(String(nilaiDisplayNameSource));
    } catch (e) {
      console.error(e);
      setPesanError(
        "Gagal menyimpan pengaturan. Periksa koneksi dan coba lagi.",
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
    setNilaiLocMode("time");
    setPesanSukses("");
    setPesanError("");
  };

  // ---------- reset posisi draggable ----------
  const resetPosisiTimer = () => {
    try {
      setTimerPosition?.({ x: 0, y: 0 });
      setPesanSukses("Posisi Timer direset.");
    } catch (error) {
      console.error("SettingsForm: gagal mereset posisi Timer:", error);
      setPesanError("Gagal mereset posisi Timer (fungsi tidak tersedia).");
    }
  };

  const resetPosisiStatistik = () => {
    try {
      setStatsPosition?.({ x: 0, y: 0 });
      setPesanSukses("Posisi Statistik direset.");
    } catch (error) {
      console.error("SettingsForm: gagal mereset posisi Statistik:", error);
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
        1,
      );
      refSfx.current.play().catch((error) => {
        console.warn(
          "SettingsForm: browser menolak memutar bunyi percobaan:",
          error,
        );
      });
    } catch (e) {
      console.error(e);
      setPesanError("Tidak dapat memutar bunyi percobaan.");
    }
  };

  // ---------- isi form ----------
  return (
    <div className={`Sf pixel-card pixel-card--borderless ${className}`}>
      <form className="Sf__inner" onSubmit={simpanPreferensi}>
        {/* Header */}
        <div className="Sf__section-title">Pengaturan Pomodoro</div>

        <div className="Sf__grid">
          <div className="Sf__group">
            <label className="Sf__label">Durasi Fokus (Menit)</label>
            <input
              className="Sf__number"
              type="number"
              value={nilaiWork}
              onChange={(e) => setNilaiWork(e.target.value)}
              min="1"
              max="600"
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label">
              Durasi Istirahat Singkat (Menit)
            </label>
            <input
              className="Sf__number"
              type="number"
              value={nilaiShort}
              onChange={(e) => setNilaiShort(e.target.value)}
              min="1"
              max="600"
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label">
              Durasi Istirahat Panjang (Menit)
            </label>
            <input
              className="Sf__number"
              type="number"
              value={nilaiLong}
              onChange={(e) => setNilaiLong(e.target.value)}
              min="1"
              max="600"
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label">Interval Long Break</label>
            <input
              className="Sf__number"
              type="number"
              value={nilaiIntervalLong}
              onChange={(e) => setNilaiIntervalLong(e.target.value)}
              min="2"
              max="12"
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label">Volume Notifikasi</label>
            <input
              className="Sf__range"
              type="range"
              min="0"
              max="100"
              value={nilaiVolume}
              onChange={(e) => setNilaiVolume(e.target.value)}
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label">Info</label>
            <select
              className="Sf__select"
              value={nilaiLocMode}
              onChange={(e) => setNilaiLocMode(e.target.value)}
            >
              <option value="time">Waktu Real-Time</option>
              <option value="weather">Cuaca</option>
            </select>
          </div>
          <div className="Sf__group">
            <label className="Sf__label">Nama yang ditampilkan</label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <label>
                <input
                  type="radio"
                  name="displayNameSource"
                  value="google"
                  checked={nilaiDisplayNameSource === "google"}
                  onChange={() => setNilaiDisplayNameSource("google")}
                />{" "}
                Gunakan nama Google
              </label>
              <label>
                <input
                  type="radio"
                  name="displayNameSource"
                  value="github"
                  checked={nilaiDisplayNameSource === "github"}
                  onChange={() => setNilaiDisplayNameSource("github")}
                />{" "}
                Gunakan nama GitHub
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="Sf__actions">
          <button className="Sf__btn" type="button" onClick={resetKeBawaan}>
            Reset
          </button>
          <button
            className="Sf__btn Sf__btn--primary"
            type="submit"
            disabled={sedangSimpan}
          >
            {sedangSimpan ? "Menyimpan..." : "Simpan"}
          </button>
          <button
            className="Sf__btn Sf__btn--secondary"
            type="button"
            onClick={async () => {
              if (googleUser) {
                try {
                  await signOut(auth);
                } catch (error) {
                  console.error("SettingsForm: gagal logout Firebase:", error);
                }
                return;
              }
              if (githubUser) {
                try {
                  logoutGitHub();
                  onLogoutGitHub?.();
                } catch (error) {
                  console.error("SettingsForm: gagal logout GitHub:", error);
                }
              }
            }}
          >
            {googleUser
              ? "Log Out Google"
              : githubUser
                ? "Log Out GitHub"
                : "Log Out"}
          </button>
        </div>

        {pesanError && <div className="Sf__error">{pesanError}</div>}
        {pesanSukses && <div className="Sf__success">{pesanSukses}</div>}
      </form>
    </div>
  );
}
