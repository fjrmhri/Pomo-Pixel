"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import "../../styles/Wallpaper.css";

/**
 * Komponen Wallpaper
 * -------------------------------------------
 * Menampilkan gambar full-screen dari folder /public/images.
 * - Otomatis melakukan fade-in saat gambar selesai dimuat.
 * - Menerapkan filter kecerahan (brightness) via CSS variable.
 * - Menangani error dengan tampilan fallback dan pesan jelas.
 *
 * Props:
 * - src: (opsional) string, bisa:
 *     1) nama file di /public/images, ex: "background.jpg"
 *     2) path absolut ke public, ex: "/images/background.jpg"
 *   Jika tidak diberikan, akan pakai default "/images/background.jpg".
 *
 * - kecerahan: (opsional) number, default 1.0
 *   Mengatur tingkat brightness, ex: 0.8 (lebih gelap) – 1.2 (lebih terang)
 *
 * - efekPixel: (opsional) boolean, default false
 *   Jika true, pakai image-rendering: pixelated agar vibe pixel lebih kerasa
 *
 * - alt: (opsional) string alt text (aksesibilitas), default "Wallpaper"
 *
 * - prioritas: (opsional) boolean, default true
 *   Jika true, Next.js akan nge-prioritaskan load (berguna untuk hero image)
 *
 * - onSelesaiMuat / onGagalMuat: (opsional) callback untuk event load/error
 *
 * - className: (opsional) string untuk menambah kelas CSS tambahan
 */
export default function Wallpaper({
  src,
  kecerahan = 1,
  efekPixel = false,
  alt = "Wallpaper",
  prioritas = true,
  onSelesaiMuat,
  onGagalMuat,
  className = "",
}) {
  // Terjemahkan path Windows (D:\\tes\\music-player\\public\\images\\...) menjadi URL publik Next: /images/...
  const sumberFinal = useMemo(() => {
    if (!src || typeof src !== "string" || src.trim() === "") {
      return "/images/background.jpg";
    }
    // Jika user hanya mengirim nama file, prefix dengan /images/
    if (!src.startsWith("/")) return `/images/${src}`;
    // Jika sudah path absolut ke public (mis. /images/background.jpg), pakai apa adanya
    return src;
  }, [src]);

  const bypassOptimization = useMemo(
    () => /\.gif$/i.test(sumberFinal),
    [sumberFinal]
  );

  const [gagal, setGagal] = useState(false);
  const [siap, setSiap] = useState(false);

  // Reset state saat sumber gambar berubah
  useEffect(() => {
    setGagal(false);
    setSiap(false);
  }, [sumberFinal]);

  const tanganiLoad = () => {
    setSiap(true);
    if (typeof onSelesaiMuat === "function") onSelesaiMuat(sumberFinal);
  };

  const tanganiError = (e) => {
    console.error("[Wallpaper] Gagal memuat:", sumberFinal, e);
    setGagal(true);
    if (typeof onGagalMuat === "function") onGagalMuat(sumberFinal, e);
  };

  return (
    <div
      className={`Wallpaper ${className}`}
      // Gunakan CSS variable untuk filter brightness agar mudah dikontrol
      style={{ ["--kecerahan"]: kecerahan }}
      aria-label="Latar belakang halaman"
    >
      {gagal ? (
        // Tampilan fallback jika gambar gagal dimuat
        <div className="Wallpaper__fallback" role="alert">
          <p className="Wallpaper__fallback-teks">
            Gagal memuat wallpaper: <span className="Wallpaper__path">{sumberFinal}</span>
          </p>
          <p className="Wallpaper__fallback-hint">
            Pastikan file ada di <code>/public/images</code> dan nama filenya benar.
          </p>
        </div>
      ) : (
        <Image
          src={sumberFinal}
          alt={alt}
          fill
          // Ukuran responsif supaya Next optimalkan pemuatan
          sizes="100vw"
          priority={prioritas}
          unoptimized={bypassOptimization}
          // Kelas untuk object-fit cover + efek fade-in
          className={[
            "Wallpaper__img",
            siap ? "Wallpaper__img--tampil" : "Wallpaper__img--loading",
            efekPixel ? "Wallpaper__img--pixel" : "",
          ].join(" ")}
          onLoad={tanganiLoad}
          onError={tanganiError}
        />
      )}

      {/* (Opsional) Overlay gradasi tipis agar teks di atas tetap kontras */}
      <div className="Wallpaper__overlay" aria-hidden />
    </div>
  );
}
