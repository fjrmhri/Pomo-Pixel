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

export default function MusicPlayer() {
  // ---------- Refs & State utama ----------
  const refAudio = useRef(null);
  const refSfx = useRef(null); // efek klik singkat (bukan ambient loop)

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
  const [pesanKesalahan, setPesanKesalahan] = useState("");

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
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "mp_setelan",
        JSON.stringify({ volumeMusik, acakAktif, ulangAktif, genreTerpilih })
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
      // autoplay ketika user sebelumnya sudah menekan play
      if (sedangMain) {
        el.play().catch(() => {
          // autoplay mungkin diblokir — biarkan user tekan tombol play
        });
      }
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
      // pindah ke lagu berikutnya
      handleBerikut();
    };

    const onError = () => {
      setPesanKesalahan("Gagal memuat lagu, melewati ke lagu berikutnya.");
      // skip otomatis
      handleBerikut(true);
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
  }, [sedangMain, ulangAktif]); // dep: status pemutaran & repeat

  useEffect(() => {
    return aturEventAudio();
  }, [aturEventAudio, laguSaatIni?.url]);

  // ---------- Kontrol dasar ----------
  const mainkanSfxSingkat = useCallback((durasiMs = 280) => {
    const el = refSfx.current;
    if (!el) return;
    try {
      el.currentTime = 0;
      el.volume = 0.35; // jangan terlalu keras
      el.play().then(() => {
        setTimeout(() => {
          try {
            el.pause();
          } catch {}
        }, durasiMs);
      });
    } catch {}
  }, []);

  const handleToggleMain = () => {
    const el = refAudio.current;
    if (!el) return;

    // reset pesan error saat user berinteraksi
    setPesanKesalahan("");

    if (sedangMain) {
      el.pause();
      setSedangMain(false);
    } else {
      el.play()
        .then(() => {
          setSedangMain(true);
        })
        .catch(() => {
          // autoplay diblokir; user perlu klik kembali
          setPesanKesalahan(
            "Tidak dapat mulai otomatis. Coba tekan tombol Play."
          );
        });
    }
  };

  const pilihIndeksBerikutAcak = () => {
    if (daftarTersaring.length <= 1) return 0;
    let next = indeksLagu;
    // cari indeks berbeda dari sekarang
    while (next === indeksLagu) {
      next = Math.floor(Math.random() * daftarTersaring.length);
    }
    return next;
  };

  const handleBerikut = (dariError = false) => {
    mainkanSfxSingkat();
    setWaktuSaatIni(0);

    setIndeksLagu((idx) => {
      const nextIdx = acakAktif
        ? pilihIndeksBerikutAcak()
        : (idx + 1) % daftarTersaring.length;
      return nextIdx;
    });

    // jika sedangMain, coba teruskan otomatis ke lagu berikutnya
    const el = refAudio.current;
    if (el && sedangMain && !dariError) {
      // biarkan event loadedmetadata yang akan memanggil .play()
      // untuk menghindari race condition.
    }
  };

  const handleSebelumnya = () => {
    mainkanSfxSingkat();
    setWaktuSaatIni(0);

    setIndeksLagu((idx) => {
      if (acakAktif) return pilihIndeksBerikutAcak();
      const prev = idx - 1;
      return prev < 0 ? daftarTersaring.length - 1 : prev;
    });
  };

  const handleUbahGenre = (e) => {
    const nilai = e.target.value;
    setGenreTerpilih(nilai);
    setIndeksLagu(0); // reset ke lagu pertama di genre terpilih
    setPesanKesalahan("");
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
      // hindari jika user mengetik di input
      const tag = (ev.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || ev.target?.isContentEditable)
        return;

      if (ev.code === "Space") {
        ev.preventDefault();
        handleToggleMain();
      } else if (ev.code === "ArrowRight") {
        ev.preventDefault();
        handleBerikut();
      } else if (ev.code === "ArrowLeft") {
        ev.preventDefault();
        handleSebelumnya();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleBerikut, handleSebelumnya, sedangMain]);

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
        src={laguSaatIni?.url}
        preload="metadata"
        aria-label="Pemutar musik"
      />

      {/* SFX singkat (diambil dari /public/effects). BUKAN ambient loop. */}
      <audio ref={refSfx} src="/effects/keyboard.mp3" preload="auto" />

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
            aria-label={sedangMain ? "Jeda (Space)" : "Putar (Space)"}
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
          <label className="Mp__label" htmlFor="volume-musik">
            volume {volumeMusik}%
          </label>
          <input
            id="volume-musik"
            className="Mp__slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={volumeMusik}
            onChange={handleUbahVolume}
            aria-label="Atur volume musik"
          />

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

        {/* Pesan error singkat */}
        {pesanKesalahan && (
          <div className="Mp__error" role="alert">
            {pesanKesalahan}
          </div>
        )}
      </div>
    </div>
  );
}
