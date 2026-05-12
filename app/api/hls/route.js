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

function resolveUpstreamTargetUrl(rawTarget, upstreamBase) {
  if (!rawTarget) return null;

  try {
    return new URL(rawTarget);
  } catch {
    try {
      return new URL(rawTarget.replace(/^\/+/, ""), `${upstreamBase}/api/`);
    } catch {
      return null;
    }
  }
}

function isM3u8Response(targetUrl, upstreamResponse) {
  const contentType = upstreamResponse.headers.get("content-type") || "";
  return (
    targetUrl.pathname.endsWith(".m3u8") ||
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("application/x-mpegURL")
  );
}

export async function GET(request) {
  const unauthorized = ensureAuthenticatedRequest(request);
  if (unauthorized) return unauthorized;

  const upstreamBase = getGo2RtcBaseUrl();
  const reqUrl = new URL(request.url);
  const rawTarget = reqUrl.searchParams.get("u");
  const targetUrl = resolveUpstreamTargetUrl(rawTarget, upstreamBase);

  if (!targetUrl) {
    return new Response("missing or invalid u query parameter", { status: 400 });
  }

  const upstreamOrigin = new URL(upstreamBase).origin;
  if (targetUrl.origin !== upstreamOrigin) {
    return new Response("forbidden target origin", { status: 403 });
  }

  const headers = copyUpstreamHeaders(request);
  const upstreamResponse = await fetch(targetUrl.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (upstreamResponse.ok && isM3u8Response(targetUrl, upstreamResponse)) {
    const playlistText = await upstreamResponse.text();
    const rewrittenPlaylist = rewritePlaylistUrls(playlistText, targetUrl.toString());
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
