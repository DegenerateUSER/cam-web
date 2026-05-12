import Script from "next/script";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, isValidSessionToken } from "./api/_lib/auth";

const DEFAULT_GO2RTC_SERVER = "https://rtc.aacctrust.in";

function normalizeServerUrl(value) {
  const trimmedValue = (value || "").trim();
  const normalized = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
  return normalized.replace(/\/+$/, "");
}

export default function Home() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!isValidSessionToken(token)) {
    redirect("/login");
  }

  const defaultServer = normalizeServerUrl(
    process.env.GO2RTC_SERVER || process.env.NEXT_PUBLIC_GO2RTC_SERVER || DEFAULT_GO2RTC_SERVER
  );
  const defaultCameras = "cam1:CAM 01,cam3:CAM 02";

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js" strategy="beforeInteractive" />
      <main className="app-shell">
        <div className="header">
          <div className="header-left">
            <div className="rec-dot"></div>
            <div>
              <div className="header-title">Live Surveillance</div>
              <div className="header-subtitle">Secure monitoring console</div>
            </div>
          </div>
          <div className="header-right">
            <div className="server-indicator" id="serverBadge"></div>
            <select className="stream-select" id="streamMethod" title="Stream Method" defaultValue="hls">
              <option value="auto">AUTO</option>
              <option value="hls">HLS (m3u8)</option>
              <option value="mjpeg">MJPEG</option>
              <option value="mse">MP4 (MSE)</option>
              <option value="webrtc">WebRTC</option>
            </select>
            <div className="header-time" id="headerTime"></div>
            <form action="/api/auth/logout" method="post">
              <button className="logout-btn" type="submit">Logout</button>
            </form>
          </div>
        </div>

        <div id="appConfig" data-default-server={defaultServer} data-cameras={defaultCameras} hidden></div>
        <div className="grid" id="grid"></div>
      </main>

      <div className="fs-overlay" id="fsOverlay">
        <button className="fs-close" id="fsClose">&times;</button>
        <div className="fs-video-wrap" id="fsWrap">
          <div className="fs-info" id="fsInfo"></div>
        </div>
      </div>

      <Script src="/app.js?v=20260510m" strategy="afterInteractive" />
    </>
  );
}
