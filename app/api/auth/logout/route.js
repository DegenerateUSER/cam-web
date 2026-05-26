import { NextResponse } from "next/server";
import { getAuthCookieName, shouldUseSecureCookie, VALID_LOCATIONS } from "../../_lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request) {
  // Get location from form data or query param
  let location = null;

  try {
    const form = await request.formData().catch(() => null);
    if (form) {
      location = String(form.get("location") || "").trim();
    }
  } catch {
    // ignore
  }

  // Fallback: try URL search params
  if (!location) {
    const url = new URL(request.url);
    location = url.searchParams.get("location") || "";
  }

  const redirectTo = location && VALID_LOCATIONS.includes(location)
    ? `/${location}/login`
    : "/";

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: redirectTo },
  });

  // Clear the location-specific cookie
  if (location && VALID_LOCATIONS.includes(location)) {
    response.cookies.set({
      name: getAuthCookieName(location),
      value: "",
      httpOnly: true,
      secure: shouldUseSecureCookie(request),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
