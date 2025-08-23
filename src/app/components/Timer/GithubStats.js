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

export default function GithubStats({
  githubUser,
  githubEvents = [],
  className = "",
}) {
  return (
    <section className={`Stat ${className || ""}`}>
      <div className="Stat__section-title text-center">GitHub Stats</div>

      {githubUser ? (
        <div className="Stat__github">
          <p className="text-center">
            <img
              src={`https://github-readme-stats.vercel.app/api?username=${githubUser.login}&show_icons=true&title_color=ffcc00&icon_color=00ffff&text_color=daf7dc&bg_color=1e1e2f&hide=issues&count_private=true&include_all_commits=true`}
              width="48%"
            />
            <img
              src={`https://github-readme-stats.vercel.app/api/top-langs/?username=${githubUser.login}&layout=compact&text_color=daf7dc&bg_color=1e1e2f&hide=php`}
              width="37.5%"
            />
          </p>

          {githubEvents.length > 0 && (
            <ul className="Stat__github-list">
              {githubEvents.map((ev) => (
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
          )}
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

