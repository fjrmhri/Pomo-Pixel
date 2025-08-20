"use client";

/**
 * Dashboard (Panel Kiri-Atas)
 * -------------------------------------------------------
 * Fungsi:
 * - Memilih sesi: fokus (work), istirahat singkat (short), istirahat panjang (long)
 * - Membuka modal Pengaturan & Statistik (ikon dari /public/images)
 * - Menampilkan status login (opsional)
 * - Keyboard shortcut: 1=fokus, 2=short, 3=long
 *
 * Catatan:
 * - Dibuat selaras gaya pixel + font Monocraft.
 * - Tidak melempar error fatal bila prop opsional belum di-pass;
 *   hanya menampilkan toast peringatan singkat.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import "../../styles/Dashboard.css";

const OPSI = [
  { kunci: "work", label: "fokus", deskripsi: "Sesi fokus (kerja)" },
  { kunci: "short", label: "istirahat", deskripsi: "Istirahat singkat" },
  { kunci: "long", label: "panjang", deskripsi: "Istirahat panjang" },
];

export default function Dashboard({
  // status periode & pengubahnya (harusnya dipasang dari parent / page.js)
  periodeAktif = "work",
  setPeriodeAktif, // function(period)

  // pembuka modal (opsional)
  onBukaPengaturan, // function()
  onBukaStatistik, // function()

  // status login opsional
  statusLogin, // boolean
  namaPengguna, // string

  // kelas tambahan opsional
  className = "",
}) {
  const [pesanKesalahan, setPesanKesalahan] = useState("");

  // handler ganti periode dengan validasi sederhana
  const gantiPeriode = (kunci) => {
    setPesanKesalahan(""); // reset pesan

    if (typeof setPeriodeAktif !== "function") {
      setPesanKesalahan(
        "Tidak bisa mengganti sesi: fungsi 'setPeriodeAktif' belum dipasang dari parent."
      );
      return;
    }
    try {
      setPeriodeAktif(kunci); // Mengubah periode aktif
    } catch (e) {
      console.error("Gagal mengubah periode:", e);
      setPesanKesalahan("Terjadi masalah saat mengubah periode. Coba lagi.");
    }
  };

  // keyboard shortcut: 1/2/3 untuk pilih sesi
  useEffect(() => {
    const onKey = (ev) => {
      const tag = (ev.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || ev.target?.isContentEditable)
        return;

      if (ev.key === "1") gantiPeriode("work");
      if (ev.key === "2") gantiPeriode("short");
      if (ev.key === "3") gantiPeriode("long");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // klik ikon helper
  const tekanPengaturan = () => {
    if (typeof onBukaPengaturan === "function") {
      try {
        onBukaPengaturan();
        return;
      } catch (e) {
        console.error(e);
      }
    }
    setPesanKesalahan("Aksi pengaturan belum dihubungkan.");
  };

  const tekanStatistik = () => {
    if (typeof onBukaStatistik === "function") {
      try {
        onBukaStatistik();
        return;
      } catch (e) {
        console.error(e);
      }
    }
    setPesanKesalahan("Aksi statistik belum dihubungkan.");
  };

  return (
    <div className={`Db__bungkus ${className}`}>
      <div className="Db__row-top">
        {/* Tabs di kiri */}
        <div
          className="Db__tabs"
          role="tablist"
          aria-label="Pilih sesi pomodoro"
        >
          {OPSI.map((o) => {
            const aktif = periodeAktif === o.kunci;
            return (
              <button
                key={o.kunci}
                role="tab"
                aria-selected={aktif}
                className={`Db__tab ${aktif ? "is-aktif" : ""}`}
                onClick={() => gantiPeriode(o.kunci)}
                title={o.deskripsi}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {/* Ikon & status di kanan */}
        <div className="Db__kanan">
          <div className="Db__ikonbar" aria-label="Aksi cepat">
            <button
              className="Db__ikonbtn"
              onClick={tekanPengaturan}
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

            <button
              className="Db__ikonbtn"
              onClick={tekanStatistik}
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
          </div>

          <div className="Db__status">
            <span
              className={`Db__dot ${statusLogin ? "is-on" : "is-off"}`}
              aria-label={statusLogin ? "login" : "offline"}
            />
            <span className="Db__status-teks">
              {statusLogin
                ? namaPengguna
                  ? `halo, ${namaPengguna}`
                  : "login"
                : "offline"}
            </span>
          </div>
        </div>

        {/* Pesan error kecil */}
        {pesanKesalahan && (
          <div className="Db__error" role="alert">
            {pesanKesalahan}
          </div>
        )}
      </div>
    </div>
  );
}
