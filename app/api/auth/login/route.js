import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_TTL_SECONDS,
  createSessionToken,
  isValidCredentials,
  shouldUseSecureCookie,
} from "../../_lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function wantsJsonResponse(request) {
  const contentType = request.headers.get("content-type") || "";
  const accept = request.headers.get("accept") || "";
  return contentType.includes("application/json") || accept.includes("application/json");
}

async function parseCredentials(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return null;
    return {
      username: String(body.username || "").trim(),
      password: String(body.password || ""),
    };
  }

  const form = await request.formData().catch(() => null);
  if (!form) return null;
  return {
    username: String(form.get("username") || "").trim(),
    password: String(form.get("password") || ""),
  };
}

function buildAuthCookie(token, request) {
  return {
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_SESSION_TTL_SECONDS,
  };
}

export async function POST(request) {
  const credentials = await parseCredentials(request);
  const jsonResponse = wantsJsonResponse(request);
  const valid = credentials && isValidCredentials(credentials.username, credentials.password);

  if (!valid) {
    if (jsonResponse) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/login?error=1" },
    });
  }

  const token = createSessionToken(credentials.username);

  if (jsonResponse) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(buildAuthCookie(token, request));
    return response;
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/" },
  });
  response.cookies.set(buildAuthCookie(token, request));
  return response;
}
