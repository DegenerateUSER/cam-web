import Script from "next/script";

export default function Home() {
  const defaultServer = process.env.GO2RTC_SERVER || process.env.NEXT_PUBLIC_GO2RTC_SERVER || "http://localhost:1984";
  const defaultCameras =
    process.env.NEXT_PUBLIC_CAMERAS || "cam1:CAM 01,cam2:CAM 02,cam3:CAM 03,cam4:CAM 04";

  return (
    <>
      <div className="header">
        <div className="header-left">
          <div className="rec-dot"></div>
          <div className="header-title">Live Surveillance</div>
        </div>
        <div className="header-right">
          <div className="server-indicator" id="serverBadge"></div>
          <div className="header-time" id="headerTime"></div>
        </div>
      </div>

      <div id="appConfig" data-default-server={defaultServer} data-cameras={defaultCameras} hidden></div>
      <div className="grid" id="grid"></div>

      <div className="fs-overlay" id="fsOverlay">
        <button className="fs-close" id="fsClose">&times;</button>
        <div className="fs-video-wrap" id="fsWrap">
          <div className="fs-info" id="fsInfo"></div>
        </div>
      </div>

      <Script src="/app.js?v=20260509b" strategy="afterInteractive" />
    </>
  );
}
