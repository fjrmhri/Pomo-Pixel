"use client";

/**
 * Timer (Pomodoro)
 * -------------------------------------------------------------------
 * - Start / Jeda / Reset
 * - Periode: "work" (fokus), "short" (istirahat singkat), "long" (istirahat panjang)
 * - Mengikuti pengaturan dari props (workLen, shortBreakLen, longBreakLen, longBrInterval)
 * - Transisi otomatis antar periode + bunyi notifikasi
 * - Keyboard shortcut: Space (start/jeda), R (reset)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/Timer.css";

const PERIODE = {
  work: "work",
  short: "short",
  long: "long",
};

export default function Timer({
  workLen = 25,
  shortBreakLen = 5,
  longBreakLen = 15,
  longBrInterval = 4,

  currentPeriod, // "work" | "short" | "long"
  setCurrentPeriod, // fn

  volume = 80,

  onCatatMenit, // fn({ fokusMenit, istirahatMenit, totalMenit, periodeSelesai })
  onMulai,
  onJeda,
  onReset,

  className = "",
}) {
  const getDurasiPeriodeDetik = useCallback(
    (p) => {
      if (p === PERIODE.work) return Math.max(1, Number(workLen || 25)) * 60;
      if (p === PERIODE.short)
        return Math.max(1, Number(shortBreakLen || 5)) * 60;
      if (p === PERIODE.long)
        return Math.max(1, Number(longBreakLen || 15)) * 60;
      return 25 * 60;
    },
    [workLen, shortBreakLen, longBreakLen],
  );

  // ------------------- state dasar -------------------
  const [periode, setPeriode] = useState(currentPeriod || PERIODE.work);
  const [berjalan, setBerjalan] = useState(false);
  const [sisaDetik, setSisaDetik] = useState(() =>
    getDurasiPeriodeDetik(currentPeriod || PERIODE.work),
  );
  const [jumlahWorkSelesai, setJumlahWorkSelesai] = useState(0); // hitung sesi fokus selesai (untuk long break)
  const [pesanError, setPesanError] = useState("");
  const [pesanInfo, setPesanInfo] = useState("");
  const [autoMulai, setAutoMulai] = useState(false); // flag: auto start periode berikutnya

  // Wake Lock API support (untuk mencegah device sleep)
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const refWakeLock = useRef(null);

  // untuk kalkulasi tick berbasis waktu nyata (anti drift)
  const refInterval = useRef(null);
  const refTargetTime = useRef(null);
  const refHandleSesiSelesai = useRef(() => {});

  // audio notifikasi
  const refAudio = useRef(null);

  // drag posisi timer
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const refDrag = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const handleDragStart = useCallback(
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      refDrag.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: dragOffset.x,
        originY: dragOffset.y,
      };
    },
    [dragOffset],
  );

  const handleDragMove = useCallback((event) => {
    if (
      !refDrag.current.active ||
      event.pointerId !== refDrag.current.pointerId
    )
      return;
    const deltaX = event.clientX - refDrag.current.startX;
    const deltaY = event.clientY - refDrag.current.startY;
    setDragOffset({
      x: refDrag.current.originX + deltaX,
      y: refDrag.current.originY + deltaY,
    });
  }, []);

  const handleDragEnd = useCallback((event) => {
    if (
      !refDrag.current.active ||
      event.pointerId !== refDrag.current.pointerId
    )
      return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    refDrag.current.active = false;
  }, []);

  const handleDragCancel = useCallback(() => {
    refDrag.current.active = false;
  }, []);

  // Deteksi Wake Lock support
  useEffect(() => {
    if (typeof window !== "undefined" && "wakeLock" in navigator) {
      setWakeLockSupported(true);
    }
  }, []);

  // sinkronisasi periode dari props (mis. tombol di Dashboard)
  // sinkronisasi periode dari props (mis. tombol di Dashboard)
  // Hanya re-act ketika `currentPeriod` prop benar-benar berubah.
  const refLastPropPeriod = useRef(currentPeriod);
  useEffect(() => {
    if (!currentPeriod) return;
    if (currentPeriod === refLastPropPeriod.current) return;
    refLastPropPeriod.current = currentPeriod;
    setPeriode(currentPeriod);
    if (!refInterval.current) {
      setSisaDetik(getDurasiPeriodeDetik(currentPeriod));
      setPesanInfo("");
    } else {
      setPesanInfo(
        "Periode diubah saat timer berjalan. Durasi berjalan tetap dipertahankan.",
      );
    }
  }, [currentPeriod, getDurasiPeriodeDetik]);

  // saat durasi props berubah & timer TIDAK berjalan → reset detik
  // Hati-hati: tidak ingin mereset waktu hanya karena kita toggle pause.
  // Reset hanya bila durasi periode benar-benar berubah (mis. pengaturan diubah).
  const refLastDur = useRef(getDurasiPeriodeDetik(periode));
  useEffect(() => {
    const dur = getDurasiPeriodeDetik(periode);
    if (dur !== refLastDur.current) {
      refLastDur.current = dur;
      if (!berjalan) {
        setSisaDetik(dur);
      }
    }
    // hanya re-evaluate ketika fungsi durasi atau periode berubah
  }, [getDurasiPeriodeDetik, periode, berjalan]);

  // format mm:ss
  const fmt = useMemo(() => formatMMSS(sisaDetik), [sisaDetik]);

  // ------------------- Wake Lock helpers -------------------
  const requestWakeLock = useCallback(async () => {
    if (!wakeLockSupported || typeof navigator === "undefined") return;
    try {
      if (refWakeLock.current) return; // already acquired
      refWakeLock.current = await navigator.wakeLock.request("screen");
      // Silent acquisition in production; avoid noisy console logs.
      try {
        refWakeLock.current.addEventListener("release", () => {});
      } catch {}
    } catch (err) {
      // keep a concise warning for diagnostics
      console.warn("[Timer] Wake lock request gagal:", err?.message || err);
      // Fallback: tetap jalankan timer dengan koreksi timestamp saja
    }
  }, [wakeLockSupported]);

  const releaseWakeLock = useCallback(() => {
    if (refWakeLock.current) {
      refWakeLock.current.release();
      refWakeLock.current = null;
    }
  }, []);

  // ------------------- kontrol utama -------------------
  const mulai = useCallback(() => {
    setPesanError("");
    setPesanInfo("");

    if (berjalan) return; // sudah berjalan

    // validasi dasar
    const dur = getDurasiPeriodeDetik(periode);
    if (dur <= 0) {
      setPesanError("Durasi periode tidak valid. Periksa pengaturan.");
      return;
    }
    // target waktu selesai
    const now = Date.now();
    refTargetTime.current = now + sisaDetik * 1000;

    // interval 200ms untuk akurasi relatif baik + hemat
    refInterval.current = setInterval(() => {
      const now2 = Date.now();
      const sisa = Math.max(
        0,
        Math.ceil((refTargetTime.current - now2) / 1000),
      );
      setSisaDetik(sisa);
      if (sisa <= 0) {
        // stop interval dulu agar tidak dobel
        clearInterval(refInterval.current);
        refInterval.current = null;
        setBerjalan(false);
        releaseWakeLock();
        // selesaikan sesi & transisi
        refHandleSesiSelesai.current();
      }
    }, 200);

    setBerjalan(true);

    // Request wake lock untuk mencegah screen sleep
    requestWakeLock();

    try {
      onMulai?.();
    } catch (error) {
      console.error("Timer: callback onMulai gagal dijalankan:", error);
    }
  }, [
    berjalan,
    getDurasiPeriodeDetik,
    periode,
    sisaDetik,
    onMulai,
    requestWakeLock,
    releaseWakeLock,
  ]);

  const jeda = useCallback(() => {
    if (!berjalan) return;
    if (refInterval.current) clearInterval(refInterval.current);
    refInterval.current = null;
    releaseWakeLock(); // Release wake lock saat pause
    // hitung ulang sisaDetik relative ke target
    if (refTargetTime.current) {
      const now = Date.now();
      const sisa = Math.max(0, Math.ceil((refTargetTime.current - now) / 1000));
      setSisaDetik(sisa);
    }
    setBerjalan(false);
    setPesanInfo("");
    try {
      onJeda?.();
    } catch (error) {
      console.error("Timer: callback onJeda gagal dijalankan:", error);
    }
  }, [berjalan, onJeda, releaseWakeLock]);

  const reset = useCallback(() => {
    if (refInterval.current) clearInterval(refInterval.current);
    refInterval.current = null;
    refTargetTime.current = null;
    setBerjalan(false);
    setSisaDetik(getDurasiPeriodeDetik(periode));
    setPesanInfo("direset");
    try {
      onReset?.();
    } catch (error) {
      console.error("Timer: callback onReset gagal dijalankan:", error);
    }
  }, [getDurasiPeriodeDetik, onReset, periode]);

  // ganti periode + reset waktu (opsi auto mulai setelah transisi)
  const gantiPeriode = useCallback(
    (p, autoStart = false) => {
      setPeriode(p);
      setSisaDetik(getDurasiPeriodeDetik(p));
      setBerjalan(false);
      setPesanInfo(
        `berikutnya: ${
          p === "work"
            ? "fokus"
            : p === "short"
              ? "istirahat singkat"
              : "istirahat panjang"
        }`,
      );
      setAutoMulai(autoStart);
      try {
        setCurrentPeriod?.(p);
      } catch (error) {
        console.error(
          "Timer: callback setCurrentPeriod gagal dijalankan:",
          error,
        );
      }
    },
    [getDurasiPeriodeDetik, setCurrentPeriod],
  );

  // ------------------- saat sesi selesai -------------------
  const handleSesiSelesai = useCallback(() => {
    // bunyikan notifikasi
    try {
      if (refAudio.current) {
        refAudio.current.currentTime = 0;
        refAudio.current.volume = Math.min(
          Math.max(Number(volume || 0) / 100, 0),
          1,
        );
        void refAudio.current.play();
      }
    } catch (e) {
      // tidak fatal
      console.warn("Gagal memutar audio notifikasi:", e);
    }

    // catat menit ke callback
    const menitSesi = getDurasiPeriodeDetik(periode) / 60;

    try {
      if (typeof onCatatMenit === "function") {
        if (periode === PERIODE.work) {
          onCatatMenit({
            fokusMenit: menitSesi,
            istirahatMenit: 0,
            totalMenit: menitSesi,
            periodeSelesai: "work",
          });
        } else {
          onCatatMenit({
            fokusMenit: 0,
            istirahatMenit: menitSesi,
            totalMenit: menitSesi,
            periodeSelesai: periode,
          });
        }
      }
    } catch (error) {
      console.error("Timer: callback onCatatMenit gagal dijalankan:", error);
    }

    // transisi periode berikutnya
    if (periode === PERIODE.work) {
      const nextIsLong =
        (jumlahWorkSelesai + 1) % Math.max(2, Number(longBrInterval || 4)) ===
        0;
      const next = nextIsLong ? PERIODE.long : PERIODE.short;
      setJumlahWorkSelesai((n) => n + 1);
      gantiPeriode(next, true);
    } else {
      // selesai break → kembali ke work
      gantiPeriode(PERIODE.work, true);
    }
  }, [
    periode,
    jumlahWorkSelesai,
    longBrInterval,
    onCatatMenit,
    volume,
    gantiPeriode,
    getDurasiPeriodeDetik,
  ]);

  // keep a stable ref to the latest handleSesiSelesai so other callbacks
  // (notably `mulai`) can call it without adding it to their deps.
  useEffect(() => {
    refHandleSesiSelesai.current = handleSesiSelesai;
  }, [handleSesiSelesai]);

  // auto mulai periode baru bila di-set oleh gantiPeriode
  useEffect(() => {
    if (autoMulai) {
      setAutoMulai(false);
      mulai();
    }
  }, [autoMulai, mulai]);

  // ------------------- keyboard shortcut -------------------
  useEffect(() => {
    const onKey = (ev) => {
      const tag = (ev.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || ev.target?.isContentEditable)
        return;

      if (ev.code === "Space") {
        ev.preventDefault();
        berjalan ? jeda() : mulai();
      } else if (ev.key?.toLowerCase() === "r") {
        reset();
      } else if (ev.key?.toLowerCase() === "x") {
        // reset position to default (trigger via parent if provided)
        try {
          // emit custom event for external handlers
          const evPos = new CustomEvent("lp-reset-position", {
            detail: { target: "timer" },
          });
          window.dispatchEvent(evPos);
        } catch (e) {
          // fallback: call reset() to restore timer values
          reset();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [berjalan, mulai, jeda, reset]);

  // ------------------- Sleep/Resume handling -------------------
  // Handle visibility change (tab hidden/visible, device sleep/wake)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab kembali visible
        // debug: tab visibility change handled

        if (berjalan && refTargetTime.current) {
          // Koreksi sisaDetik berdasarkan timestamp
          const now = Date.now();
          const remaining = Math.max(
            0,
            Math.ceil((refTargetTime.current - now) / 1000),
          );

          setSisaDetik(remaining);

          if (remaining <= 0) {
            // Waktu sudah habis saat tab tidak visible
            clearInterval(refInterval.current);
            refInterval.current = null;
            setBerjalan(false);
            releaseWakeLock();
            handleSesiSelesai();
          } else {
            // Re-request wake lock (sering ter-release saat visibility hidden)
            if (wakeLockSupported && !refWakeLock.current) {
              requestWakeLock();
            }
          }
        }
      } else {
        // Tab menjadi hidden - wake lock mungkin ter-release otomatis
        // debug: tab hidden
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    berjalan,
    wakeLockSupported,
    handleSesiSelesai,
    requestWakeLock,
    releaseWakeLock,
  ]);

  // Handle pageshow (for mobile browsers with bfcache)
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        // Page restored from bfcache (back-forward cache)
        // debug: page restored from bfcache

        if (berjalan && refTargetTime.current) {
          const now = Date.now();
          const remaining = Math.max(
            0,
            Math.ceil((refTargetTime.current - now) / 1000),
          );
          setSisaDetik(remaining);

          if (remaining <= 0) {
            clearInterval(refInterval.current);
            refInterval.current = null;
            setBerjalan(false);
            releaseWakeLock();
            handleSesiSelesai();
          }
        }
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [berjalan, handleSesiSelesai, releaseWakeLock]);

  // bersih-bersih saat unmount
  useEffect(() => {
    return () => {
      if (refInterval.current) clearInterval(refInterval.current);
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // ring progress (%)
  const persentase = useMemo(() => {
    const total = getDurasiPeriodeDetik(periode);
    return total > 0 ? Math.round(((total - sisaDetik) / total) * 100) : 0;
  }, [getDurasiPeriodeDetik, periode, sisaDetik]);

  return (
    <div
      className={`Tm__bungkus ${className}`}
      style={{
        transform: `translate(calc(-50% + ${dragOffset.x}px), calc(-50% + ${dragOffset.y}px))`,
      }}
    >
      {/* audio notifikasi */}
      <audio
        ref={refAudio}
        src="/sounds/minecraft_level_up.mp3"
        preload="auto"
        aria-hidden
      />

      <section
        className={`Tm ${
          periode === "work"
            ? "is-work"
            : periode === "short"
              ? "is-short"
              : "is-long"
        }`}
      >
        {/* header */}
        <header
          className="Tm__header"
          title="tarik untuk memindah"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragCancel}
        >
          <span className="Tm__badge">
            {periode === "work"
              ? "fokus"
              : periode === "short"
                ? "istirahat"
                : "istirahat panjang"}
          </span>
          <span className={`Tm__indikator ${berjalan ? "on" : "off"}`}>
            {berjalan ? "berjalan" : "jeda"}
          </span>
        </header>

        {/* tampilan waktu */}
        <div className="Tm__isi">
          <div className="Tm__progress" aria-label={`progres ${persentase}%`}>
            <div
              className="Tm__progress-bar"
              style={{ width: `${persentase}%` }}
            />
          </div>

          <div className="Tm__waktu" aria-live="polite">
            <span className="Tm__mm">{fmt.mm}</span>
            <span className="Tm__colon">:</span>
            <span className="Tm__ss">{fmt.ss}</span>
          </div>

          {/* tombol kontrol */}
          <div className="Tm__kontrol">
            {!berjalan ? (
              <button
                className="Tm__btn utama"
                onClick={mulai}
                aria-label="mulai (Space)"
              >
                mulai
              </button>
            ) : (
              <button
                className="Tm__btn"
                onClick={jeda}
                aria-label="jeda (Space)"
              >
                jeda
              </button>
            )}
            <button className="Tm__btn" onClick={reset} aria-label="reset (R)">
              reset
            </button>
          </div>

          {/* pesan info / error */}
          {pesanInfo && <div className="Tm__alert info">{pesanInfo}</div>}
          {pesanError && (
            <div className="Tm__alert error" role="alert">
              {pesanError}
            </div>
          )}
        </div>

        {/* footer kecil: hint keyboard */}
        <footer className="Tm__footer">
          <span>Space: mulai/jeda • R: reset • X: reset posisi</span>
        </footer>
      </section>
    </div>
  );
}

/* ------------------- util ------------------- */
function pad2(n) {
  const x = Math.floor(Math.abs(Number(n)));
  return x < 10 ? `0${x}` : `${x}`;
}

function formatMMSS(totalDetik) {
  const m = Math.floor(totalDetik / 60);
  const s = totalDetik % 60;
  return { mm: pad2(m), ss: pad2(s) };
}
