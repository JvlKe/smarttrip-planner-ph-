import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
const peso = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(n));
export default function SharedTrip() {
  const { token } = useParams(),
    [trip, setTrip] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api(`/share/${token}`)
      .then(setTrip)
      .catch((e) => setError(e.message));
  }, [token]);
  if (error)
    return (
      <main className="shared-page empty-state">
        <h1>Shared trip unavailable</h1>
        <p>{error}</p>
      </main>
    );
  if (!trip) return <div className="screen-loader">Loading shared trip…</div>;
  return (
    <main className="shared-page">
      <header className="shared-header">
        <img src="/assets/smarttrip-logo.webp" alt="SmartTrip PH" />
        <button className="btn outline" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </header>
      <section className="shared-hero">
        <small>SHARED TRAVEL PLAN</small>
        <h1>{trip.name}</h1>
        <p>
          {trip.destination?.name || trip.customLocation} ·{" "}
          {new Date(trip.startDate).toLocaleDateString()} –{" "}
          {new Date(trip.endDate).toLocaleDateString()} · {trip.travelers}{" "}
          traveler(s) · {peso(trip.totalBudget)}
        </p>
      </section>
      {trip.days.map((day) => (
        <section className="shared-day" key={day.id}>
          <h2>
            Day {day.dayNumber}: {day.title}
          </h2>
          {day.activities.map((a) => (
            <article key={a.id}>
              <time>{a.startTime || "Flexible"}</time>
              <div>
                <h3>{a.title}</h3>
                <p>{a.description}</p>
                <small>
                  {a.location} · {peso(a.estimatedCost)}
                </small>
              </div>
            </article>
          ))}
        </section>
      ))}
      <p className="field-help">
        Planning estimates only. Personal account details and private trip notes
        are never included.
      </p>
    </main>
  );
}
