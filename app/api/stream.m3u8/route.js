import { copyUpstreamHeaders, getUpstreamBaseFromRequest, stripLocFromQuery, toClientResponse } from "../_lib/go2rtc";
import { ensureAuthenticatedRequest } from "../_lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toHlsProxyUrl(upstreamUrl, loc) {
  let proxyUrl = `/api/hls?u=${encodeURIComponent(upstreamUrl)}`;
  if (loc) proxyUrl += `&loc=${encodeURIComponent(loc)}`;
  return proxyUrl;
}

function rewritePlaylistUrls(playlistText, upstreamManifestUrl, loc) {
  return playlistText
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_, uri) => {
          try {
            return `URI="${toHlsProxyUrl(new URL(uri, upstreamManifestUrl).toString(), loc)}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
      }

      try {
        return toHlsProxyUrl(new URL(trimmed, upstreamManifestUrl).toString(), loc);
      } catch {
        return line;
      }
    })
    .join("\n");
}

export async function GET(request) {
  const unauthorized = ensureAuthenticatedRequest(request);
  if (unauthorized) return unauthorized;

  const upstreamBase = getUpstreamBaseFromRequest(request);
  const reqUrl = new URL(request.url);
  const loc = reqUrl.searchParams.get("loc") || "";
  const query = stripLocFromQuery(request.url);
  const headers = copyUpstreamHeaders(request);
  const candidatePaths = ["/api/stream.m3u8", "/stream.m3u8"];
  let lastResponse = null;

  for (const path of candidatePaths) {
    const upstreamResponse = await fetch(`${upstreamBase}${path}${query}`, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
    });

    if (upstreamResponse.status !== 404) {
      if (upstreamResponse.ok) {
        const upstreamManifestUrl = `${upstreamBase}${path}${query}`;
        const playlistText = await upstreamResponse.text();
        const rewrittenPlaylist = rewritePlaylistUrls(playlistText, upstreamManifestUrl, loc);
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
