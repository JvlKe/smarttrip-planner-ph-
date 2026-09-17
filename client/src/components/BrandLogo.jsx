import { Link } from "react-router-dom";

export default function BrandLogo({ className = "", inverse = false }) {
  return (
    <Link
      className={`fresh-brand ${inverse ? "fresh-brand-inverse" : ""} ${className}`.trim()}
      to="/"
      aria-label="SmartTrip Planner PH home"
    >
      <img src="/assets/smarttrip-logo.webp" alt="" />
      <span className="sr-only">SmartTrip Planner PH</span>
    </Link>
  );
}
