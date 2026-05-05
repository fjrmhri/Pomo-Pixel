const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || null;
const ENV_REDIRECT = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || null;
const REDIRECT_URI =
  ENV_REDIRECT ||
  (typeof window !== "undefined"
    ? `${window.location.origin}/api/github/callback`
    : null);

const GITHUB_SCOPE = "read:user";
const GITHUB_STATE_COOKIE = "gh_oauth_state";
const LEGACY_GITHUB_TOKEN_KEY = "gh_token";
const SESSION_CACHE_KEY = "gh_session";
const SESSION_CACHE_TTL = 60 * 1000;

if (!CLIENT_ID) {
  console.warn(
    "[github] NEXT_PUBLIC_GITHUB_CLIENT_ID tidak ditemukan - fitur GitHub OAuth dinonaktifkan",
  );
}

const generateState = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

const writeStateCookie = (state) => {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${GITHUB_STATE_COOKIE}=${encodeURIComponent(
    state,
  )}; Max-Age=600; Path=/; SameSite=Lax${secure}`;
};

const clearStateCookie = () => {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${GITHUB_STATE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
};

const clearSessionCache = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("gh_user_") || key.startsWith("gh_events_")) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {}
};

const readCache = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
};

const writeCache = (value, ttl = SESSION_CACHE_TTL) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({
        value,
        expiresAt: Date.now() + ttl,
      }),
    );
  } catch {}
};

const buildAuthorizeUrl = (state) => {
  const redirect = REDIRECT_URI || "";
  return `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirect,
  )}&scope=${encodeURIComponent(GITHUB_SCOPE)}&state=${encodeURIComponent(
    state,
  )}`;
};

export function clearLegacyGitHubToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_GITHUB_TOKEN_KEY);
  } catch {}
}

export function redirectToGitHub() {
  if (!CLIENT_ID) {
    console.warn(
      "[github] NEXT_PUBLIC_GITHUB_CLIENT_ID tidak ditemukan - redirect GitHub dibatalkan",
    );
    return false;
  }

  if (typeof window === "undefined") {
    console.warn("[github] Window tidak tersedia - redirect GitHub dibatalkan");
    return false;
  }

  try {
    const state = generateState();
    writeStateCookie(state);
    window.location.href = buildAuthorizeUrl(state);
    return true;
  } catch (error) {
    console.error("Gagal mengarahkan ke GitHub:", error);
    return false;
  }
}

export async function completeGitHubLogin(code, state) {
  if (!code) return false;

  const params = new URLSearchParams({
    code,
    format: "json",
  });
  if (state) params.set("state", state);

  const res = await fetch(`/api/github/callback?${params.toString()}`, {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Login GitHub gagal (status=${res.status}): ${txt}`);
  }

  clearStateCookie();
  clearSessionCache();
  clearLegacyGitHubToken();
  return true;
}

export async function fetchGitHubSession({ force = false } = {}) {
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }

  const res = await fetch("/api/github/session", {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (res.status === 401) {
    clearSessionCache();
    return { user: null, events: [] };
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Sesi GitHub gagal dimuat (status=${res.status}): ${txt}`);
  }

  const data = await res.json();
  const session = {
    user: data?.user || null,
    events: Array.isArray(data?.events) ? data.events : [],
  };
  writeCache(session);
  return session;
}

export async function fetchGitHubUser() {
  const session = await fetchGitHubSession();
  return session.user;
}

export async function fetchUserEvents() {
  const session = await fetchGitHubSession({ force: true });
  return session.events;
}

export async function logoutGitHub() {
  clearStateCookie();
  clearSessionCache();
  clearLegacyGitHubToken();

  try {
    const res = await fetch("/api/github/session", {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Logout GitHub gagal (status=${res.status})`);
    }
  } catch (error) {
    console.error("Gagal logout dari GitHub:", error);
    throw error;
  }
}

export function getRedirectUriInfo() {
  return {
    redirectUri: REDIRECT_URI,
    envRedirect: ENV_REDIRECT,
    envProvided: Boolean(ENV_REDIRECT),
    clientIdProvided: Boolean(CLIENT_ID),
    usingFallbackRedirect: !ENV_REDIRECT && Boolean(REDIRECT_URI),
  };
}
