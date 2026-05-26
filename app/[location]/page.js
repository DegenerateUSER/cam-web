import Script from "next/script";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getAuthCookieName, isValidSessionToken, VALID_LOCATIONS } from "../api/_lib/auth";

const LOCATION_NAMES = {
  ghaziabad: "Ghaziabad CPLI",
  hapur: "Hapur IRCA",
  shamli: "Shamli DDAC",
};

export function generateStaticParams() {
  return VALID_LOCATIONS.map((loc) => ({ location: loc }));
}

export default function LocationPage({ params }) {
  const { location } = params;

  if (!VALID_LOCATIONS.includes(location)) {
    notFound();
  }

  const cookieName = getAuthCookieName(location);
  const token = cookies().get(cookieName)?.value;

  if (!isValidSessionToken(token, location)) {
    redirect(`/${location}/login`);
  }

  const locationName = LOCATION_NAMES[location] || location;

  return (
    <>
      <main className="app-shell" data-location={location}>
        <div className="header">
          <div className="header-left">
            <div className="rec-dot" />
            <div>
              <div className="header-title">{locationName}</div>
              <div className="header-subtitle">Live camera monitoring</div>
            </div>
          </div>
          <div className="header-right">
            <Link href="/" className="back-btn">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              All Locations
            </Link>
            <div className="header-time" id="headerTime" />
            <form action="/api/auth/logout" method="post">
              <input type="hidden" name="location" value={location} />
              <button className="logout-btn" type="submit">
                Logout
              </button>
            </form>
          </div>
        </div>

        {/* Camera Grid */}
        <div className="grid" id="grid" />
      </main>

      {/* Fullscreen Overlay */}
      <div className="fs-overlay" id="fsOverlay">
        <button className="fs-close" id="fsClose">
          &times;
        </button>
        <div className="fs-video-wrap" id="fsWrap">
          <div className="fs-info" id="fsInfo" />
        </div>
      </div>

      <Script src="/video-stream.js" type="module" strategy="beforeInteractive" />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
