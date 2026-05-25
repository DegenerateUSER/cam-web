import { copyUpstreamHeaders, getUpstreamBaseFromRequest, stripLocFromQuery, toClientResponse } from "../_lib/go2rtc";
import { ensureAuthenticatedRequest } from "../_lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const unauthorized = ensureAuthenticatedRequest(request);
  if (unauthorized) return unauthorized;

  const upstreamBase = getUpstreamBaseFromRequest(request);
  const reqUrl = new URL(request.url);
  const query = stripLocFromQuery(request.url);
  const headers = copyUpstreamHeaders(request);
  const candidatePaths = ["/api/stream.mjpeg", "/stream.mjpeg"];
  let lastResponse = null;

  for (const path of candidatePaths) {
    const upstreamResponse = await fetch(`${upstreamBase}${path}${query}`, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
    });

    if (upstreamResponse.status !== 404) {
      return toClientResponse(upstreamResponse);
    }

    lastResponse = upstreamResponse;
  }

  return toClientResponse(lastResponse);
}
