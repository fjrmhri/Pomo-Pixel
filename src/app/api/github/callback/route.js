import { NextResponse } from "next/server";

const TOKEN_COOKIE = "gh_access_token";
const STATE_COOKIE = "gh_oauth_state";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const getOrigin = (request) => {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
};

const getRedirectUri = (request) =>
  process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI ||
  `${getOrigin(request)}/api/github/callback`;

const withClearedState = (response) => {
  response.cookies.set(STATE_COOKIE, "", {
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });
  return response;
};

const errorResponse = (request, wantsJson, payload, status = 400) => {
  if (wantsJson) {
    return withClearedState(NextResponse.json(payload, { status }));
  }

  const url = new URL("/", getOrigin(request));
  url.searchParams.set("github_error", "oauth");
  return withClearedState(NextResponse.redirect(url));
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const wantsJson = searchParams.get("format") === "json";

  if (!code) {
    return errorResponse(request, wantsJson, { error: "Missing code" }, 400);
  }

  const storedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!storedState || !state || storedState !== state) {
    return errorResponse(request, wantsJson, { error: "Invalid state" }, 400);
  }

  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return errorResponse(
      request,
      wantsJson,
      { error: "GitHub OAuth env is incomplete" },
      500,
    );
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: getRedirectUri(request),
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error || !data.access_token) {
      return errorResponse(
        request,
        wantsJson,
        {
          error: "GitHub token exchange failed",
          status: response.status,
          detail: data,
        },
        response.ok ? 400 : 502,
      );
    }

    const result = wantsJson
      ? NextResponse.json({ ok: true })
      : NextResponse.redirect(new URL("/", getOrigin(request)));

    result.cookies.set(TOKEN_COOKIE, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return withClearedState(result);
  } catch (err) {
    console.error("/api/github/callback error:", err?.message || err);
    return errorResponse(
      request,
      wantsJson,
      { error: "Internal server error" },
      500,
    );
  }
}
