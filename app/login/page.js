import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, isValidSessionToken } from "../api/_lib/auth";

export const metadata = {
  title: "Login - Live Surveillance",
};

export default function LoginPage({ searchParams }) {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (isValidSessionToken(token)) {
    redirect("/");
  }

  const hasError = Boolean(searchParams?.error);

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-brand">
          <div className="auth-badge">Protected Zone</div>
          <h1>Camera Monitoring Portal</h1>
          <p>
            Streams are restricted to authorized users. Sign in to access live feeds and playback methods.
          </p>
          <div className="auth-feature-list">
            
            <div>Access to HLS, WebRTC, MP4 and MJPEG modes</div>
            <div>Secure gateway to private camera endpoints</div>
          </div>
        </aside>

        <section className="auth-card">
          <h2>Sign in</h2>
          <p>Use your authorized account to continue.</p>
          {hasError ? <div className="auth-error">Invalid username or password.</div> : null}

          <form className="auth-form" method="post" action="/api/auth/login">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text" autoComplete="username" required />

            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />

            <button type="submit">Continue</button>
          </form>
        </section>
      </section>
    </main>
  );
}
