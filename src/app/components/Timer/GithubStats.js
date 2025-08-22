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
import "../../styles/GithubStats.css";
import "../../styles/SettingsForm.css";
import Modal from "./Modal";
import { redirectToGitHub } from "../../github";

export default function GithubStats({
  githubUser,
  githubEvents = [],
  className = "",
}) {
  // ---------------- Muat data Firestore / localStorage (sekali saat mount & saat uid ganti) ----------------

  return (
    <>
      <section className={`Stat ${className || ""}`}>
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            className="Sf__btn Sf__btn--primary"
            onClick={() => {
              if (githubUser) {
                setBukaGithub(true);
              } else {
                redirectToGitHub();
              }
            }}
          >
            {githubUser ? "GitHub" : "Login GitHub"}
          </button>
          <div className="Stat__section-title flex-1 text-center">
            Github Stats
          </div>
        </div>

        {/* Pesan error (jika ada) */}
        {pesanError && (
          <div className="Stat__alert error" role="alert">
            {pesanError}
          </div>
        )}
      </section>

      <Modal
        buka={bukaGithub}
        tutup={() => setBukaGithub(false)}
        judul="GitHub Data"
        lebar="lg"
      >
        {githubUser ? (
          <div className="Stat__github">
            {githubEvents.length > 0 && (
              <ul className="Stat__github-list">
                {githubEvents.map((ev) => (
                  <li key={ev.id} className="Stat__github-item">
                    <span className="repo">{ev.repo}</span>
                    <span className="commit">{ev.commit?.slice(0, 7)}</span>
                    <span className="changes">
                      +{ev.additions}/-{ev.deletions}
                    </span>
                    <span className="time">
                      {new Date(ev.time).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-center">
              {githubUser && (
                <>
                  <img
                    src={`https://github-readme-stats.vercel.app/api?username=${githubUser.login}&show_icons=true&title_color=ffcc00&icon_color=00ffff&text_color=daf7dc&bg_color=1e1e2f&hide=issues&count_private=true&include_all_commits=true`}
                    width="48%"
                  />
                  <img
                    src={`https://github-readme-stats.vercel.app/api/top-langs/?username=${githubUser.login}&layout=compact&text_color=daf7dc&bg_color=1e1e2f&hide=php`}
                    width="37.5%"
                  />
                </>
              )}
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="Sf__btn Sf__btn--primary w-full"
            onClick={() => redirectToGitHub()}
          >
            Login with GitHub
          </button>
        )}
      </Modal>
    </>
  );
}
