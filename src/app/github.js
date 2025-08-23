const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI ||
  (typeof window !== "undefined" ? window.location.origin : "");

if (!CLIENT_ID) {
  throw new Error("NEXT_PUBLIC_GITHUB_CLIENT_ID tidak ditemukan");
}

/**
 * Arahkan pengguna ke halaman otorisasi GitHub.
 */
export function redirectToGitHub() {
  try {
    const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=repo`;
    if (typeof window === "undefined") {
      throw new Error("Window tidak tersedia");
    }
    window.location.href = url;
  } catch (error) {
    console.error("Gagal mengarahkan ke GitHub:", error);
  }
}

/**
 * Tukar kode otorisasi dengan token akses GitHub.
 * @param {string} code Kode otorisasi dari GitHub
 * @returns {Promise<string>} Token akses GitHub
 */
export async function exchangeCodeForToken(code) {
  try {
    const res = await fetch(
      `/api/github/callback?code=${encodeURIComponent(code)}`
    );
    if (!res.ok) {
      throw new Error("Gagal menukar kode dengan token");
    }
    const data = await res.json();
    if (!data.access_token) {
      throw new Error("Token tidak ditemukan pada respons");
    }
    return data.access_token;
  } catch (error) {
    console.error("Error saat menukar kode token:", error);
    throw error;
  }
}

/**
 * Ambil profil pengguna GitHub berdasarkan token.
 * @param {string} token Token akses GitHub
 * @returns {Promise<object>} Data pengguna
 */
export async function fetchGitHubUser(token) {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Gagal mengambil data pengguna");
    }
    return await res.json();
  } catch (error) {
    console.error("Error saat mengambil data user GitHub:", error);
    throw error;
  }
}

/**
 * Ambil event Push dan Pull Request milik pengguna.
 * @param {string} token Token akses GitHub
 * @param {string} login Username GitHub
 * @returns {Promise<Array>} Daftar event yang sudah disederhanakan
 */
export async function fetchUserEvents(token, login) {
  try {
    const res = await fetch(`https://api.github.com/users/${login}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Gagal mengambil event");
    }
    const events = await res.json();
    return events
      .filter((e) => e.type === "PushEvent" || e.type === "PullRequestEvent")
      .map((e) => {
        if (e.type === "PullRequestEvent") {
          return {
            id: e.id,
            repo: e.repo.name,
            commit: e.payload.pull_request.head.sha,
            additions: e.payload.pull_request.additions,
            deletions: e.payload.pull_request.deletions,
            time: e.created_at,
          };
        }
        const commit = e.payload.commits?.[0];
        return {
          id: e.id,
          repo: e.repo.name,
          commit: commit ? commit.sha : e.payload.head,
          additions: 0,
          deletions: 0,
          time: e.created_at,
        };
      });
  } catch (error) {
    console.error("Error saat mengambil event pengguna:", error);
    throw error;
  }
}

/**
 * Hapus token GitHub yang tersimpan di localStorage.
 */
export function logoutGitHub() {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gh_token");
    }
  } catch (error) {
    console.error("Gagal logout dari GitHub:", error);
  }
}
