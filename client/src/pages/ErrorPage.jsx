import { Link } from "react-router-dom";

export default function ErrorPage({
  title = "Page not found",
  message = "The page may have moved or may no longer be available.",
}) {
  return (
    <main className="route-error" id="main-content">
      <img src="/assets/lakbay-tarsier.webp" alt="Atlas" />
      <span className="eyebrow">SMARTTRIP PH</span>
      <h1>{title}</h1>
      <p>{message}</p>
      <div>
        <Link className="btn primary" to="/app">
          Dashboard
        </Link>
        <Link className="btn outline" to="/app/trips">
          My Trips
        </Link>
      </div>
    </main>
  );
}
