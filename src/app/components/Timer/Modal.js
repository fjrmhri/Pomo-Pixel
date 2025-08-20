"use client";

/**
 * Modal (komponen generik)
 * ------------------------------------------------------------------
 * Dipakai untuk membungkus SettingsForm (dan konten lain).
 * - Tema pixel + font Monocraft
 * - Aksesibel: role="dialog", aria-modal, judul/deskripsi terhubung
 * - Bisa ditutup lewat backdrop, tombol close, dan tombol Escape
 * - Kunci scroll body saat modal terbuka
 * - Fokus otomatis ke konten modal saat terbuka
 *
 * Props:
 * - buka (boolean)                : apakah modal terbuka
 * - tutup (function)              : pemanggil untuk menutup modal
 * - judul (string)                : judul modal
 * - deskripsi (string?)           : deskripsi opsional (untuk aksesibilitas)
 * - lebar ("sm"|"md"|"lg"?)       : lebar kontainer (default "md")
 * - tutupDenganBackdrop (bool?)   : klik backdrop menutup (default true)
 * - tutupDenganEscape (bool?)     : tekan Escape menutup (default true)
 * - className (string?)           : kelas tambahan pada container konten
 * - children (ReactNode)          : isi modal
 *
 * Pesan error yang bisa muncul:
 * - Jika `tutup` bukan function → console.warn dan fallback internal
 */

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import "../../styles/Modal.css";

const kelasLebar = {
  sm: "Md__konten--sm",
  md: "Md__konten--md",
  lg: "Md__konten--lg",
};

export default function Modal({
  buka = false,
  tutup,
  judul = "pengaturan",
  deskripsi = "",
  lebar = "md",
  tutupDenganBackdrop = true,
  tutupDenganEscape = true,
  className = "",
  children,
}) {
  const idJudul = useId();
  const idDesk = useId();
  const refKonten = useRef(null);

  // Kunci scroll <body> saat modal terbuka
  useEffect(() => {
    if (!buka) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [buka]);

  // Fokus ke konten saat modal baru dibuka
  useEffect(() => {
    if (!buka) return;
    const t = setTimeout(() => {
      try {
        refKonten.current?.focus();
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, [buka]);

  // Tutup dengan Escape
  useEffect(() => {
    if (!buka || !tutupDenganEscape) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        amanTutup();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buka, tutupDenganEscape]);

  const amanTutup = () => {
    try {
      if (typeof tutup === "function") return tutup();
      console.warn("[Modal] props `tutup` bukan sebuah function.");
    } catch (e) {
      console.error("[Modal] gagal memanggil `tutup`:", e);
    }
  };

  const klikBackdrop = (e) => {
    if (!tutupDenganBackdrop) return;
    // pastikan klik tepat pada backdrop, bukan anaknya
    if (e.target === e.currentTarget) amanTutup();
  };

  if (!buka) return null;

  return (
    <div className="Md__backdrop" onMouseDown={klikBackdrop}>
      <section
        className={`Md__konten ${
          kelasLebar[lebar] || kelasLebar.md
        } ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        aria-describedby={deskripsi ? idDesk : undefined}
        tabIndex={-1}
        ref={refKonten}
      >
        <header className="Md__header">
          <div className="Md__judul">
            <Image
              src="/images/settings.png"
              alt=""
              width={18}
              height={18}
              className="Md__ikon"
              priority
            />
            <h3 id={idJudul} className="Md__judul-text">
              {judul}
            </h3>
          </div>

          <button
            type="button"
            className="Md__btn-tutup"
            onClick={amanTutup}
            aria-label="tutup"
            title="tutup"
          >
            ✕
          </button>
        </header>

        {deskripsi ? (
          <p id={idDesk} className="Md__desk">
            {deskripsi}
          </p>
        ) : null}

        <div className="Md__isi">{children}</div>
      </section>
    </div>
  );
}
