import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import DestinationPhoto from "../components/DestinationPhoto";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
const peso = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(n));
export default function TripsPage() {
  const [params] = useSearchParams();
  const [trips, setTrips] = useState([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(params.get("q") || ""),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("ACTIVE"),
    [sort, setSort] = useState("UPDATED");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api("/trips");
      setTrips(Array.isArray(result) ? result.filter(Boolean) : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function remove(id) {
    const trip = trips.find((t) => t.id === id);
    if (
      !confirm(
        `Permanently delete “${trip?.name || "this trip"}”? This cannot be undone.`,
      )
    )
      return;
    try {
      await api(`/trips/${id}`, { method: "DELETE" });
      setTrips((x) => x.filter((t) => t.id !== id));
    } catch (e) {
      if (e.status === 404) {
        setTrips((x) => x.filter((t) => t.id !== id));
        setError(
          "That trip had already been deleted. The list is now refreshed.",
        );
      } else {
        setError(e.message);
      }
    }
  }
  async function action(trip, action) {
    const labels = {
      COMPLETE: "mark this trip completed",
      REOPEN: "mark this trip active again",
      ARCHIVE: "archive this trip",
      RESTORE: "restore this trip",
    };
    if (!confirm(`Are you sure you want to ${labels[action]}?`)) return;
    await api(`/trips/${trip.id}/status`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    await load();
  }
  async function duplicate(trip) {
    await api(`/trips/${trip.id}/duplicate`, { method: "POST" });
    await load();
  }
  const statusMatch = (t) =>
    filter === "ACTIVE"
      ? t.status !== "ARCHIVED"
      : filter === "ONGOING"
        ? t.status === "IN_PROGRESS"
        : t.status === filter;
  const shown = trips
    .filter(
      (t) =>
        statusMatch(t) &&
        `${t.name || ""} ${t.destination?.name || t.customLocation || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "OLDEST"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : sort === "UPCOMING"
          ? new Date(a.startDate) - new Date(b.startDate)
          : new Date(b.updatedAt) - new Date(a.updatedAt),
    );
  const countdown = (t) => {
    const days = Math.ceil((new Date(t.startDate) - new Date()) / 86400000);
    return days < 0
      ? null
      : days === 0
        ? "Starts today"
        : days === 1
          ? "Starts tomorrow"
          : `${days} days to go`;
  };
  return (
    <>
      <PageHeader
        title="My Trips"
        subtitle="All your Philippine adventures in one place."
      >
        <Link className="btn primary header-create" to="/app/create">
          <Icon name="plus" size={16} /> Create trip
        </Link>
      </PageHeader>
      <div className="page">
        <div className="filters">
          <label>
            ⌕{" "}
            <input
              placeholder="Search trips or destinations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="trip-filter-tabs" aria-label="Filter trips">
            {[
              ["ACTIVE", "All"],
              ["UPCOMING", "Upcoming"],
              ["PLANNING", "Planning"],
              ["DRAFT", "Draft"],
              ["ONGOING", "Ongoing"],
              ["COMPLETED", "Completed"],
              ["CANCELLED", "Cancelled"],
              ["ARCHIVED", "Archived"],
            ].map(([value, label]) => (
              <button
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value)}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            aria-label="Sort trips"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="UPDATED">Recently edited</option>
            <option value="UPCOMING">Upcoming first</option>
            <option value="OLDEST">Oldest first</option>
          </select>
        </div>
        {loading ? (
          <div className="trip-grid large" aria-label="Loading trips">
            {[1, 2, 3, 4].map((x) => (
              <article className="trip-card skeleton skeleton-card" key={x} />
            ))}
          </div>
        ) : error ? (
          <section className="section-failure">
            <b>Unable to load your trips.</b>
            <p>{error}</p>
            <button onClick={load}>Try again</button>
          </section>
        ) : shown.length ? (
          <div className="trip-grid large">
            {shown.map((t) => (
              <article className="trip-card" key={t.id}>
                <div
                  className={`trip-cover ${["el-nido", "coron"].includes(t.destination?.slug) ? "palawan" : t.destination?.slug === "boracay" ? "boracay" : "batanes"}`}
                >
                  <DestinationPhoto trip={t} className="trip-cover-image" />
                  <span>⌖</span>
                  <b className="status">
                    {(t.status || "PLANNING").replaceAll("_", " ")}
                  </b>
                </div>
                <div className="trip-body">
                  <small>
                    {new Date(t.startDate).toLocaleDateString()} –{" "}
                    {new Date(t.endDate).toLocaleDateString()}
                  </small>
                  <h3>{t.name}</h3>
                  <p>⌖ {t.destination?.name || t.customLocation}</p>
                  {countdown(t) && (
                    <p className="trip-countdown">{countdown(t)}</p>
                  )}
                  <div className="budget-label">
                    <span>{peso(t.totalBudget)} estimated budget</span>
                    <b>{t._count?.days ?? 0} days</b>
                  </div>
                  <div className="card-actions">
                    <Link className="text-btn" to={`/app/trips/${t.id}`}>
                      View details →
                    </Link>
                    <details className="trip-menu">
                      <summary aria-label={`Actions for ${t.name}`}>
                        •••
                      </summary>
                      <div>
                        <Link to={`/app/trips/${t.id}/edit`}>Edit</Link>
                        <button onClick={() => duplicate(t)}>Duplicate</button>
                        {t.status === "COMPLETED" ? (
                          <button onClick={() => action(t, "REOPEN")}>
                            Mark active again
                          </button>
                        ) : t.status === "ARCHIVED" ? (
                          <button onClick={() => action(t, "RESTORE")}>
                            Restore
                          </button>
                        ) : (
                          <>
                            <button onClick={() => action(t, "COMPLETE")}>
                              Complete
                            </button>
                            <button onClick={() => action(t, "ARCHIVE")}>
                              Archive
                            </button>
                          </>
                        )}
                        <button
                          className="delete-link"
                          onClick={() => remove(t.id)}
                        >
                          Delete permanently
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              </article>
            ))}
            <Link className="new-trip-tile" to="/app/create">
              <span>
                <Icon name="plus" size={30} />
              </span>
              <h3>Plan a new adventure</h3>
              <p>There is always more to explore.</p>
              <span className="btn outline">Create trip</span>
            </Link>
          </div>
        ) : (
          <div className="empty-state dashboard-empty">
            <span>＋</span>
            <h2>No trips yet</h2>
            <p>Create an AI-assisted or manual itinerary.</p>
            <Link className="btn primary" to="/app/create">
              Plan a trip
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
