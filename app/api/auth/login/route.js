import { NextResponse } from "next/server";
import {
  getAuthCookieName,
  AUTH_SESSION_TTL_SECONDS,
  createSessionToken,
  isValidCredentials,
  shouldUseSecureCookie,
  VALID_LOCATIONS,
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
      location: String(body.location || "").trim(),
    };
  }

  const form = await request.formData().catch(() => null);
  if (!form) return null;
  return {
    username: String(form.get("username") || "").trim(),
    password: String(form.get("password") || ""),
    location: String(form.get("location") || "").trim(),
  };
}

function buildAuthCookie(token, location, request) {
  return {
    name: getAuthCookieName(location),
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
  const location = credentials?.location;

  // Validate location
  if (!location || !VALID_LOCATIONS.includes(location)) {
    if (jsonResponse) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/" },
    });
  }

  const valid = credentials && isValidCredentials(credentials.username, credentials.password, location);

  if (!valid) {
    if (jsonResponse) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `/${location}/login?error=1` },
    });
  }

  const token = createSessionToken(credentials.username, location);

  if (jsonResponse) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(buildAuthCookie(token, location, request));
    return response;
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: `/${location}` },
  });
  response.cookies.set(buildAuthCookie(token, location, request));
  return response;
}
