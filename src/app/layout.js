"use client"; // Menandai komponen ini sebagai client-side

import "./globals.css";
import { useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react"; // gunakan 'react' jika bukan Next.js App Router

// Hapus ekspor metadata, karena itu tidak diperbolehkan di dalam komponen client-side
export default function RootLayout({ children }) {
  useEffect(() => {
    // Mengatasi masalah font dengan memastikan font Monocraft dimuat dengan benar
    const font = new FontFace("Monocraft", "url(/fonts/Monocraft.otf)");
    font
      .load()
      .then(() => {
        document.fonts.add(font);
      })
      .catch((err) => {
        console.error("Font Monocraft gagal dimuat", err);
      });
  }, []);

  return (
    <html lang="en">
      <head>
        <title>Pomo Pixel</title>
      </head>
      <body
        className="font-mono antialiased"
        style={{
          fontFamily: "Monocraft, monospace",
        }}
      >
        {children}
        <SpeedInsights /> {/* <SpeedInsights /> */}
        <Analytics />
      </body>
    </html>
  );
}
