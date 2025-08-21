"use client";

/**
 * UserStatistics (Panel Statistik)
 * ------------------------------------------------------------------
 * Menampilkan ringkasan menit fokus, menit istirahat, dan total menit.
 * - Mode tampilan: "total" (default) atau "hari ini"
 * - Menggunakan posisi statis tanpa drag.
 * - Sumber data berlapis:
 *   1) Props dari parent (jika ada) → prioritas tertinggi
 *   2) Firestore (jika login dan dokumen tersedia)
 *   3) localStorage (jika ada data)
 */

import { useEffect, useMemo, useState } from "react";
import "../../styles/UserStatistics.css";

import { db, auth } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Konstanta struktur koleksi Firestore
const NAMA_KOLEKSI = "users";
const SUBCOLL_STAT = "statistik"; // users/<uid>/statistik
const DOK_AGREGAT = "agregat"; // users/<uid>/statistik/agregat
const SUBCOLL_HARIAN = "statistik_harian"; // users/<uid>/statistik_harian/<YYYY-MM-DD>

// Util tanggal "hari ini" (Asia/Jakarta akan mengikuti waktu browser user)
const formatTanggal = (d = new Date()) => {
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${y}-${m}-${dd}`;
};

export default function UserStatistics({
  loggedIn,
  userId,
  totalTime,
  timeStudied,
  timeOnBreak,
  className = "",
}) {
  // ---------------- State UI ----------------
  const [modeTampil, setModeTampil] = useState("total"); // "total" | "harian"
  const [uidAktif, setUidAktif] = useState(userId || null);
  const [sedangMuat, setSedangMuat] = useState(false);
  const [pesanError, setPesanError] = useState("");

  // data bacaan (fallback-friendly)
  const [bacaTotal, setBacaTotal] = useState({
    totalMenit: Number(totalTime ?? 0),
    menitFokus: Number(timeStudied ?? 0),
    menitIstirahat: Number(timeOnBreak ?? 0),
  });

  const [bacaHarian, setBacaHarian] = useState({
    tanggal: formatTanggal(),
    menitFokus: 0,
    menitIstirahat: 0,
    totalMenit: 0,
  });

  // ---------------- Ambil UID login (jika perlu) ----------------
  useEffect(() => {
    if (userId) {
      setUidAktif(userId);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setUidAktif(user ? user.uid : null);
    });
    return () => unsub();
  }, [userId]);

  // ---------------- Sinkron data dari props ke state display ----------------
  useEffect(() => {
    const vTotal = Number.isFinite(Number(totalTime)) ? Number(totalTime) : 0;
    const vFokus = Number.isFinite(Number(timeStudied))
      ? Number(timeStudied)
      : 0;
    const vIst = Number.isFinite(Number(timeOnBreak)) ? Number(timeOnBreak) : 0;
    setBacaTotal({
      totalMenit: vTotal,
      menitFokus: vFokus,
      menitIstirahat: vIst,
    });
  }, [totalTime, timeStudied, timeOnBreak]);

  // ---------------- Muat data Firestore / localStorage (sekali saat mount & saat uid ganti) ----------------
  useEffect(() => {
    const muat = async () => {
      setSedangMuat(true);
      setPesanError("");

      try {
        // ===== TOTAL =====
        if (uidAktif) {
          // coba Firestore: users/<uid>/statistik/agregat
          const refAgregat = doc(
            db,
            NAMA_KOLEKSI,
            uidAktif,
            SUBCOLL_STAT,
            DOK_AGREGAT
          );
          const s = await getDoc(refAgregat);
          if (s.exists()) {
            const d = s.data() || {};
            setBacaTotal((prev) => ({
              totalMenit:
                Number.isFinite(prev.totalMenit) && prev.totalMenit > 0
                  ? prev.totalMenit
                  : Number(d.totalMenit ?? 0),
              menitFokus:
                Number.isFinite(prev.menitFokus) && prev.menitFokus > 0
                  ? prev.menitFokus
                  : Number(d.menitFokus ?? 0),
              menitIstirahat:
                Number.isFinite(prev.menitIstirahat) && prev.menitIstirahat > 0
                  ? prev.menitIstirahat
                  : Number(d.menitIstirahat ?? 0),
            }));
          }
        } else {
          // Fallback ke localStorage jika tidak ada di Firestore
          const raw = localStorage.getItem("lp_stats_total_v1");
          if (raw) {
            const d = JSON.parse(raw);
            setBacaTotal((prev) => ({
              totalMenit: prev.totalMenit || Number(d.totalMenit ?? 0),
              menitFokus: prev.menitFokus || Number(d.menitFokus ?? 0),
              menitIstirahat:
                prev.menitIstirahat || Number(d.menitIstirahat ?? 0),
            }));
          }
        }

        // ===== HARIAN =====
        const hariIni = formatTanggal();
        if (uidAktif) {
          // Pastikan dokumen harian ada
          const refHarian = doc(
            db,
            NAMA_KOLEKSI,
            uidAktif,
            SUBCOLL_HARIAN,
            hariIni
          );

          const h = await getDoc(refHarian);
          if (h.exists()) {
            const d = h.data() || {};
            setBacaHarian({
              tanggal: hariIni,
              menitFokus: Number(d.menitFokus ?? 0),
              menitIstirahat: Number(d.menitIstirahat ?? 0),
              totalMenit: Number(
                d.totalMenit ??
                  (Number(d.menitFokus || 0) + Number(d.menitIstirahat || 0) ||
                    0)
              ),
            });
          } else {
            // Jika dokumen harian tidak ada, tampilkan data default
            setBacaHarian({
              tanggal: hariIni,
              menitFokus: 0,
              menitIstirahat: 0,
              totalMenit: 0,
            });
          }
        } else {
          const rawH = localStorage.getItem(`lp_stats_daily_${hariIni}`);
          if (rawH) {
            const d = JSON.parse(rawH);
            setBacaHarian({
              tanggal: hariIni,
              menitFokus: Number(d.menitFokus ?? 0),
              menitIstirahat: Number(d.menitIstirahat ?? 0),
              totalMenit: Number(
                d.totalMenit ??
                  (Number(d.menitFokus ?? 0) + Number(d.menitIstirahat ?? 0) ||
                    0)
              ),
            });
          }
        }
      } catch (e) {
        console.error(e);
        setPesanError(
          "Gagal memuat statistik pengguna. Menampilkan nilai tersedia."
        );
      } finally {
        setSedangMuat(false);
      }
    };

    muat();
  }, [uidAktif]);

  // ---------------- Pilihan data yang ditampilkan ----------------
  const dataTampil = useMemo(() => {
    if (modeTampil === "harian") {
      return {
        judulKecil: `hari ini (${bacaHarian.tanggal})`,
        fokus: bacaHarian.menitFokus,
        istirahat: bacaHarian.menitIstirahat,
        total: bacaHarian.totalMenit,
      };
    }
    return {
      judulKecil: "total",
      fokus: bacaTotal.menitFokus,
      istirahat: bacaTotal.menitIstirahat,
      total: bacaTotal.totalMenit,
    };
  }, [modeTampil, bacaHarian, bacaTotal]);

  // ---------------- UI ----------------
  return (
    <section className={`Stat ${className || ""}`}>
      {/* Tabs */}
      <div className="Stat__tab">
        <button
          className={`Stat__tabbtn ${
            modeTampil === "total" ? "is-aktif" : ""
          }`}
          onClick={() => setModeTampil("total")}
          type="button"
        >
          total
        </button>
        <button
          className={`Stat__tabbtn ${
            modeTampil === "harian" ? "is-aktif" : ""
          }`}
          onClick={() => setModeTampil("harian")}
          type="button"
          title="Statistik untuk hari kalender ini"
        >
          hari ini
        </button>
      </div>

      {/* Status */}
      <div className="Stat__status">
        <span className={`Stat__dot ${loggedIn || uidAktif ? "on" : "off"}`} />
        <span className="Stat__status-teks">
          {sedangMuat
            ? "memuat…"
            : loggedIn || uidAktif
            ? "tersambung data"
            : "mode lokal"}
          <span className="Stat__sub"> • {dataTampil.judulKecil}</span>
        </span>
      </div>

      {/* Grid angka */}
      <div className="Stat__grid" role="list">
        <article className="Stat__kartu" role="listitem">
          <h4 className="Stat__kartu-judul">fokus</h4>
          <p className="Stat__angka">{Number(dataTampil.fokus || 0)}</p>
          <span className="Stat__unit">menit</span>
        </article>

        <article className="Stat__kartu" role="listitem">
          <h4 className="Stat__kartu-judul">istirahat</h4>
          <p className="Stat__angka">{Number(dataTampil.istirahat || 0)}</p>
          <span className="Stat__unit">menit</span>
        </article>

        <article className="Stat__kartu Stat__kartu-total" role="listitem">
          <h4 className="Stat__kartu-judul">total</h4>
          <p className="Stat__angka">{Number(dataTampil.total || 0)}</p>
          <span className="Stat__unit">menit</span>
        </article>
      </div>

      {/* Pesan error (jika ada) */}
      {pesanError && (
        <div className="Stat__alert error" role="alert">
          {pesanError}
        </div>
      )}
    </section>
  );
}
