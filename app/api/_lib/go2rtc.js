const DEFAULT_GO2RTC_SERVER = "https://rtc.aacctrust.in";

function normalizeGo2RtcBaseUrl(value) {
  const trimmedValue = (value || "").trim();
  const normalized = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
  return normalized.replace(/\/+$/, "");
}

export function getGo2RtcBaseUrl() {
  return normalizeGo2RtcBaseUrl(
    process.env.GO2RTC_SERVER || process.env.NEXT_PUBLIC_GO2RTC_SERVER || DEFAULT_GO2RTC_SERVER
  );
}

export function copyUpstreamHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  return headers;
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
