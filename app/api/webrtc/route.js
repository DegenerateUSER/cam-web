import { copyUpstreamHeaders, getGo2RtcBaseUrl, toClientResponse } from "../_lib/go2rtc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request) {
  const upstreamBase = getGo2RtcBaseUrl();
  const reqUrl = new URL(request.url);
  const query = reqUrl.search || "";
  const sdp = await request.text();
  const headers = copyUpstreamHeaders(request);
  headers.set("content-type", "application/sdp");

  const candidatePaths = ["/api/webrtc", "/webrtc"];
  let lastResponse = null;

  for (const path of candidatePaths) {
    const upstreamResponse = await fetch(`${upstreamBase}${path}${query}`, {
      method: "POST",
      headers,
      body: sdp,
      cache: "no-store",
    });

    if (upstreamResponse.status !== 404) {
      return toClientResponse(upstreamResponse);
    }

    lastResponse = upstreamResponse;
  }

  return toClientResponse(lastResponse);
}
