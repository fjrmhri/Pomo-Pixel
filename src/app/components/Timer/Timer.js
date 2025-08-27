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
  // ------------------- state dasar -------------------
  const [periode, setPeriode] = useState(currentPeriod || PERIODE.work);
  const [berjalan, setBerjalan] = useState(false);
  const [sisaDetik, setSisaDetik] = useState(() =>
    durasiPeriodeDetik(currentPeriod || PERIODE.work, {
      workLen,
      shortBreakLen,
      longBreakLen,
    })
  );
  const [jumlahWorkSelesai, setJumlahWorkSelesai] = useState(0); // hitung sesi fokus selesai (untuk long break)
  const [pesanError, setPesanError] = useState("");
  const [pesanInfo, setPesanInfo] = useState("");
  const [autoMulai, setAutoMulai] = useState(false); // flag: auto start periode berikutnya

  // untuk kalkulasi tick berbasis waktu nyata (anti drift)
  const refInterval = useRef(null);
  const refTargetTime = useRef(null);

  // audio notifikasi
  const refAudio = useRef(null);

  // sinkronisasi periode dari props (mis. tombol di Dashboard)
  useEffect(() => {
    if (!currentPeriod) return;
    // kalau periode dari parent berubah, dan timer sedang PAUSE → reset durasi
    setPeriode(currentPeriod);
    if (!berjalan) {
      setSisaDetik(
        durasiPeriodeDetik(currentPeriod, {
          workLen,
          shortBreakLen,
          longBreakLen,
        })
      );
      setPesanInfo(""); // hapus info lama
    } else {
      // jika sedang berjalan, biarkan sisaDetik tetap (biar tidak "loncat")
      setPesanInfo(
        "Periode diubah saat timer berjalan. Durasi berjalan tetap dipertahankan."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriod]);

  // saat durasi props berubah & timer TIDAK berjalan → reset detik
  useEffect(() => {
    if (!berjalan) {
      setSisaDetik(
        durasiPeriodeDetik(periode, { workLen, shortBreakLen, longBreakLen })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workLen, shortBreakLen, longBreakLen]);

  // helper: durasi detik berdasarkan periode
  function durasiPeriodeDetik(p, { workLen, shortBreakLen, longBreakLen }) {
    if (p === PERIODE.work) return Math.max(1, Number(workLen || 25)) * 60;
    if (p === PERIODE.short)
      return Math.max(1, Number(shortBreakLen || 5)) * 60;
    if (p === PERIODE.long) return Math.max(1, Number(longBreakLen || 15)) * 60;
    return 25 * 60;
  }

  // format mm:ss
  const fmt = useMemo(() => formatMMSS(sisaDetik), [sisaDetik]);

  // ------------------- kontrol utama -------------------
  const mulai = useCallback(() => {
    setPesanError("");
    setPesanInfo("");

    if (berjalan) return; // sudah berjalan

    // validasi dasar
    const dur = durasiPeriodeDetik(periode, {
      workLen,
      shortBreakLen,
      longBreakLen,
    });
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
        Math.ceil((refTargetTime.current - now2) / 1000)
      );
      setSisaDetik(sisa);
      if (sisa <= 0) {
        // stop interval dulu agar tidak dobel
        clearInterval(refInterval.current);
        refInterval.current = null;
        setBerjalan(false);
        // selesaikan sesi & transisi
        handleSesiSelesai();
      }
    }, 200);

    setBerjalan(true);
    try {
      onMulai?.();
    } catch {}
  }, [
    berjalan,
    periode,
    sisaDetik,
    workLen,
    shortBreakLen,
    longBreakLen,
    onMulai,
  ]);

  const jeda = useCallback(() => {
    if (!berjalan) return;
    if (refInterval.current) clearInterval(refInterval.current);
    refInterval.current = null;
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
    } catch {}
  }, [berjalan, onJeda]);

  const reset = useCallback(() => {
    if (refInterval.current) clearInterval(refInterval.current);
    refInterval.current = null;
    refTargetTime.current = null;
    setBerjalan(false);
    setSisaDetik(
      durasiPeriodeDetik(periode, { workLen, shortBreakLen, longBreakLen })
    );
    setPesanInfo("direset");
    try {
      onReset?.();
    } catch {}
  }, [periode, workLen, shortBreakLen, longBreakLen, onReset]);

  // ganti periode + reset waktu (opsi auto mulai setelah transisi)
  const gantiPeriode = useCallback(
    (p, autoStart = false) => {
      setPeriode(p);
      setSisaDetik(
        durasiPeriodeDetik(p, { workLen, shortBreakLen, longBreakLen })
      );
      setBerjalan(false);
      setPesanInfo(
        `berikutnya: ${
          p === "work"
            ? "fokus"
            : p === "short"
            ? "istirahat singkat"
            : "istirahat panjang"
        }`
      );
      setAutoMulai(autoStart);
      try {
        setCurrentPeriod?.(p);
      } catch {}
    },
    [setCurrentPeriod, workLen, shortBreakLen, longBreakLen]
  );

  // ------------------- saat sesi selesai -------------------
  const handleSesiSelesai = useCallback(() => {
    // bunyikan notifikasi
    try {
      if (refAudio.current) {
        refAudio.current.currentTime = 0;
        refAudio.current.volume = Math.min(
          Math.max(Number(volume || 0) / 100, 0),
          1
        );
        void refAudio.current.play();
      }
    } catch (e) {
      // tidak fatal
      console.warn("Gagal memutar audio notifikasi:", e);
    }

    // catat menit ke callback
    const menitSesi =
      durasiPeriodeDetik(periode, { workLen, shortBreakLen, longBreakLen }) /
      60;

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
    } catch {}

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
    workLen,
    shortBreakLen,
    longBreakLen,
    jumlahWorkSelesai,
    longBrInterval,
    onCatatMenit,
    volume,
    gantiPeriode,
  ]);

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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [berjalan, mulai, jeda, reset]);

  // bersih-bersih saat unmount
  useEffect(() => {
    return () => {
      if (refInterval.current) clearInterval(refInterval.current);
    };
  }, []);

  // ring progress (%)
  const persentase = useMemo(() => {
    const total = durasiPeriodeDetik(periode, {
      workLen,
      shortBreakLen,
      longBreakLen,
    });
    return total > 0 ? Math.round(((total - sisaDetik) / total) * 100) : 0;
  }, [sisaDetik, periode, workLen, shortBreakLen, longBreakLen]);

  return (
    <div className={`Tm__bungkus ${className}`}>
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
        <header className="Tm__header" title="tarik untuk memindah">
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
          <span>Space: mulai/jeda • R: reset</span>
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
