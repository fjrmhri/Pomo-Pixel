"use client";

import { useEffect, useState } from "react";
import "../../styles/LocationWidget.css";

/**
 * LocationWidget
 * ------------------------------------------------------------------
 * Meminta izin lokasi sekali saat mount. Jika diizinkan, widget menampilkan
 * jam real-time atau cuaca (mode ditentukan lewat pengaturan aplikasi).
 * - Jam diperbarui tiap detik.
 * - Cuaca diambil dari API open-meteo.com berdasarkan koordinat pengguna.
 */
export default function LocationWidget({ mode, className = "" }) {
  const [permission, setPermission] = useState("pending"); // pending | granted | denied
  const [coords, setCoords] = useState(null);
  const [clock, setClock] = useState(() => new Date());
  const [weather, setWeather] = useState(null);

  // Minta geolocation saat pertama kali
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermission("denied");
      console.warn("LocationWidget: geolocation tidak tersedia pada browser ini.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermission("granted");
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (error) => {
        setPermission("denied");
        console.warn("LocationWidget: gagal mendapatkan izin lokasi:", error);
      }
    );
  }, []);

  // Update jam tiap detik ketika mode time
  useEffect(() => {
    if (mode !== "time") return;
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Ambil data cuaca ketika mode weather
  useEffect(() => {
    if (permission !== "granted" || mode !== "weather" || !coords) return;
    const controller = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((d) => setWeather(d.current_weather))
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.error("LocationWidget: gagal memuat data cuaca:", error);
        setWeather(null);
      });
    return () => controller.abort();
  }, [permission, mode, coords]);

  // Jika izin lokasi belum diberikan atau mode tidak valid, tidak tampilkan widget
  if (permission !== "granted" || (mode !== "time" && mode !== "weather"))
    return null;

  return (
    <div className={`Loc ${className}`}>
      <div className="Loc__content">
        {mode === "time"
          ? clock.toLocaleTimeString()
          : weather
          ? `${weather.temperature}°C`
          : "Loading..."}
      </div>
    </div>
  );
}
