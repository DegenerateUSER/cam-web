const DEFAULT_GO2RTC_SERVER = "https://rtc.aacctrust.in";

// Location-specific go2rtc server URLs
const LOCATION_SERVERS = {
  ghaziabad: "https://stream.aacctrust.in",
  hapur: "https://cameras.aacctrust.in",
  shamli: "https://stream.aacctrust.in",
};

function normalizeGo2RtcBaseUrl(value) {
  const trimmedValue = (value || "").trim();
  if (!trimmedValue) return DEFAULT_GO2RTC_SERVER;
  const normalized = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
  return normalized.replace(/\/+$/, "");
}

export function getGo2RtcBaseUrl() {
  return normalizeGo2RtcBaseUrl(
    process.env.GO2RTC_SERVER || process.env.NEXT_PUBLIC_GO2RTC_SERVER || DEFAULT_GO2RTC_SERVER
  );
}

/**
 * Returns the go2rtc base URL for a given location key.
 * Falls back to the default server if the location key is unknown.
 */
export function getGo2RtcBaseUrlForLocation(locationKey) {
  const key = (locationKey || "").trim().toLowerCase();
  const url = LOCATION_SERVERS[key];
  if (url) return normalizeGo2RtcBaseUrl(url);
  return getGo2RtcBaseUrl();
}

/**
 * Reads the `loc` query parameter from a request URL and returns
 * the corresponding go2rtc base URL.
 */
export function getUpstreamBaseFromRequest(request) {
  const reqUrl = new URL(request.url);
  const loc = reqUrl.searchParams.get("loc");
  if (loc) {
    return getGo2RtcBaseUrlForLocation(loc);
  }
  return getGo2RtcBaseUrl();
}

export function copyUpstreamHeaders(request) {
  const headers = new Headers();
  const ua = request.headers.get("user-agent");
  if (ua) {
    headers.set("user-agent", ua);
  }
  const ngrok = request.headers.get("ngrok-skip-browser-warning");
  if (ngrok) {
    headers.set("ngrok-skip-browser-warning", ngrok);
  }
  return headers;
}

/**
 * Returns the query string from the request URL with the `loc` parameter removed.
 * This is used to forward only go2rtc-relevant params to the upstream server.
 */
export function stripLocFromQuery(requestUrl) {
  const url = new URL(requestUrl);
  url.searchParams.delete("loc");
  const qs = url.searchParams.toString();
  return qs ? `?${qs}` : "";
}

export function toClientResponse(upstreamResponse) {
  const headers = new Headers(upstreamResponse.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("connection");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}
