// Logika murni timer pomodoro (tanpa React) agar dapat diuji unit.

export const PERIODE = {
  work: "work",
  short: "short",
  long: "long",
};

export function durasiPeriodeDetik(
  periode,
  { workLen = 25, shortBreakLen = 5, longBreakLen = 15 } = {},
) {
  if (periode === PERIODE.work) return Math.max(1, Number(workLen || 25)) * 60;
  if (periode === PERIODE.short)
    return Math.max(1, Number(shortBreakLen || 5)) * 60;
  if (periode === PERIODE.long)
    return Math.max(1, Number(longBreakLen || 15)) * 60;
  return 25 * 60;
}

export function hitungSisaDetik(targetMs, sekarangMs = Date.now()) {
  return Math.max(0, Math.ceil((Number(targetMs || 0) - sekarangMs) / 1000));
}

// jumlahWorkSelesai = jumlah sesi fokus yang selesai SEBELUM sesi ini.
export function periodeBerikutnya(periode, jumlahWorkSelesai, longBrInterval) {
  if (periode !== PERIODE.work) return PERIODE.work;
  const interval = Math.max(2, Number(longBrInterval || 4));
  return (Number(jumlahWorkSelesai || 0) + 1) % interval === 0
    ? PERIODE.long
    : PERIODE.short;
}

function pad2(n) {
  const x = Math.floor(Math.abs(Number(n)));
  return x < 10 ? `0${x}` : `${x}`;
}

export function formatMMSS(totalDetik) {
  const m = Math.floor(totalDetik / 60);
  const s = totalDetik % 60;
  return { mm: pad2(m), ss: pad2(s) };
}
