import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, shouldUseSecureCookie } from "../../_lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureCookie(request.url),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
