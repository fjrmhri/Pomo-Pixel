"use client";

import { useCallback, useEffect } from "react";
import "../../styles/Dashboard.css";
import { useToast } from "../ui/useToast";

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
  const { toast } = useToast();

  const gantiPeriode = useCallback(
    (kunci) => {
      if (typeof setPeriodeAktif !== "function") {
        toast({
          title: "Periode tidak bisa diubah",
          description: "Fungsi pengubah periode belum tersedia.",
          variant: "error",
        });
        return;
      }
      try {
        setPeriodeAktif(kunci);
      } catch (e) {
        console.error("Gagal mengubah periode:", e);
        toast({
          title: "Periode gagal diubah",
          description: "Coba lagi beberapa saat.",
          variant: "error",
        });
      }
    },
    [setPeriodeAktif, toast],
  );

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
  }, [gantiPeriode]);

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
      </div>
    </div>
  );
}
