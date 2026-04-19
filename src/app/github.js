const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || null;
// Ensure REDIRECT_URI points to the callback endpoint
const ENV_REDIRECT = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || null;
const REDIRECT_URI =
  ENV_REDIRECT ||
  (typeof window !== "undefined"
    ? `${window.location.origin}/api/github/callback`
    : null);
const USER_CACHE_TTL = 5 * 60 * 1000;

if (!CLIENT_ID) {
  // Do not throw during module import; feature will be disabled gracefully.
  // Avoid crashing the app in environments without GitHub integration.
  // Consumers should handle missing CLIENT_ID when invoking GitHub flows.
  console.warn(
    "[github] NEXT_PUBLIC_GITHUB_CLIENT_ID tidak ditemukan — fitur GitHub OAuth dinonaktifkan",
  );
}

/**
 * Generate random state string untuk CSRF protection
 */
const generateState = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

const buildAuthorizeUrl = (state) => {
  const redirect = REDIRECT_URI || "";
  return `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirect,
  )}&scope=repo&state=${encodeURIComponent(state)}`;
};

const readCache = (key) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
};

const writeCache = (key, value, ttl = USER_CACHE_TTL) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        value,
        expiresAt: Date.now() + ttl,
      }),
    );
  } catch {}
};

/**
 * Arahkan pengguna ke halaman otorisasi GitHub.
 */
export function redirectToGitHub() {
  if (!CLIENT_ID) {
    console.warn(
      "[github] NEXT_PUBLIC_GITHUB_CLIENT_ID tidak ditemukan — redirect GitHub dibatalkan",
    );
    return false;
  }

  if (typeof window === "undefined") {
    console.warn("[github] Window tidak tersedia — redirect GitHub dibatalkan");
    return false;
  }

  try {
    const state = generateState();
    sessionStorage.setItem("gh_oauth_state", state);
    const url = buildAuthorizeUrl(state);
    window.location.href = url;
    return true;
  } catch (error) {
    console.error("Gagal mengarahkan ke GitHub:", error);
    return false;
  }
}

/**
 * Tukar kode otorisasi dengan token akses GitHub.
 * @param {string} code Kode otorisasi dari GitHub
 * @returns {Promise<string>} Token akses GitHub
 */
export async function exchangeCodeForToken(code) {
  try {
    if (!CLIENT_ID) {
      throw new Error("GitHub client id tidak tersedia");
    }
    // Verify CSRF state parameter
    if (typeof window !== "undefined") {
      const storedState = sessionStorage.getItem("gh_oauth_state");
      const urlParams = new URLSearchParams(window.location.search);
      const urlState = urlParams.get("state");

      if (!storedState || storedState !== urlState) {
        throw new Error(
          "Invalid state parameter - possible CSRF attack detected",
        );
      }

      // Clear state after verification
      sessionStorage.removeItem("gh_oauth_state");
    }

    const res = await fetch(
      `/api/github/callback?code=${encodeURIComponent(code)}`,
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(
        `Gagal menukar kode dengan token (status=${res.status}): ${txt}`,
      );
    }
    const data = await res.json();
    if (!data || !data.access_token) {
      throw new Error("Token tidak ditemukan pada respons");
    }
    return data.access_token;
  } catch (error) {
    console.error("Error saat menukar kode token:", error?.message || error);
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
    const cacheKey = `gh_user_${token.slice(0, 8)}`;
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Gagal mengambil data pengguna");
    }
    const data = await res.json();
    writeCache(cacheKey, data);
    return data;
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
    const cacheKey = `gh_events_${login}`;
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const res = await fetch(`https://api.github.com/users/${login}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Gagal mengambil event");
    }
    const events = await res.json();
    const mapped = events
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
    writeCache(cacheKey, mapped, 60 * 1000);
    return mapped;
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
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach((key) => {
        if (key.startsWith("gh_user_") || key.startsWith("gh_events_")) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error("Gagal logout dari GitHub:", error);
  }
}

/**
 * Provide information about redirect URI configuration for UI checks.
 * Returns { redirectUri, envRedirect, envProvided }
 */
export function getRedirectUriInfo() {
  return {
    redirectUri: REDIRECT_URI,
    envRedirect: ENV_REDIRECT,
    envProvided: Boolean(ENV_REDIRECT),
    clientIdProvided: Boolean(CLIENT_ID),
    usingFallbackRedirect: !ENV_REDIRECT && Boolean(REDIRECT_URI),
  };
}
