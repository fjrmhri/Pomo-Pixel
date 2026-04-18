import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  try {
    // Compute redirect_uri: prefer env if provided, otherwise derive from request
    const envRedirect = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || null;
    let redirect_uri;
    if (envRedirect) {
      redirect_uri = envRedirect.endsWith("/api/github/callback")
        ? envRedirect
        : `${envRedirect.replace(/\/$/, "")}/api/github/callback`;
    } else {
      const proto =
        request.headers.get("x-forwarded-proto") ||
        request.headers.get("x-forwarded-protocol") ||
        "http";
      const host = request.headers.get("host");
      redirect_uri = `${proto}://${host}/api/github/callback`;
    }

    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri,
        }),
      },
    );

    const txt = await response.text().catch(() => "");
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch (e) {
      // non-json response
      data = { raw: txt };
    }

    if (!response.ok) {
      // Provide helpful message for redirect_uri mismatch
      return NextResponse.json(
        { error: "Upstream error", status: response.status, detail: data },
        { status: 502 },
      );
    }

    if (data.error) {
      // Common GitHub error: redirect_uri_mismatch
      return NextResponse.json(data, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("/api/github/callback error:", err?.message || err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
