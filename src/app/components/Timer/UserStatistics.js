"use client";

/**
 * UserStatistics (Panel Statistik)
 * ------------------------------------------------------------------
 * Menampilkan ringkasan menit fokus, menit istirahat, dan total menit.
 * - Mode tampilan: "total" (default) atau "hari ini"
 * - Sumber data tunggal (tidak dicampur):
 *   1) Login  → Firestore (realtime via onSnapshot)
 *   2) Tidak login / Firestore gagal → data lokal (props + localStorage)
 */

import { useEffect, useMemo, useState } from "react";
import "../../styles/Statistik.css";

import { db, auth } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "../ui/useToast";
import { formatTanggal, normalisasiStatistik } from "../../lib/statistik";

// Konstanta struktur koleksi Firestore
const NAMA_KOLEKSI = "users";
const SUBCOLL_STAT = "statistik"; // users/<uid>/statistik
const DOK_AGREGAT = "agregat"; // users/<uid>/statistik/agregat
const SUBCOLL_HARIAN = "statistik_harian"; // users/<uid>/statistik_harian/<YYYY-MM-DD>
const KEY_STATS_DAILY_PREFIX = "lp_stats_daily_";

const STAT_KOSONG = normalisasiStatistik(null);

const bacaHarianLokal = (tanggal) => {
  try {
    const raw = localStorage.getItem(`${KEY_STATS_DAILY_PREFIX}${tanggal}`);
    return normalisasiStatistik(raw ? JSON.parse(raw) : null);
  } catch (e) {
    console.error("[UserStatistics] gagal membaca statistik harian lokal", e);
    return STAT_KOSONG;
  }
};

export default function UserStatistics({
  userId,
  totalTime,
  timeStudied,
  timeOnBreak,
  className = "",
}) {
  const { toast } = useToast();
  // ---------------- State UI ----------------
  const [modeTampil, setModeTampil] = useState("total"); // "total" | "harian"
  const [uidAktif, setUidAktif] = useState(userId || null);
  const [sedangMuat, setSedangMuat] = useState(false);
  const [tanggal] = useState(() => formatTanggal());

  const [cloudTotal, setCloudTotal] = useState(null);
  const [cloudHarian, setCloudHarian] = useState(null);
  const [cloudGagal, setCloudGagal] = useState(false);
  const [lokalHarian, setLokalHarian] = useState(STAT_KOSONG);

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

  // ---------------- Data akun: Firestore realtime ----------------
  useEffect(() => {
    setCloudTotal(null);
    setCloudHarian(null);
    setCloudGagal(false);
    if (!uidAktif) {
      setSedangMuat(false);
      return;
    }

    setSedangMuat(true);
    const tanganiGagal = (e) => {
      console.error("[UserStatistics] gagal memuat statistik cloud", e);
      setCloudGagal(true);
      setSedangMuat(false);
    };

    const unsubTotal = onSnapshot(
      doc(db, NAMA_KOLEKSI, uidAktif, SUBCOLL_STAT, DOK_AGREGAT),
      (snap) => {
        setCloudTotal(normalisasiStatistik(snap.exists() ? snap.data() : null));
        setSedangMuat(false);
      },
      tanganiGagal,
    );
    const unsubHarian = onSnapshot(
      doc(db, NAMA_KOLEKSI, uidAktif, SUBCOLL_HARIAN, tanggal),
      (snap) => {
        setCloudHarian(normalisasiStatistik(snap.exists() ? snap.data() : null));
      },
      tanganiGagal,
    );

    return () => {
      unsubTotal();
      unsubHarian();
    };
  }, [uidAktif, tanggal]);

  useEffect(() => {
    if (!cloudGagal) return;
    toast({
      title: "Could not load account stats",
      description: "Showing this device's local stats.",
      variant: "error",
    });
  }, [cloudGagal, toast]);

  // ---------------- Data lokal ----------------
  const lokalTotal = useMemo(
    () =>
      normalisasiStatistik({
        totalMenit: totalTime,
        menitFokus: timeStudied,
        menitIstirahat: timeOnBreak,
      }),
    [totalTime, timeStudied, timeOnBreak],
  );

  // Dibaca ulang setiap total lokal berubah (sesi baru selesai).
  useEffect(() => {
    setLokalHarian(bacaHarianLokal(tanggal));
  }, [tanggal, totalTime]);

  // ---------------- Pilihan data yang ditampilkan ----------------
  const pakaiCloud = Boolean(uidAktif) && !cloudGagal;

  const dataTampil = useMemo(() => {
    const harian = modeTampil === "harian";
    const sumber = pakaiCloud
      ? (harian ? cloudHarian : cloudTotal) || STAT_KOSONG
      : harian
        ? lokalHarian
        : lokalTotal;
    return {
      judulKecil: harian ? `today (${tanggal})` : "all time",
      fokus: sumber.menitFokus,
      istirahat: sumber.menitIstirahat,
      total: sumber.totalMenit,
    };
  }, [
    modeTampil,
    pakaiCloud,
    cloudHarian,
    cloudTotal,
    lokalHarian,
    lokalTotal,
    tanggal,
  ]);

  // ---------------- UI ----------------
  return (
    <>
      <section className={`Stat ${className || ""}`}>
        {/* Tabs */}
        <div className="Stat__tab">
          <button
            className="ui-tombol ui-tombol--kecil Stat__tabbtn"
            aria-pressed={modeTampil === "total"}
            onClick={() => setModeTampil("total")}
            type="button"
          >
            total
          </button>
          <button
            className="ui-tombol ui-tombol--kecil Stat__tabbtn"
            aria-pressed={modeTampil === "harian"}
            onClick={() => setModeTampil("harian")}
            type="button"
            title="Stats for today's calendar date"
          >
            today
          </button>
        </div>

        {/* Status */}
        <div className="Stat__status">
          <span
            className={`ui-titik ${pakaiCloud ? "ui-titik--jalan" : ""}`}
            aria-hidden
          />
          <span className="Stat__status-teks">
            {sedangMuat
              ? "loading…"
              : pakaiCloud
                ? "account data (cloud)"
                : "local mode (this device)"}
            <span className="Stat__sub"> • {dataTampil.judulKecil}</span>
          </span>
        </div>

        {/* Grid angka */}
        <div className="Stat__grid" role="list">
          <article className="Stat__kartu" role="listitem">
            <h4 className="Stat__kartu-judul">focus</h4>
            <p className="Stat__angka">{Number(dataTampil.fokus || 0)}</p>
            <span className="Stat__unit">min</span>
          </article>

          <article
            className="Stat__kartu Stat__kartu--istirahat"
            role="listitem"
          >
            <h4 className="Stat__kartu-judul">break</h4>
            <p className="Stat__angka">{Number(dataTampil.istirahat || 0)}</p>
            <span className="Stat__unit">min</span>
          </article>

          <article className="Stat__kartu Stat__kartu-total" role="listitem">
            <h4 className="Stat__kartu-judul">total</h4>
            <p className="Stat__angka">{Number(dataTampil.total || 0)}</p>
            <span className="Stat__unit">min</span>
          </article>
        </div>
      </section>
    </>
  );
}
