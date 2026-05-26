import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getAuthCookieName, isValidSessionToken, VALID_LOCATIONS } from "../../api/_lib/auth";

const LOCATION_NAMES = {
  ghaziabad: "Ghaziabad CPLI",
  hapur: "Hapur IRCA",
  shamli: "Shamli DDAC",
};

export function generateStaticParams() {
  return VALID_LOCATIONS.map((loc) => ({ location: loc }));
}

export default function LocationLoginPage({ params, searchParams }) {
  const { location } = params;

  if (!VALID_LOCATIONS.includes(location)) {
    notFound();
  }

  const cookieName = getAuthCookieName(location);
  const token = cookies().get(cookieName)?.value;

  if (isValidSessionToken(token, location)) {
    redirect(`/${location}`);
  }

  const hasError = Boolean(searchParams?.error);
  const locationName = LOCATION_NAMES[location] || location;

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-brand">
          <Link href="/" className="auth-back-link">
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
            Back to Locations
          </Link>
          <div className="auth-badge">Protected Zone</div>
          <h1>{locationName}</h1>
          <p className="auth-location-label">Camera Monitoring Portal</p>
          <p>
            Streams at this location are restricted to authorized users. Sign in to access live feeds
            and playback methods.
          </p>
          <div className="auth-feature-list">
            <div>Access to HLS, WebRTC, MP4 and MJPEG modes</div>
            <div>Secure gateway to private camera endpoints</div>
          </div>
        </aside>

        <section className="auth-card">
          <h2>Sign in</h2>
          <p>Enter your credentials for <strong>{locationName}</strong>.</p>
          {hasError ? (
            <div className="auth-error">Invalid username or password.</div>
          ) : null}

          <form className="auth-form" method="post" action="/api/auth/login">
            <input type="hidden" name="location" value={location} />

            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />

            <button type="submit">Continue</button>
          </form>
        </section>
      </section>
    </main>
  );
}
