const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI ||
  (typeof window !== 'undefined' ? window.location.origin : '');

if (!CLIENT_ID) {
  throw new Error('NEXT_PUBLIC_GITHUB_CLIENT_ID tidak ditemukan');
}

export function redirectToGitHub() {
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=repo`;
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}

export async function exchangeCodeForToken(code) {
  const res = await fetch(`/api/github/callback?code=${encodeURIComponent(code)}`);
  const data = await res.json();
  return data.access_token;
}

export async function fetchGitHubUser(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function fetchUserEvents(token, login) {
  const res = await fetch(`https://api.github.com/users/${login}/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch events');
  const events = await res.json();
  return events
    .filter((e) => e.type === 'PushEvent' || e.type === 'PullRequestEvent')
    .map((e) => {
      if (e.type === 'PullRequestEvent') {
        return {
          id: e.id,
          repo: e.repo.name,
          commit: e.payload.pull_request.head.sha,
          additions: e.payload.pull_request.additions,
          deletions: e.payload.pull_request.deletions,
          time: e.created_at,
        };
      }
      const commit = e.payload.commits && e.payload.commits[0];
      return {
        id: e.id,
        repo: e.repo.name,
        commit: commit ? commit.sha : e.payload.head,
        additions: 0,
        deletions: 0,
        time: e.created_at,
      };
    });
}

export function logoutGitHub() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gh_token');
  }
}
