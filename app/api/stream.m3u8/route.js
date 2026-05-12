import { copyUpstreamHeaders, getGo2RtcBaseUrl, toClientResponse } from "../_lib/go2rtc";
import { ensureAuthenticatedRequest } from "../_lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toHlsProxyUrl(upstreamUrl) {
  return `/api/hls?u=${encodeURIComponent(upstreamUrl)}`;
}

function rewritePlaylistUrls(playlistText, upstreamManifestUrl) {
  return playlistText
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_, uri) => {
          try {
            return `URI="${toHlsProxyUrl(new URL(uri, upstreamManifestUrl).toString())}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
      }

      try {
        return toHlsProxyUrl(new URL(trimmed, upstreamManifestUrl).toString());
      } catch {
        return line;
      }
    })
    .join("\n");
}

export async function GET(request) {
  const unauthorized = ensureAuthenticatedRequest(request);
  if (unauthorized) return unauthorized;

  const upstreamBase = getGo2RtcBaseUrl();
  const reqUrl = new URL(request.url);
  const query = reqUrl.search || "";
  const headers = copyUpstreamHeaders(request);
  const candidatePaths = ["/api/stream.m3u8", "/stream.m3u8"];
  let lastResponse = null;

  for (const path of candidatePaths) {
    const upstreamResponse = await fetch(`${upstreamBase}${path}${query}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (upstreamResponse.status !== 404) {
      if (upstreamResponse.ok) {
        const upstreamManifestUrl = `${upstreamBase}${path}${query}`;
        const playlistText = await upstreamResponse.text();
        const rewrittenPlaylist = rewritePlaylistUrls(playlistText, upstreamManifestUrl);
        const responseHeaders = new Headers(upstreamResponse.headers);
        responseHeaders.delete("content-encoding");
        responseHeaders.delete("content-length");
        responseHeaders.delete("transfer-encoding");
        responseHeaders.delete("connection");
        responseHeaders.set("content-type", "application/vnd.apple.mpegurl");

        return new Response(rewrittenPlaylist, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers: responseHeaders,
        });
      }

      return toClientResponse(upstreamResponse);
    }

    lastResponse = upstreamResponse;
  }

  return toClientResponse(lastResponse);
}
