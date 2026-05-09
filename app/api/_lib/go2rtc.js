const DEFAULT_GO2RTC_SERVER = "http://localhost:1984";

export function getGo2RtcBaseUrl() {
  return (process.env.GO2RTC_SERVER || process.env.NEXT_PUBLIC_GO2RTC_SERVER || DEFAULT_GO2RTC_SERVER).replace(
    /\/+$/,
    ""
  );
}

export function copyUpstreamHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  return headers;
}

export function toClientResponse(upstreamResponse) {
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}
