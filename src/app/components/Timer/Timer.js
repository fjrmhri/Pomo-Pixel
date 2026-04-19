"use client";

/**
 * Timer (Pomodoro)
 * -------------------------------------------------------------------
 * - Start / Jeda / Reset
 * - Periode: "work" (fokus), "short" (istirahat singkat), "long" (istirahat panjang)
 * - Mengikuti pengaturan dari props (workLen, shortBreakLen, longBreakLen, longBrInterval)
 * - Transisi otomatis antar periode + bunyi notifikasi
 * - Keyboard shortcut: Space (start/jeda), R (reset), X (reset posisi)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/Timer.css";
import { useToast } from "../ui/useToast";

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

  currentPeriod,
  setCurrentPeriod,

  volume = 80,

  onCatatMenit,
  onMulai,
  onJeda,
  onReset,

  className = "",
}) {
  const { toast } = useToast();
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

  const [periode, setPeriode] = useState(currentPeriod || PERIODE.work);
  const [berjalan, setBerjalan] = useState(false);
  const [sisaDetik, setSisaDetik] = useState(() =>
    getDurasiPeriodeDetik(currentPeriod || PERIODE.work),
  );
  const [jumlahWorkSelesai, setJumlahWorkSelesai] = useState(0);
  const [autoMulai, setAutoMulai] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const refWakeLock = useRef(null);

  const refInterval = useRef(null);
  const refTargetTime = useRef(null);
  const refHandleSesiSelesai = useRef(() => {});

  const refAudio = useRef(null);

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

  const resetPosisi = useCallback(() => {
    setDragOffset((current) => {
      const pernahDipindah = current.x !== 0 || current.y !== 0;
      if (pernahDipindah) {
        toast({ title: "Posisi direset" });
        return { x: 0, y: 0 };
      }
      return current;
    });
  }, [toast]);

  useEffect(() => {
    if (typeof window !== "undefined" && "wakeLock" in navigator) {
      setWakeLockSupported(true);
    }
  }, []);

  const refLastPropPeriod = useRef(currentPeriod);
  useEffect(() => {
    if (!currentPeriod) return;
    if (currentPeriod === refLastPropPeriod.current) return;
    refLastPropPeriod.current = currentPeriod;
    setPeriode(currentPeriod);
    if (!refInterval.current) {
      setSisaDetik(getDurasiPeriodeDetik(currentPeriod));
    } else {
      toast({
        title: "Periode diperbarui",
        description: "Durasi sesi yang sedang berjalan tetap dipertahankan.",
      });
    }
  }, [currentPeriod, getDurasiPeriodeDetik, toast]);

  const refLastDur = useRef(getDurasiPeriodeDetik(periode));
  useEffect(() => {
    const dur = getDurasiPeriodeDetik(periode);
    if (dur !== refLastDur.current) {
      refLastDur.current = dur;
      if (!berjalan) {
        setSisaDetik(dur);
      }
    }
  }, [getDurasiPeriodeDetik, periode, berjalan]);

  const fmt = useMemo(() => formatMMSS(sisaDetik), [sisaDetik]);

  const requestWakeLock = useCallback(async () => {
    if (!wakeLockSupported || typeof navigator === "undefined") return;
    try {
      if (refWakeLock.current) return;
      refWakeLock.current = await navigator.wakeLock.request("screen");
      try {
        refWakeLock.current.addEventListener("release", () => {});
      } catch {}
    } catch (err) {
      console.warn("[Timer] Wake lock request gagal:", err?.message || err);
    }
  }, [wakeLockSupported]);

  const releaseWakeLock = useCallback(() => {
    if (refWakeLock.current) {
      refWakeLock.current.release();
      refWakeLock.current = null;
    }
  }, []);

  const mulai = useCallback(() => {
    if (berjalan) return;

    const dur = getDurasiPeriodeDetik(periode);
    if (dur <= 0) {
      toast({
        title: "Durasi tidak valid",
        description: "Periksa pengaturan timer terlebih dahulu.",
        variant: "error",
      });
      return;
    }
    const now = Date.now();
    refTargetTime.current = now + sisaDetik * 1000;

    refInterval.current = setInterval(() => {
      const now2 = Date.now();
      const sisa = Math.max(
        0,
        Math.ceil((refTargetTime.current - now2) / 1000),
      );
      setSisaDetik(sisa);
      if (sisa <= 0) {
        clearInterval(refInterval.current);
        refInterval.current = null;
        setBerjalan(false);
        releaseWakeLock();
        refHandleSesiSelesai.current();
      }
    }, 200);

    setBerjalan(true);

    requestWakeLock();

    try {
      onMulai?.();
    } catch (error) {
      console.error("Timer: callback onMulai gagal dijalankan:", error);
      toast({
        title: "Timer gagal dimulai",
        variant: "error",
      });
    }
  }, [
    berjalan,
    getDurasiPeriodeDetik,
    periode,
    sisaDetik,
    onMulai,
    requestWakeLock,
    releaseWakeLock,
    toast,
  ]);

  const jeda = useCallback(() => {
    if (!berjalan) return;
    if (refInterval.current) clearInterval(refInterval.current);
    refInterval.current = null;
    releaseWakeLock();
    if (refTargetTime.current) {
      const now = Date.now();
      const sisa = Math.max(0, Math.ceil((refTargetTime.current - now) / 1000));
      setSisaDetik(sisa);
    }
    setBerjalan(false);
    try {
      onJeda?.();
    } catch (error) {
      console.error("Timer: callback onJeda gagal dijalankan:", error);
      toast({
        title: "Timer gagal dijeda",
        variant: "error",
      });
    }
  }, [berjalan, onJeda, releaseWakeLock, toast]);

  const reset = useCallback(() => {
    if (refInterval.current) clearInterval(refInterval.current);
    refInterval.current = null;
    refTargetTime.current = null;
    setBerjalan(false);
    setSisaDetik(getDurasiPeriodeDetik(periode));
    try {
      onReset?.();
    } catch (error) {
      console.error("Timer: callback onReset gagal dijalankan:", error);
      toast({
        title: "Reset gagal",
        variant: "error",
      });
    }
  }, [getDurasiPeriodeDetik, onReset, periode, toast]);

  const gantiPeriode = useCallback(
    (p, autoStart = false) => {
      setPeriode(p);
      setSisaDetik(getDurasiPeriodeDetik(p));
      setBerjalan(false);
      setAutoMulai(autoStart);
      try {
        setCurrentPeriod?.(p);
      } catch (error) {
        console.error(
          "Timer: callback setCurrentPeriod gagal dijalankan:",
          error,
        );
        toast({
          title: "Periode gagal diubah",
          variant: "error",
        });
      }
    },
    [getDurasiPeriodeDetik, setCurrentPeriod, toast],
  );

  const handleSesiSelesai = useCallback(() => {
    try {
      if (refAudio.current) {
        refAudio.current.currentTime = 0;
        refAudio.current.volume = Math.min(
          Math.max(Number(volume || 0) / 100, 0),
          1,
        );
        if (userInteracted) {
          refAudio.current.play().catch((err) => {
            void err;
          });
        }
      }
    } catch (e) {
      console.warn("Gagal memutar audio notifikasi:", e);
      toast({
        title: "Audio notifikasi gagal",
        variant: "error",
      });
    }

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
      toast({
        title: "Statistik gagal disimpan",
        variant: "error",
      });
    }

    if (periode === PERIODE.work) {
      const nextIsLong =
        (jumlahWorkSelesai + 1) % Math.max(2, Number(longBrInterval || 4)) ===
        0;
      const next = nextIsLong ? PERIODE.long : PERIODE.short;
      setJumlahWorkSelesai((n) => n + 1);
      gantiPeriode(next, true);
    } else {
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
    userInteracted,
    toast,
  ]);

  useEffect(() => {
    refHandleSesiSelesai.current = handleSesiSelesai;
  }, [handleSesiSelesai]);

  useEffect(() => {
    if (autoMulai) {
      setAutoMulai(false);
      mulai();
    }
  }, [autoMulai, mulai]);

  useEffect(() => {
    const setInteracted = () => {
      if (!userInteracted) setUserInteracted(true);
    };

    const onKey = (ev) => {
      setInteracted();
      const tag = (ev.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || ev.target?.isContentEditable)
        return;

      if (ev.code === "Space") {
        ev.preventDefault();
        if (berjalan) {
          jeda();
          toast({ title: "Timer dijeda" });
        } else {
          mulai();
          toast({ title: "Timer dimulai" });
        }
      } else if (ev.key?.toLowerCase() === "r") {
        reset();
        toast({ title: "Timer direset" });
      } else if (ev.key?.toLowerCase() === "x") {
        resetPosisi();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [berjalan, mulai, jeda, reset, resetPosisi, userInteracted, toast]);

  useEffect(() => {
    if (userInteracted) return;
    const events = ["mousedown", "touchstart"];
    const handler = () => {
      setUserInteracted(true);
    };
    events.forEach((evt) =>
      document.addEventListener(evt, handler, { once: true, passive: true }),
    );
    return () => {
      events.forEach((evt) => document.removeEventListener(evt, handler));
    };
  }, [userInteracted]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
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
          } else {
            if (wakeLockSupported && !refWakeLock.current) {
              requestWakeLock();
            }
          }
        }
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

  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
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

  useEffect(() => {
    return () => {
      if (refInterval.current) clearInterval(refInterval.current);
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

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
      <audio
        ref={refAudio}
        src={userInteracted ? "/sounds/minecraft_level_up.mp3" : undefined}
        preload="none"
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

        </div>

        <footer className="Tm__footer">
          <span>{'"Space: mulai/jeda • R: reset • X: reset posisi"'}</span>
        </footer>
      </section>
    </div>
  );
}

function pad2(n) {
  const x = Math.floor(Math.abs(Number(n)));
  return x < 10 ? `0${x}` : `${x}`;
}

function formatMMSS(totalDetik) {
  const m = Math.floor(totalDetik / 60);
  const s = totalDetik % 60;
  return { mm: pad2(m), ss: pad2(s) };
}
