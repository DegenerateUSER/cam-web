import Link from "next/link";

export default function Home() {
  const locations = [
    {
      key: "ghaziabad",
      name: "Ghaziabad CPLI",
      cameras: 2,
      color: "blue",
    },
    {
      key: "hapur",
      name: "Hapur IRCA",
      cameras: 7,
      color: "green",
    },
    {
      key: "shamli",
      name: "Shamli DDAC",
      cameras: 8,
      color: "purple",
    },
  ];

  return (
    <main className="landing-page">
      <div className="landing-glow" />

      <div className="landing-header">
        <div className="landing-badge">
          <span className="landing-rec-dot" />
          LIVE SURVEILLANCE
        </div>
        <h1 className="landing-title">Camera Monitoring Portal</h1>
        <p className="landing-subtitle">
          Select a location to access its live camera feeds. Each location requires separate authentication.
        </p>
      </div>

      <div className="location-cards">
        {locations.map((loc) => (
          <Link
            key={loc.key}
            href={`/${loc.key}`}
            className="location-card"
            data-location={loc.key}
            id={`card-${loc.key}`}
          >
            <div className="location-card-icon">📍</div>
            <div className="location-card-name">{loc.name}</div>
            <div className="location-card-meta">
              <span className="location-card-count">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {loc.cameras} Cameras
              </span>
            </div>
            <div className="location-card-arrow">VIEW FEEDS →</div>
          </Link>
        ))}
      </div>

      <div className="landing-footer">
        <p>Secure access • Independent authentication per location</p>
      </div>
    </main>
  );
}
