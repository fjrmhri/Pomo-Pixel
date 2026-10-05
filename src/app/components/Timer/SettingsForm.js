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
          title: "Could not load preferences",
          description: "Default values are used.",
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
      e.push("Focus duration must be 1–600 minutes.");
    if (!isInt(nilaiShort) || !inRange(nilaiShort, 1, 600))
      e.push("Short break must be 1–600 minutes.");
    if (!isInt(nilaiLong) || !inRange(nilaiLong, 1, 600))
      e.push("Long break must be 1–600 minutes.");

    if (!isInt(nilaiIntervalLong) || !inRange(nilaiIntervalLong, 2, 12))
      e.push("Long break interval must be 2–12.");

    if (!isInt(nilaiVolume) || !inRange(nilaiVolume, 0, 100))
      e.push("Volume must be 0–100.");

    if (e.length > 0) {
      toast({
        title: "Please check your settings",
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
      toast({ title: "Settings saved", variant: "success" });
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not save settings",
        description: "Check your connection and try again.",
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
    toast({ title: "Settings reset to defaults" });
  };

  return (
    <div className={`Sf ${className}`}>
      <form className="Sf__inner" onSubmit={simpanPreferensi}>
        <div className="Sf__grid">
          <div className="Sf__group">
            <label className="Sf__label" htmlFor="sf-fokus">
              Focus (min)
            </label>
            <input
              id="sf-fokus"
              className="ui-input Sf__number"
              type="number"
              value={nilaiWork}
              onChange={(e) => setNilaiWork(e.target.value)}
              min="1"
              max="600"
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label" htmlFor="sf-istirahat-singkat">
              Short break (min)
            </label>
            <input
              id="sf-istirahat-singkat"
              className="ui-input Sf__number"
              type="number"
              value={nilaiShort}
              onChange={(e) => setNilaiShort(e.target.value)}
              min="1"
              max="600"
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label" htmlFor="sf-istirahat-panjang">
              Long break (min)
            </label>
            <input
              id="sf-istirahat-panjang"
              className="ui-input Sf__number"
              type="number"
              value={nilaiLong}
              onChange={(e) => setNilaiLong(e.target.value)}
              min="1"
              max="600"
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label" htmlFor="sf-interval">
              Long break every (sessions)
            </label>
            <input
              id="sf-interval"
              className="ui-input Sf__number"
              type="number"
              value={nilaiIntervalLong}
              onChange={(e) => setNilaiIntervalLong(e.target.value)}
              min="2"
              max="12"
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label" htmlFor="sf-volume">
              Alarm volume
            </label>
            <input
              id="sf-volume"
              className="ui-slider Sf__range"
              style={{ "--isi": `${nilaiVolume}%` }}
              type="range"
              min="0"
              max="100"
              value={nilaiVolume}
              onChange={(e) => setNilaiVolume(e.target.value)}
            />
          </div>
          <div className="Sf__group">
            <label className="Sf__label" htmlFor="sf-widget">
              Top bar widget
            </label>
            <select
              id="sf-widget"
              className="ui-input Sf__select"
              value={nilaiLocMode}
              onChange={(e) => setNilaiLocMode(e.target.value)}
            >
              <option value="time">Clock</option>
              <option value="weather">Weather</option>
            </select>
          </div>
          <div className="Sf__group">
            <label className="Sf__label" htmlFor="sf-nama">
              Display name from
            </label>
            <select
              id="sf-nama"
              className="ui-input Sf__select"
              value={nilaiDisplayNameSource}
              onChange={(e) => setNilaiDisplayNameSource(e.target.value)}
            >
              <option value="google">Google</option>
              <option value="github">GitHub</option>
            </select>
          </div>
        </div>

        <div className="Sf__actions">
          <button
            className="ui-tombol Sf__btn"
            type="button"
            onClick={resetKeBawaan}
          >
            Reset
          </button>
          <button
            className="ui-tombol ui-tombol--utama Sf__btn"
            type="submit"
            disabled={sedangSimpan}
          >
            {sedangSimpan ? "Saving..." : "Save"}
          </button>
          {googleUser || githubUser ? (
            <button
              className="ui-tombol ui-tombol--bahaya Sf__btn"
              type="button"
              onClick={async () => {
                if (googleUser) {
                  try {
                    await signOut(auth);
                    toast({
                      title: "Logged out of Google",
                      variant: "success",
                    });
                  } catch (error) {
                    console.error("SettingsForm: gagal logout Firebase:", error);
                    toast({
                      title: "Google logout failed",
                      variant: "error",
                    });
                  }
                  return;
                }
                if (githubUser) {
                  try {
                    await logoutGitHub();
                    onLogoutGitHub?.();
                    toast({
                      title: "Logged out of GitHub",
                      variant: "success",
                    });
                  } catch (error) {
                    console.error("SettingsForm: gagal logout GitHub:", error);
                    toast({
                      title: "GitHub logout failed",
                      variant: "error",
                    });
                  }
                }
              }}
            >
              {googleUser ? "Log out Google" : "Log out GitHub"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export default SettingsForm;
