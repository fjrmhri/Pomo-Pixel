import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTanggal, normalisasiStatistik } from "../statistik.js";

test("formatTanggal memakai zona waktu lokal dengan zero-padding", () => {
  assert.equal(formatTanggal(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(formatTanggal(new Date(2026, 10, 30)), "2026-11-30");
});

test("normalisasiStatistik menangani data kosong/rusak", () => {
  const kosong = { totalMenit: 0, menitFokus: 0, menitIstirahat: 0 };
  assert.deepEqual(normalisasiStatistik(null), kosong);
  assert.deepEqual(normalisasiStatistik("x"), kosong);
  assert.deepEqual(
    normalisasiStatistik({ totalMenit: "abc", menitFokus: -4, menitIstirahat: NaN }),
    kosong,
  );
});

test("normalisasiStatistik menghitung total bila tidak tersedia", () => {
  assert.deepEqual(normalisasiStatistik({ menitFokus: 25, menitIstirahat: 5 }), {
    totalMenit: 30,
    menitFokus: 25,
    menitIstirahat: 5,
  });
  assert.deepEqual(
    normalisasiStatistik({ totalMenit: "40", menitFokus: "25", menitIstirahat: 15 }),
    { totalMenit: 40, menitFokus: 25, menitIstirahat: 15 },
  );
});
