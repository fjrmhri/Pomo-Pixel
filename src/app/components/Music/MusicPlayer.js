"use client";

/**
 * MusicPlayer
 * -----------------------------------------
 * Pemutar musik sederhana untuk folder /public/tracks:
 * - Genre: chill, jazzy, sleepy (masing-masing 30 track)
 * - Kontrol: Play/Pause, Prev/Next, Seek, Volume, Shuffle, Repeat
 * - Pilih genre (filter daftar lagu)
 * - SFX singkat saat ganti lagu (menggunakan /public/effects/keyboard.mp3)
 *
 * Catatan:
 * - Variabel & pesan dalam Bahasa Indonesia.
 * - CSS dipisahkan di src/app/styles/MusicPlayer.css
 * - Komponen toleran terhadap props ekstra (misal dari implementasi lama),
 *   sehingga bila page.js lama masih mengirim prop lain, tidak akan error.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/MusicPlayer.css";
import { useToast } from "../ui/useToast";

// ---------- Utilitas format waktu (mm:ss) ----------
const formatDetik = (totalDetik) => {
  if (Number.isNaN(totalDetik) || totalDetik == null) return "00:00";
  const menit = Math.floor(totalDetik / 60);
  const detik = Math.floor(totalDetik % 60);
  const mm = menit < 10 ? `0${menit}` : `${menit}`;
  const ss = detik < 10 ? `0${detik}` : `${detik}`;
  return `${mm}:${ss}`;
};

// ---------- Bangun daftar lagu dari struktur public/tracks ----------
const daftarGenre = [
  { nama: "chill", pola: "chill_{i}.mp3", jumlah: 30 },
  { nama: "jazzy", pola: "jazzy_{i}.mp3", jumlah: 30 },
  { nama: "sleepy", pola: "sleepy_{i}.mp3", jumlah: 30 },
];

const bangunDaftarLagu = () => {
  const hasil = [];
  for (const g of daftarGenre) {
    for (let i = 1; i <= g.jumlah; i++) {
      // contoh hasil: /tracks/chill/chill_1.mp3
      const namaFile = g.pola.replace("{i}", i);
      const url = `/tracks/${g.nama}/${namaFile}`;
      hasil.push({
        judul: `${g.nama} ${i}`,
        url,
        genre: g.nama,
      });
    }
  }
  return hasil;
};

const SEMUA = "semua"; // opsi filter untuk semua genre

export default function MusicPlayer({ namaWallpaper = "", onGantiWallpaper }) {
  const { toast } = useToast();
  // ---------- Refs & State utama ----------
  const refAudio = useRef(null);
  const refSfx = useRef(null); // efek klik singkat (bukan ambient loop)
  const refHandleBerikut = useRef(() => {});
  const refSfxTimeout = useRef(null);
  const refUrlAudioTerakhir = useRef("");

  const [daftarLagu] = useState(() => bangunDaftarLagu());
  const [genreTerpilih, setGenreTerpilih] = useState(SEMUA);

  // Saring daftar lagu berdasarkan genre
  const daftarTersaring = useMemo(() => {
    if (genreTerpilih === SEMUA) return daftarLagu;
    return daftarLagu.filter((l) => l.genre === genreTerpilih);
  }, [genreTerpilih, daftarLagu]);

  // Indeks lagu aktif (dalam daftar tersaring)
  const [indeksLagu, setIndeksLagu] = useState(0);

  const laguSaatIni = daftarTersaring[indeksLagu];

  // Kontrol pemutaran
  const [sedangMain, setSedangMain] = useState(false);
  const [volumeMusik, setVolumeMusik] = useState(70); // 0 - 100
  const [waktuSaatIni, setWaktuSaatIni] = useState(0); // detik
  const [durasiDetik, setDurasiDetik] = useState(0); // detik
  const [acakAktif, setAcakAktif] = useState(false);
  const [ulangAktif, setUlangAktif] = useState(false);
  const [audioSiap, setAudioSiap] = useState(false);

  // ---------- Persist beberapa setelan ke localStorage ----------
  useEffect(() => {
    try {
      const s = localStorage.getItem("mp_setelan");
      if (s) {
        const parsed = JSON.parse(s);
        if (typeof parsed.volumeMusik === "number")
          setVolumeMusik(parsed.volumeMusik);
        if (typeof parsed.acakAktif === "boolean")
          setAcakAktif(parsed.acakAktif);
        if (typeof parsed.ulangAktif === "boolean")
          setUlangAktif(parsed.ulangAktif);
        if (typeof parsed.genreTerpilih === "string")
          setGenreTerpilih(parsed.genreTerpilih);
      }
    } catch (e) {
      console.warn("Gagal membaca setelan dari localStorage:", e);
      toast({
        title: "Setelan player gagal dimuat",
        variant: "error",
      });
    }
  }, [toast]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "mp_setelan",
        JSON.stringify({ volumeMusik, acakAktif, ulangAktif, genreTerpilih }),
      );
    } catch (e) {
      console.warn("Gagal menyimpan setelan ke localStorage:", e);
    }
  }, [volumeMusik, acakAktif, ulangAktif, genreTerpilih]);

  // ---------- Sinkronisasi volume ke elemen audio ----------
  useEffect(() => {
    if (refAudio.current) {
      refAudio.current.volume = Math.min(Math.max(volumeMusik / 100, 0), 1);
    }
  }, [volumeMusik, laguSaatIni?.url]);

  // ---------- Event: metadata & timeupdate ----------
  const aturEventAudio = useCallback(() => {
    const el = refAudio.current;
    if (!el) return;

    const onLoadedMetadata = () => {
      setDurasiDetik(el.duration || 0);
      setWaktuSaatIni(0);
    };

    const onTimeUpdate = () => {
      setWaktuSaatIni(el.currentTime || 0);
    };

    const onEnded = () => {
      if (ulangAktif) {
        // ulangi lagu yang sama
        el.currentTime = 0;
        el.play().catch(() => {});
        return;
      }
      // pindah ke lagu berikutnya (via ref to avoid TDZ)
      try {
        refHandleBerikut.current();
      } catch {}
    };

    const onError = () => {
      toast({
        title: "Lagu gagal dimuat",
        description: "Player akan mencoba lagu berikutnya.",
        variant: "error",
      });
      // skip otomatis
      try {
        refHandleBerikut.current(true);
      } catch {}
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, [toast, ulangAktif]);

  useEffect(() => {
    return aturEventAudio();
  }, [aturEventAudio, laguSaatIni?.url]);

  useEffect(() => {
    const el = refAudio.current;
    const url = laguSaatIni?.url || "";
    if (!el || !audioSiap || !url || refUrlAudioTerakhir.current === url) return;

    refUrlAudioTerakhir.current = url;
    setWaktuSaatIni(0);
    setDurasiDetik(0);
    el.load();

    if (!sedangMain) return;

    el.play()
      .then(() => setSedangMain(true))
      .catch(() => {
        setSedangMain(false);
        toast({
          title: "Pemutaran gagal",
          description: "Tekan tombol play untuk melanjutkan.",
          variant: "error",
        });
      });
  }, [audioSiap, laguSaatIni?.url, sedangMain, toast]);

  // ---------- Kontrol dasar ----------
  const mainkanSfxSingkat = useCallback((durasiMs = 280) => {
    const el = refSfx.current;
    if (!el || !audioSiap) return;
    try {
      if (refSfxTimeout.current) {
        clearTimeout(refSfxTimeout.current);
      }
      el.currentTime = 0;
      el.volume = 0.35; // jangan terlalu keras
      el.play().then(() => {
        refSfxTimeout.current = setTimeout(() => {
          try {
            el.pause();
          } catch {}
          refSfxTimeout.current = null;
        }, durasiMs);
      });
    } catch {}
  }, [audioSiap]);

  const handleToggleMain = useCallback(() => {
    const el = refAudio.current;
    if (!el) return;

    if (!audioSiap) {
      setAudioSiap(true);
      setSedangMain(true);
      return;
    }

    if (sedangMain) {
      el.pause();
      setSedangMain(false);
    } else {
      el.play()
        .then(() => setSedangMain(true))
        .catch(() =>
          toast({
            title: "Pemutaran gagal",
            description: "Tekan tombol play untuk mencoba lagi.",
            variant: "error",
          }),
        );
    }
  }, [audioSiap, sedangMain, toast]);

  const pilihIndeksBerikutAcak = useCallback((currentIdx, listLength) => {
    if (!listLength || listLength <= 1) return 0;
    let next = currentIdx;
    while (next === currentIdx) {
      next = Math.floor(Math.random() * listLength);
    }
    return next;
  }, []);

  const handleBerikut = useCallback(
    (dariError = false) => {
      mainkanSfxSingkat();
      setWaktuSaatIni(0);
      setDurasiDetik(0);

      setIndeksLagu((idx) => {
        const nextIdx = acakAktif
          ? pilihIndeksBerikutAcak(idx, daftarTersaring.length)
          : (idx + 1) % daftarTersaring.length;
        return nextIdx;
      });

      const el = refAudio.current;
      if (el && sedangMain && !dariError) {
        // leave to loadedmetadata event to handle play()
      }
    },
    [
      mainkanSfxSingkat,
      acakAktif,
      daftarTersaring.length,
      sedangMain,
      pilihIndeksBerikutAcak,
    ],
  );

  // keep latest reference so audio events can call it without depending on
  // the function during initialization (prevents TDZ during SSR/dev).
  useEffect(() => {
    refHandleBerikut.current = handleBerikut;
  }, [handleBerikut]);

  const handleSebelumnya = useCallback(() => {
    mainkanSfxSingkat();
    setWaktuSaatIni(0);

    setIndeksLagu((idx) => {
      if (acakAktif) return pilihIndeksBerikutAcak(idx, daftarTersaring.length);
      const prev = idx - 1;
      return prev < 0 ? daftarTersaring.length - 1 : prev;
    });
  }, [
    mainkanSfxSingkat,
    acakAktif,
    daftarTersaring.length,
    pilihIndeksBerikutAcak,
  ]);

  const handleUbahGenre = (e) => {
    const nilai = e.target.value;
    setGenreTerpilih(nilai);
    setIndeksLagu(0); // reset ke lagu pertama di genre terpilih
  };

  const handleSeek = (e) => {
    const el = refAudio.current;
    if (!el || durasiDetik <= 0) return;
    const persent = Number(e.target.value); // 0..100
    const targetDetik = (persent / 100) * durasiDetik;
    el.currentTime = targetDetik;
    setWaktuSaatIni(targetDetik);
  };

  const handleUbahVolume = (e) => {
    const v = Number(e.target.value); // 0..100
    setVolumeMusik(v);
  };

  const toggleAcak = () => setAcakAktif((v) => !v);
  const toggleUlang = () => setUlangAktif((v) => !v);

  // ---------- Keyboard shortcut ----------
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.defaultPrevented) return;
      // hindari jika user mengetik di input
      const tag = (ev.target?.tagName || "").toLowerCase();
      if (
        ["input", "textarea", "select", "button"].includes(tag) ||
        ev.target?.isContentEditable
      )
        return;

      if (ev.code === "ArrowRight") {
        ev.preventDefault();
        handleBerikut();
      } else if (ev.code === "ArrowLeft") {
        ev.preventDefault();
        handleSebelumnya();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleBerikut, handleSebelumnya]);

  // ---------- Audio recovery after sleep/freeze ----------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab kembali visible - coba resume audio jika seharusnya playing
        const el = refAudio.current;
        if (!el || !sedangMain) return;

        // Jika seharusnya playing tapi paused, coba resume (best-effort)
        if (el.paused) {
          // attempt resume after visibility change (best-effort)
          el.play().catch((err) => {
            console.warn(
              "[MusicPlayer] Auto-resume blocked by browser policy:",
              err?.message || err,
            );
            toast({
              title: "Musik terhenti",
              description: "Tekan play untuk melanjutkan.",
              variant: "error",
            });
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [sedangMain, toast]);

  useEffect(() => {
    if (audioSiap) return;
    const aktifkanAudio = () => setAudioSiap(true);
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((eventName) =>
      window.addEventListener(eventName, aktifkanAudio, { once: true, passive: true }),
    );
    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, aktifkanAudio),
      );
    };
  }, [audioSiap]);

  useEffect(() => {
    const audioNode = refAudio.current;
    const sfxNode = refSfx.current;
    return () => {
      if (refSfxTimeout.current) {
        clearTimeout(refSfxTimeout.current);
      }
      audioNode?.pause();
      sfxNode?.pause();
    };
  }, []);

  // Progress (0..100)
  const progressPersen = useMemo(() => {
    if (!durasiDetik || durasiDetik <= 0) return 0;
    return Math.min(100, Math.max(0, (waktuSaatIni / durasiDetik) * 100));
  }, [waktuSaatIni, durasiDetik]);

  // Pastikan indeks tidak out-of-bounds ketika filter berubah
  useEffect(() => {
    if (indeksLagu >= daftarTersaring.length) {
      setIndeksLagu(0);
    }
  }, [daftarTersaring.length, indeksLagu]);

  return (
    <div className="Mp__bungkus">
      {/* Elemen audio utama */}
      <audio
        ref={refAudio}
        src={audioSiap ? laguSaatIni?.url : undefined}
        preload="none"
        aria-label="Pemutar musik"
      />

      {/* SFX singkat (diambil dari /public/effects). BUKAN ambient loop. */}
      <audio
        ref={refSfx}
        src={audioSiap ? "/effects/keyboard.mp3" : undefined}
        preload="none"
      />

      <div className="Mp">
        {/* Judul & info lagu */}
        <div className="Mp__info">
          <div
            className="Mp__judul"
            title={laguSaatIni?.judul || "Tanpa judul"}
          >
            {laguSaatIni?.judul || "Tanpa judul"}
          </div>
          <div className="Mp__genre">
            {genreTerpilih === SEMUA ? "semua genre" : genreTerpilih}
          </div>
        </div>

        {/* Progress */}
        <div className="Mp__progress">
          <span className="Mp__waktu">{formatDetik(waktuSaatIni)}</span>
          <input
            className="Mp__slider Mp__slider--progress"
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressPersen}
            onChange={handleSeek}
            aria-label="Geser untuk mencari posisi lagu"
          />
          <span className="Mp__waktu">{formatDetik(durasiDetik)}</span>
        </div>

        {/* Kontrol utama */}
        <div className="Mp__kontrol">
          <button
            className="Mp__tombol"
            onClick={handleSebelumnya}
            aria-label="Lagu sebelumnya (←)"
          >
            ◀
          </button>

          <button
            className={`Mp__tombol Mp__tombol--utama ${
              sedangMain ? "is-active" : ""
            }`}
            onClick={handleToggleMain}
            aria-label={sedangMain ? "Jeda musik" : "Putar musik"}
          >
            {sedangMain ? "❚❚" : "▶"}
          </button>

          <button
            className="Mp__tombol"
            onClick={handleBerikut}
            aria-label="Lagu berikutnya (→)"
          >
            ▶
          </button>
        </div>

        {/* Volume & opsi */}
        <div className="Mp__opsi">
          <div className="Mp__opsi-left">
            <button
              className="Mp__wallpaper-btn"
              onClick={onGantiWallpaper}
              type="button"
              aria-label="Ganti wallpaper"
            >
              {namaWallpaper}
            </button>
            <label className="Mp__label" htmlFor="volume-musik">
              volume {volumeMusik}%
            </label>
            <input
              id="volume-musik"
              className="Mp__slider Mp__slider--volume"
              type="range"
              min="0"
              max="100"
              step="1"
              value={volumeMusik}
              onChange={handleUbahVolume}
              aria-label="Atur volume musik"
            />
          </div>

          <div className="Mp__opsi-bar">
            <label className="Mp__label" htmlFor="pilih-genre">
              genre
            </label>
            <select
              id="pilih-genre"
              className="Mp__select"
              value={genreTerpilih}
              onChange={handleUbahGenre}
              aria-label="Pilih genre"
            >
              <option value={SEMUA}>semua</option>
              {daftarGenre.map((g) => (
                <option key={g.nama} value={g.nama}>
                  {g.nama}
                </option>
              ))}
            </select>

            <button
              className={`Mp__chip ${acakAktif ? "is-on" : ""}`}
              onClick={toggleAcak}
              aria-pressed={acakAktif}
              aria-label="Acak lagu"
              type="button"
            >
              acak
            </button>

            <button
              className={`Mp__chip ${ulangAktif ? "is-on" : ""}`}
              onClick={toggleUlang}
              aria-pressed={ulangAktif}
              aria-label="Ulangi lagu"
              type="button"
            >
              ulang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
