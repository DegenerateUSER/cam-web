import { copyUpstreamHeaders, getUpstreamBaseFromRequest, stripLocFromQuery, toClientResponse } from "../_lib/go2rtc";
import { ensureAuthenticatedRequest } from "../_lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PUT(request) {
  const unauthorized = ensureAuthenticatedRequest(request);
  if (unauthorized) return unauthorized;

  const upstreamBase = getUpstreamBaseFromRequest(request);
  const query = stripLocFromQuery(request.url);
  const headers = copyUpstreamHeaders(request);

  const upstreamResponse = await fetch(`${upstreamBase}/api/streams${query}`, {
    method: "PUT",
    headers,
    cache: "no-store",
    redirect: "manual",
  });

  return toClientResponse(upstreamResponse);
}

export async function GET(request) {
  const unauthorized = ensureAuthenticatedRequest(request);
  if (unauthorized) return unauthorized;

  const upstreamBase = getUpstreamBaseFromRequest(request);
  const query = stripLocFromQuery(request.url);
  const headers = copyUpstreamHeaders(request);

  const upstreamResponse = await fetch(`${upstreamBase}/api/streams${query}`, {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "manual",
  });

  return toClientResponse(upstreamResponse);
}
