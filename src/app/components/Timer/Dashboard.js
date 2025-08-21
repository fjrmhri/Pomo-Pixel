"use client";

import { useEffect, useState } from "react";
import "../../styles/Dashboard.css";

const OPSI = [
  { kunci: "work", label: "fokus", deskripsi: "Sesi fokus (kerja)" },
  { kunci: "short", label: "istirahat", deskripsi: "Istirahat singkat" },
  { kunci: "long", label: "panjang", deskripsi: "Istirahat panjang" },
];

export default function Dashboard({
  periodeAktif = "work",
  setPeriodeAktif,
  className = "",
}) {
  const [pesanKesalahan, setPesanKesalahan] = useState("");

  const gantiPeriode = (kunci) => {
    setPesanKesalahan("");
    if (typeof setPeriodeAktif !== "function") {
      setPesanKesalahan("Fungsi setPeriodeAktif belum dipasang dari parent.");
      return;
    }
    try {
      setPeriodeAktif(kunci);
    } catch (e) {
      console.error("Gagal mengubah periode:", e);
      setPesanKesalahan("Terjadi masalah saat mengubah periode. Coba lagi.");
    }
  };

  // keyboard shortcut
  useEffect(() => {
    const onKey = (ev) => {
      const tag = (ev.target?.tagName || "").toLowerCase();
      if (["input", "textarea"].includes(tag) || ev.target?.isContentEditable)
        return;
      if (ev.key === "1") gantiPeriode("work");
      if (ev.key === "2") gantiPeriode("short");
      if (ev.key === "3") gantiPeriode("long");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`Db__bungkus ${className}`}>
      <div className="Db__row-top">
        {/* Tabs sesi kiri-atas */}
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
