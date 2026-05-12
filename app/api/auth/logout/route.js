import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, shouldUseSecureCookie } from "../../_lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request) {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/login" },
  });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
