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
export default function LocationWidget({ mode = "time", className = "" }) {
  const [permission, setPermission] = useState("pending"); // pending | granted | denied
  const [coords, setCoords] = useState(null);
=======
 * Meminta izin lokasi sekali saat mount. Jika diizinkan, pengguna dapat
 * memilih menampilkan jam real-time atau cuaca saat ini (hanya satu opsi).
 * - Jam diperbarui tiap detik.
 * - Cuaca diambil dari API open-meteo.com berdasarkan koordinat pengguna.
 */
export default function LocationWidget({ className = "" }) {
  const [permission, setPermission] = useState("pending"); // pending | granted | denied
  const [coords, setCoords] = useState(null);
  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lp_loc_mode") || "time";
    }
    return "time";
  });
  const [clock, setClock] = useState(() => new Date());
  const [weather, setWeather] = useState(null);

  // minta geolocation saat pertama kali
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermission("denied");
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
      () => {
        setPermission("denied");
      }
    );
  }, []);

  // simpan mode pilihan ke localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lp_loc_mode", mode);
    }
  }, [mode]);

  // update jam tiap detik ketika mode time
  useEffect(() => {
    if (mode !== "time") return;
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, [mode]);

  // ambil data cuaca ketika mode weather
  useEffect(() => {
    if (permission !== "granted" || mode !== "weather" || !coords) return;
    const controller = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((d) => setWeather(d.current_weather))
      .catch(() => {});
    return () => controller.abort();
  }, [permission, mode, coords]);

  if (permission !== "granted" || (mode !== "time" && mode !== "weather"))
    return null;

  return (
    <div className={`Loc ${className}`}>
  if (permission !== "granted") return null;

  return (
    <div className={`Loc ${className}`}> 
      <div className="Loc__toggle">
        <button
          className={`Loc__btn ${mode === "time" ? "is-aktif" : ""}`}
          onClick={() => setMode("time")}
        >
          Time
        </button>
        <button
          className={`Loc__btn ${mode === "weather" ? "is-aktif" : ""}`}
          onClick={() => setMode("weather")}
        >
          Weather
        </button>
      </div>
      <div className="Loc__content">
        {mode === "time"
          ? clock.toLocaleTimeString()
          : weather
          ? `${weather.temperature}°C`
          : "..."}
      </div>
    </div>
  );
}
