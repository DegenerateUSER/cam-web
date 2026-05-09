import { copyUpstreamHeaders, getGo2RtcBaseUrl, toClientResponse } from "../_lib/go2rtc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const upstreamBase = getGo2RtcBaseUrl();
  const reqUrl = new URL(request.url);
  const query = reqUrl.search || "";
  const headers = copyUpstreamHeaders(request);
  const candidatePaths = ["/api/stream.mp4", "/stream.mp4"];
  let lastResponse = null;

  for (const path of candidatePaths) {
    const upstreamResponse = await fetch(`${upstreamBase}${path}${query}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (upstreamResponse.status !== 404) {
      return toClientResponse(upstreamResponse);
    }

    lastResponse = upstreamResponse;
  }

  return toClientResponse(lastResponse);
}
