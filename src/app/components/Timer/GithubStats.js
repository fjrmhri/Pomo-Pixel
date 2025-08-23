"use client";

/**
 * GithubStats
 * ------------------------------------------------------------------
 * Menampilkan statistik GitHub dan riwayat aktivitas Push/PR.
 * - Jika belum login GitHub, tampilkan tombol login.
 * - Setelah login, tampilkan GitHub stats terlebih dahulu kemudian daftar
 *   histori commit atau pull request.
 */

import "../../styles/GithubStats.css";
import "../../styles/SettingsForm.css";
import { redirectToGitHub } from "../../github";
import { useMemo, useState } from "react";

export default function GithubStats({
  githubUser,
  githubEvents = [],
  className = "",
}) {
  const [periode, setPeriode] = useState("today");

  const filteredEvents = useMemo(() => {
    const now = new Date();
    let start;
    if (periode === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (periode === "week") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    } else if (periode === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(0);
    }
    return githubEvents.filter((ev) => new Date(ev.time) >= start);
  }, [githubEvents, periode]);

  return (
    <section className={`Stat ${className || ""}`}>
      <div className="Stat__section-title text-center">GitHub Stats</div>

      {githubUser ? (
        <div className="Stat__github">
          <div className="Stat__github-images">
            <img
              className="Stat__github-image Stat__github-image--stats"
              src={`https://github-readme-stats.vercel.app/api?username=${githubUser.login}&show_icons=true&title_color=ffcc00&icon_color=00ffff&text_color=daf7dc&bg_color=1e1e2f&hide=issues&count_private=true&include_all_commits=true&hide_border=true`}
              alt="GitHub Stats"
            />
            <img
              className="Stat__github-image Stat__github-image--langs"
              src={`https://github-readme-stats.vercel.app/api/top-langs/?username=${githubUser.login}&layout=compact&text_color=daf7dc&bg_color=1e1e2f&hide=php&hide_border=true`}
              alt="Top Languages"
            />
          </div>

          <div className="Stat__history">
            <div className="Stat__history-filter">
              <select
                className="Stat__history-select"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
              >
                <option value="today">Hari ini</option>
                <option value="week">Minggu ini</option>
                <option value="month">Bulan ini</option>
              </select>
            </div>
            {filteredEvents.length > 0 ? (
              <ul className="Stat__github-list">
                {filteredEvents.map((ev) => (
                  <li key={ev.id} className="Stat__github-item">
                    <span className="repo">{ev.repo}</span>
                    <span className="commit">{ev.commit?.slice(0, 7)}</span>
                    <span className="changes">+{ev.additions}/-{ev.deletions}</span>
                    <span className="time">
                      {new Date(ev.time).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="Stat__history-empty">
                Belum ada push atau pull request
              </div>
            )}
          </div>
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
    </section>
  );
}

