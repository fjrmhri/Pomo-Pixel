// Util statistik bersama untuk page.js dan UserStatistics.js.

export const formatTanggal = (d = new Date()) => {
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const angkaAman = (nilai) => {
  const n = Number(nilai);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Menyeragamkan data statistik dari Firestore/localStorage.
// totalMenit dihitung ulang dari fokus + istirahat bila tidak tersedia.
export function normalisasiStatistik(data) {
  const d = data && typeof data === "object" ? data : {};
  const menitFokus = angkaAman(d.menitFokus);
  const menitIstirahat = angkaAman(d.menitIstirahat);
  const totalMenit =
    d.totalMenit == null ? menitFokus + menitIstirahat : angkaAman(d.totalMenit);
  return { totalMenit, menitFokus, menitIstirahat };
}
