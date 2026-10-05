"use client";

import { useCallback, useEffect } from "react";
import "../../styles/Dashboard.css";
import { useToast } from "../ui/useToast";

const OPSI = [
  { kunci: "work", label: "focus", deskripsi: "Focus session (1)" },
  { kunci: "short", label: "short break", deskripsi: "Short break (2)" },
  { kunci: "long", label: "long break", deskripsi: "Long break (3)" },
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
          title: "Cannot change session",
          description: "The session handler is not available yet.",
          variant: "error",
        });
        return;
      }
      try {
        setPeriodeAktif(kunci);
      } catch (e) {
        console.error("Gagal mengubah periode:", e);
        toast({
          title: "Could not change session",
          description: "Please try again in a moment.",
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
          aria-label="Choose pomodoro session"
        >
          {OPSI.map((o) => {
            const aktif = periodeAktif === o.kunci;
            return (
              <button
                key={o.kunci}
                type="button"
                role="tab"
                aria-selected={aktif}
                className="ui-tombol Db__tab"
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
