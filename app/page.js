import Script from "next/script";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, isValidSessionToken } from "./api/_lib/auth";

export default function Home() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!isValidSessionToken(token)) {
    redirect("/login");
  }

  return (
    <>
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
            <select className="location-select" id="locationSelect" title="Select Location" defaultValue="">
              <option value="" disabled>Select Location</option>
              <option value="ghaziabad">Ghaziabad CPLI</option>
              <option value="hapur">Hapur IRCA</option>
              <option value="shamli">Shamli DDAC</option>
            </select>
            <div className="header-time" id="headerTime"></div>
            <form action="/api/auth/logout" method="post">
              <button className="logout-btn" type="submit">Logout</button>
            </form>
          </div>
        </div>

        {/* Location Picker Screen */}
        <div className="location-picker" id="locationPicker">
          <div className="location-picker-title">
            <h2>Select Monitoring Location</h2>
            <p>Choose a site to view its live camera feeds.</p>
          </div>
          <div className="location-cards">
            <div className="location-card" data-location="ghaziabad" id="card-ghaziabad">
              <div className="location-card-icon">📍</div>
              <div className="location-card-name">Ghaziabad CPLI</div>
              <div className="location-card-meta">
                <span className="location-card-count">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  2 Cameras
                </span>
              </div>
              <div className="location-card-arrow">VIEW FEEDS →</div>
            </div>

            <div className="location-card" data-location="hapur" id="card-hapur">
              <div className="location-card-icon">📍</div>
              <div className="location-card-name">Hapur IRCA</div>
              <div className="location-card-meta">
                <span className="location-card-count">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  7 Cameras
                </span>
              </div>
              <div className="location-card-arrow">VIEW FEEDS →</div>
            </div>

            <div className="location-card" data-location="shamli" id="card-shamli">
              <div className="location-card-icon">📍</div>
              <div className="location-card-name">Shamli DDAC</div>
              <div className="location-card-meta">
                <span className="location-card-count">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  8 Cameras
                </span>
              </div>
              <div className="location-card-arrow">VIEW FEEDS →</div>
            </div>
          </div>
        </div>

        {/* Camera Grid — hidden until a location is selected */}
        <div className="grid" id="grid" style={{ display: "none" }}></div>
      </main>

      {/* Fullscreen Overlay */}
      <div className="fs-overlay" id="fsOverlay">
        <button className="fs-close" id="fsClose">&times;</button>
        <div className="fs-video-wrap" id="fsWrap">
          <div className="fs-info" id="fsInfo"></div>
        </div>
      </div>

      <Script src="/video-stream.js" type="module" strategy="beforeInteractive" />
      <Script src="/app.js?v=20260524_custom_v6" strategy="afterInteractive" />
    </>
  );
}
