import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { logoutGitHub } from "../../github";
import { useToast } from "../ui/useToast";

const NAMA_KOLEKSI = "users";
const NAMA_DOKUMEN_PREFERENSI = "preferensi";

function SettingsForm({
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
  locMode,
  setLocMode,
  userId,
  googleUser,
  githubUser,
  displayNameSource,
  onDisplayNameSourceChange,
  onLogoutGitHub,
  className = "",
}) {
  const { toast } = useToast();
  const [sedangSimpan, setSedangSimpan] = useState(false);

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

  const [uidAktif, setUidAktif] = useState(userId || null);

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

  useEffect(() => {
    const muatPreferensi = async () => {
      try {
        if (uidAktif) {
          const d = await getDoc(
            doc(db, NAMA_KOLEKSI, uidAktif, NAMA_DOKUMEN_PREFERENSI, "app"),
          );
          if (d.exists()) {
            const v = d.data() || {};
            setNilaiWork(Number(v.workLen ?? 25));
            setNilaiShort(Number(v.shortBreakLen ?? 5));
            setNilaiLong(Number(v.longBreakLen ?? 15));
            setNilaiIntervalLong(Number(v.longBrInterval ?? 4));
            setNilaiVolume(Number(v.volume ?? 80));
            setNilaiLocMode(String(v.locMode ?? "time"));
            setNilaiDisplayNameSource(
              v.displayNameSource === "github" ? "github" : "google",
            );
          }
        } else {
          const raw = localStorage.getItem("lp_preferensi_v1");
          if (raw) {
            const v = JSON.parse(raw);
            setNilaiWork(Number(v.workLen ?? 25));
            setNilaiShort(Number(v.shortBreakLen ?? 5));
            setNilaiLong(Number(v.longBreakLen ?? 15));
            setNilaiIntervalLong(Number(v.longBrInterval ?? 4));
            setNilaiVolume(Number(v.volume ?? 80));
            setNilaiLocMode(String(v.locMode ?? "time"));
            setNilaiDisplayNameSource(
              v.displayNameSource === "github" ? "github" : "google",
            );
          }
        }
      } catch (e) {
        console.error(e);
        toast({
          title: "Preferensi gagal dimuat",
          description: "Nilai default tetap dipakai.",
          variant: "error",
        });
      }
    };
    muatPreferensi();
  }, [toast, uidAktif]);

  const validasi = () => {
    const e = [];
    const isInt = (n) => Number.isInteger(Number(n));
    const inRange = (n, a, b) => Number(n) >= a && Number(n) <= b;

    if (!isInt(nilaiWork) || !inRange(nilaiWork, 1, 600))
      e.push("Durasi fokus harus 1–600 menit.");
    if (!isInt(nilaiShort) || !inRange(nilaiShort, 1, 600))
      e.push("Durasi istirahat singkat harus 1–600 menit.");
    if (!isInt(nilaiLong) || !inRange(nilaiLong, 1, 600))
      e.push("Durasi istirahat panjang harus 1–600 menit.");

    if (!isInt(nilaiIntervalLong) || !inRange(nilaiIntervalLong, 2, 12))
      e.push("Interval long break harus 2–12.");

    if (!isInt(nilaiVolume) || !inRange(nilaiVolume, 0, 100))
      e.push("Volume harus 0–100.");

    if (e.length > 0) {
      toast({
        title: "Validasi gagal",
        description: e.join(" "),
        variant: "error",
      });
      return false;
    }
    return true;
  };

  const simpanPreferensi = async (ev) => {
    ev?.preventDefault?.();
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

      localStorage.setItem("lp_preferensi_v1", JSON.stringify(preferensi));

      if (uidAktif) {
        await setDoc(
          doc(db, NAMA_KOLEKSI, uidAktif, NAMA_DOKUMEN_PREFERENSI, "app"),
          {
            ...preferensi,
            z: Date.now(),
          },
          { merge: true },
        );
      }

      setWorkLen?.(Number(nilaiWork));
      setShortBreakLen?.(Number(nilaiShort));
      setLongBreakLen?.(Number(nilaiLong));
      setLongBrInterval?.(Number(nilaiIntervalLong));
      setVolume?.(Number(nilaiVolume));
      setLocMode?.(String(nilaiLocMode));

      onDisplayNameSourceChange?.(String(nilaiDisplayNameSource));
      toast({ title: "Pengaturan disimpan", variant: "success" });
    } catch (e) {
      console.error(e);
      toast({
        title: "Pengaturan gagal disimpan",
        description: "Periksa koneksi lalu coba lagi.",
        variant: "error",
      });
    } finally {
      setSedangSimpan(false);
    }
  };

  const resetKeBawaan = () => {
    setNilaiWork(25);
    setNilaiShort(5);
    setNilaiLong(15);
    setNilaiIntervalLong(4);
    setNilaiVolume(80);
    setNilaiLocMode("time");
    setNilaiDisplayNameSource("google");
    toast({ title: "Pengaturan direset" });
  };

  return (
    <div className={`Sf pixel-card pixel-card--borderless ${className}`}>
      <form className="Sf__inner" onSubmit={simpanPreferensi}>
        <div className="Sf__section-title">Pengaturan Pomodoro</div>

        <div className="Sf__grid">
          <div className="Sf__group">
            <label className="Sf__label">Durasi Fokus</label>
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
            <label className="Sf__label">Durasi Istirahat Singkat</label>
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
            <label className="Sf__label">Durasi Istirahat Panjang</label>
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
            <label className="Sf__label">Interval Istirahat Panjang</label>
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
            <label className="Sf__label">Nama yang Ditampilkan</label>
            <select
              className="Sf__select"
              value={nilaiDisplayNameSource}
              onChange={(e) => setNilaiDisplayNameSource(e.target.value)}
            >
              <option value="google">Google</option>
              <option value="github">GitHub</option>
            </select>
          </div>
        </div>

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
                  toast({
                    title: "Berhasil logout Google",
                    variant: "success",
                  });
                } catch (error) {
                  console.error("SettingsForm: gagal logout Firebase:", error);
                  toast({
                    title: "Logout Google gagal",
                    variant: "error",
                  });
                }
                return;
              }
              if (githubUser) {
                try {
                  logoutGitHub();
                  onLogoutGitHub?.();
                  toast({
                    title: "Berhasil logout GitHub",
                    variant: "success",
                  });
                } catch (error) {
                  console.error("SettingsForm: gagal logout GitHub:", error);
                  toast({
                    title: "Logout GitHub gagal",
                    variant: "error",
                  });
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
      </form>
    </div>
  );
}

export default SettingsForm;
