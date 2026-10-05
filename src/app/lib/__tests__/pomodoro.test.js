import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PERIODE,
  durasiPeriodeDetik,
  formatMMSS,
  hitungSisaDetik,
  periodeBerikutnya,
} from "../pomodoro.js";

describe("durasiPeriodeDetik", () => {
  const cfg = { workLen: 50, shortBreakLen: 10, longBreakLen: 30 };

  test("mengikuti pengaturan per periode", () => {
    assert.equal(durasiPeriodeDetik(PERIODE.work, cfg), 3000);
    assert.equal(durasiPeriodeDetik(PERIODE.short, cfg), 600);
    assert.equal(durasiPeriodeDetik(PERIODE.long, cfg), 1800);
  });

  test("nilai kosong/tidak valid jatuh ke default, minimum 1 menit", () => {
    assert.equal(durasiPeriodeDetik(PERIODE.work, {}), 1500);
    assert.equal(durasiPeriodeDetik(PERIODE.short, { shortBreakLen: -3 }), 60);
    assert.equal(durasiPeriodeDetik("lain", cfg), 1500);
  });
});

describe("hitungSisaDetik", () => {
  test("dibulatkan ke atas dan tidak pernah negatif", () => {
    assert.equal(hitungSisaDetik(10_500, 0), 11);
    assert.equal(hitungSisaDetik(1_000, 1_000), 0);
    assert.equal(hitungSisaDetik(1_000, 9_000), 0);
  });

  test("tab yang lama disembunyikan langsung menghasilkan 0", () => {
    const target = 25 * 60 * 1000;
    assert.equal(hitungSisaDetik(target, target + 60 * 60 * 1000), 0);
  });
});

describe("periodeBerikutnya", () => {
  test("istirahat panjang setiap kelipatan interval", () => {
    const urutan = [];
    for (let selesai = 0; selesai < 8; selesai += 1) {
      urutan.push(periodeBerikutnya(PERIODE.work, selesai, 4));
    }
    assert.deepEqual(urutan, [
      "short", "short", "short", "long",
      "short", "short", "short", "long",
    ]);
  });

  test("setelah istirahat selalu kembali ke fokus", () => {
    assert.equal(periodeBerikutnya(PERIODE.short, 1, 4), PERIODE.work);
    assert.equal(periodeBerikutnya(PERIODE.long, 4, 4), PERIODE.work);
  });

  test("interval minimum 2", () => {
    assert.equal(periodeBerikutnya(PERIODE.work, 0, 1), PERIODE.short);
    assert.equal(periodeBerikutnya(PERIODE.work, 1, 1), PERIODE.long);
  });
});

test("formatMMSS", () => {
  assert.deepEqual(formatMMSS(1500), { mm: "25", ss: "00" });
  assert.deepEqual(formatMMSS(65), { mm: "01", ss: "05" });
  assert.deepEqual(formatMMSS(0), { mm: "00", ss: "00" });
});
