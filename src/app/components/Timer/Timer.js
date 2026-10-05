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
import {
  PERIODE,
  durasiPeriodeDetik,
  formatMMSS,
  hitungSisaDetik,
  periodeBerikutnya,
} from "../../lib/pomodoro";

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
    (p) => durasiPeriodeDetik(p, { workLen, shortBreakLen, longBreakLen }),
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
  // Non-null hanya selama timer berjalan; dipakai sebagai penanda sesi aktif.
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
        toast({ title: "Position reset" });
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
        title: "Session updated",
        description: "The running session keeps its current duration.",
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
      const sentinel = await navigator.wakeLock.request("screen");
      refWakeLock.current = sentinel;
      // Browser melepas wake lock saat tab disembunyikan; kosongkan ref agar
      // dapat diminta ulang ketika tab kembali terlihat.
      sentinel.addEventListener("release", () => {
        if (refWakeLock.current === sentinel) refWakeLock.current = null;
      });
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

  // Satu-satunya jalur penyelesaian sesi (interval, visibilitychange, pageshow).
  // Guard refTargetTime mencegah satu sesi tercatat lebih dari sekali.
  const selesaikanSesiBerjalan = useCallback(() => {
    if (!refTargetTime.current) return;
    refTargetTime.current = null;
    if (refInterval.current) clearInterval(refInterval.current);
    refInterval.current = null;
    setBerjalan(false);
    releaseWakeLock();
    refHandleSesiSelesai.current();
  }, [releaseWakeLock]);

  const mulai = useCallback(() => {
    if (berjalan || refTargetTime.current) return;

    const dur = getDurasiPeriodeDetik(periode);
    if (dur <= 0) {
      toast({
        title: "Invalid duration",
        description: "Check your timer settings first.",
        variant: "error",
      });
      return;
    }
    const now = Date.now();
    refTargetTime.current = now + sisaDetik * 1000;

    refInterval.current = setInterval(() => {
      if (!refTargetTime.current) return;
      const sisa = hitungSisaDetik(refTargetTime.current);
      setSisaDetik(sisa);
      if (sisa <= 0) selesaikanSesiBerjalan();
    }, 200);

    setBerjalan(true);

    requestWakeLock();

    try {
      onMulai?.();
    } catch (error) {
      console.error("Timer: callback onMulai gagal dijalankan:", error);
      toast({
        title: "Timer failed to start",
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
    selesaikanSesiBerjalan,
    toast,
  ]);

  const jeda = useCallback(() => {
    if (!berjalan) return;
    if (refInterval.current) clearInterval(refInterval.current);
    refInterval.current = null;
    releaseWakeLock();
    if (refTargetTime.current) {
      setSisaDetik(hitungSisaDetik(refTargetTime.current));
    }
    refTargetTime.current = null;
    setBerjalan(false);
    try {
      onJeda?.();
    } catch (error) {
      console.error("Timer: callback onJeda gagal dijalankan:", error);
      toast({
        title: "Timer failed to pause",
        variant: "error",
      });
    }
  }, [berjalan, onJeda, releaseWakeLock, toast]);

  const reset = useCallback(() => {
    if (refInterval.current) clearInterval(refInterval.current);
    refInterval.current = null;
    refTargetTime.current = null;
    releaseWakeLock();
    setBerjalan(false);
    setSisaDetik(getDurasiPeriodeDetik(periode));
    try {
      onReset?.();
    } catch (error) {
      console.error("Timer: callback onReset gagal dijalankan:", error);
      toast({
        title: "Reset failed",
        variant: "error",
      });
    }
  }, [getDurasiPeriodeDetik, onReset, periode, releaseWakeLock, toast]);

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
          title: "Could not change session",
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
        title: "Notification sound failed",
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
        title: "Could not save stats",
        variant: "error",
      });
    }

    if (periode === PERIODE.work) {
      setJumlahWorkSelesai((n) => n + 1);
    }
    gantiPeriode(
      periodeBerikutnya(periode, jumlahWorkSelesai, longBrInterval),
      true,
    );
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
      if (ev.defaultPrevented) return;
      setInteracted();
      const tag = (ev.target?.tagName || "").toLowerCase();
      if (
        ["input", "textarea", "select", "button"].includes(tag) ||
        ev.target?.isContentEditable
      )
        return;

      if (ev.code === "Space") {
        ev.preventDefault();
        if (berjalan) {
          jeda();
          toast({ title: "Timer paused" });
        } else {
          mulai();
        }
      } else if (ev.key?.toLowerCase() === "r") {
        reset();
        toast({ title: "Timer reset" });
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
      if (document.visibilityState !== "visible") return;
      if (!refTargetTime.current) return;
      const remaining = hitungSisaDetik(refTargetTime.current);
      setSisaDetik(remaining);
      if (remaining <= 0) {
        selesaikanSesiBerjalan();
      } else if (wakeLockSupported && !refWakeLock.current) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [wakeLockSupported, selesaikanSesiBerjalan, requestWakeLock]);

  useEffect(() => {
    const handlePageShow = (event) => {
      if (!event.persisted || !refTargetTime.current) return;
      const remaining = hitungSisaDetik(refTargetTime.current);
      setSisaDetik(remaining);
      if (remaining <= 0) selesaikanSesiBerjalan();
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [selesaikanSesiBerjalan]);

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
        className={`ui-panel Tm ${
          periode === "work"
            ? "is-work"
            : periode === "short"
              ? "is-short"
              : "is-long"
        }`}
      >
        <header
          className="Tm__header"
          title="drag to move"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragCancel}
        >
          <span className="ui-lencana Tm__badge">
            {periode === "work"
              ? "focus"
              : periode === "short"
                ? "short break"
                : "long break"}
          </span>
          <span className={`Tm__indikator ${berjalan ? "on" : "off"}`}>
            <span
              className={`ui-titik ${
                berjalan ? "ui-titik--jalan" : "ui-titik--jeda"
              }`}
              aria-hidden
            />
            {berjalan ? "running" : "paused"}
          </span>
        </header>

        <div className="Tm__isi">
          <div className="Tm__progress" aria-label={`progress ${persentase}%`}>
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
                type="button"
                className="ui-tombol ui-tombol--utama Tm__btn"
                onClick={mulai}
                aria-label="start (Space)"
              >
                start
              </button>
            ) : (
              <button
                type="button"
                className="ui-tombol Tm__btn"
                onClick={jeda}
                aria-label="pause (Space)"
              >
                pause
              </button>
            )}
            <button
              type="button"
              className="ui-tombol Tm__btn"
              onClick={reset}
              aria-label="reset (R)"
            >
              reset
            </button>
          </div>

        </div>

        <footer className="Tm__footer">
          <span>Space: start/pause • R: reset • X: reset position</span>
        </footer>
      </section>
    </div>
  );
}
