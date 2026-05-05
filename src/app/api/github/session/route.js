import { NextResponse } from "next/server";

const TOKEN_COOKIE = "gh_access_token";

export const dynamic = "force-dynamic";

const noStore = {
  "Cache-Control": "no-store",
};

const mapGitHubEvents = (events) =>
  events
    .filter((event) =>
      ["PushEvent", "PullRequestEvent"].includes(String(event.type || "")),
    )
    .map((event) => {
      if (event.type === "PullRequestEvent") {
        const pullRequest = event.payload?.pull_request || {};
        return {
          id: event.id,
          repo: event.repo?.name || "",
          commit: pullRequest.head?.sha || event.payload?.head || "",
          additions: Number(pullRequest.additions || 0),
          deletions: Number(pullRequest.deletions || 0),
          time: event.created_at,
        };
      }

      const commit = event.payload?.commits?.[0];
      return {
        id: event.id,
        repo: event.repo?.name || "",
        commit: commit?.sha || event.payload?.head || "",
        additions: 0,
        deletions: 0,
        time: event.created_at,
      };
    });

const unauthorized = () =>
  NextResponse.json({ user: null, events: [] }, { status: 401, headers: noStore });

export async function GET(request) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (!token) {
    return unauthorized();
  }

  try {
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (userResponse.status === 401) {
      const response = unauthorized();
      response.cookies.set(TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
      return response;
    }

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: "GitHub user request failed" },
        { status: 502, headers: noStore },
      );
    }

    const user = await userResponse.json();
    const eventsResponse = await fetch(
      `https://api.github.com/users/${encodeURIComponent(user.login)}/events`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    const events = eventsResponse.ok
      ? mapGitHubEvents(await eventsResponse.json())
      : [];

    return NextResponse.json({ user, events }, { headers: noStore });
  } catch (error) {
    console.error("/api/github/session error:", error?.message || error);
    return NextResponse.json(
      { error: "GitHub session request failed" },
      { status: 500, headers: noStore },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set(TOKEN_COOKIE, "", {
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
