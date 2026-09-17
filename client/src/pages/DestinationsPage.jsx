import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import PageHeader from "../components/PageHeader";
import DestinationPhoto from "../components/DestinationPhoto";
import Icon from "../components/Icon";
import { peso } from "../lib/tripView";

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState([]);
  const [query, setQuery] = useState("");
  const [interest, setInterest] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setDestinations(await api("/destinations"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const interests = [
    ...new Set(destinations.flatMap((d) => d.interests)),
  ].sort();
  const shown = destinations.filter(
    (d) =>
      [d.name, d.region, d.province]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!interest || d.interests.includes(interest)),
  );
  return (
    <>
      <PageHeader
        title="Explore Destinations"
        subtitle="Find your next Philippine adventure."
      />
      <div className="page destination-page">
        <section className="discovery-banner">
          <div>
            <span className="eyebrow">
              A LITTLE CURIOSITY. A NEW ADVENTURE.
            </span>
            <h2>Where will you go next?</h2>
            <p>
              Explore islands, highlands, heritage cities, and everything in
              between.
            </p>
          </div>
          <Icon name="map" size={72} />
        </section>
        <div className="discovery-filters raised-card">
          <label className="search-field">
            <Icon name="search" />
            <input
              aria-label="Search destinations"
              placeholder="Search by destination or region"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter by interest"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
          >
            <option value="">All interests</option>
            {interests.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
          <span>{shown.length} destinations</span>
        </div>
        {error ? (
          <section className="section-failure" role="alert">
            <p>{error}</p>
            <button className="btn outline" onClick={load}>
              Try again
            </button>
          </section>
        ) : loading ? (
          <div className="trip-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton skeleton-card" />
            ))}
          </div>
        ) : (
          <div className="destination-grid">
            {shown.map((destination) => (
              <article
                className="destination-card raised-card"
                key={destination.id}
              >
                <div className="destination-photo">
                  <DestinationPhoto trip={{ destination }} />
                  <span>{destination.region}</span>
                </div>
                <div className="destination-content">
                  <h2>{destination.name}</h2>
                  <p>{destination.description}</p>
                  <div className="interest-tags">
                    {destination.interests.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setInterest(i)}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <details>
                    <summary>Best months &amp; estimated budget</summary>
                    <p>{destination.bestMonths.join(", ")}</p>
                    <p>
                      {peso(destination.dailyBudgetMin)}–
                      {peso(destination.dailyBudgetMax)} / day ·{" "}
                      {destination.suggestedDays} suggested days
                    </p>
                  </details>
                  <Link
                    className="btn primary"
                    to={`/app/create?destination=${destination.id}`}
                  >
                    Plan a trip here <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && !shown.length && (
          <div className="empty-state">
            <h2>No matching destinations</h2>
            <p>Try a different search or interest.</p>
            <button
              className="btn ghost"
              onClick={() => {
                setQuery("");
                setInterest("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </>
  );
}
