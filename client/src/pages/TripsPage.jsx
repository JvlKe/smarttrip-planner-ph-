import { useEffect, useState, useCallback } from "react";
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
  const [trips, setTrips] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(params.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(params.get("q") || "");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ACTIVE");
  const [sort, setSort] = useState("UPDATED");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Debounce the text search so we don't fire on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset page when filter or sort changes
  useEffect(() => { setPage(1); }, [filter, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        sort,
        page,
        pageSize: PAGE_SIZE,
      });
      if (debouncedQuery) qs.set("q", debouncedQuery);
      if (filter !== "ALL") qs.set("status", filter);

      const result = await api(`/trips?${qs}`);
      // Handle both old array shape (fallback) and new { trips, pagination } shape
      if (Array.isArray(result)) {
        setTrips(result.filter(Boolean));
        setPagination(null);
      } else {
        const nextPagination = result.pagination ?? null;
        const lastPage = Math.max(1, nextPagination?.totalPages ?? 1);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setTrips(
          Array.isArray(result.trips) ? result.trips.filter(Boolean) : [],
        );
        setPagination(nextPagination);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filter, sort, page]);

  useEffect(() => { load(); }, [load]);

  async function remove(id) {
    const trip = trips.find((t) => t.id === id);
    if (
      !confirm(
        `Permanently delete "${trip?.name || "this trip"}"? This cannot be undone.`,
      )
    )
      return;
    try {
      await api(`/trips/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      if (e.status === 404) {
        await load();
        setError(
          "That trip had already been deleted. The list is now refreshed.",
        );
      } else {
        setError(e.message);
      }
    }
  }

  async function action(trip, act) {
    const labels = {
      COMPLETE: "mark this trip completed",
      REOPEN: "mark this trip active again",
      ARCHIVE: "archive this trip",
      RESTORE: "restore this trip",
    };
    if (!confirm(`Are you sure you want to ${labels[act]}?`)) return;
    await api(`/trips/${trip.id}/status`, {
      method: "POST",
      body: JSON.stringify({ action: act }),
    });
    await load();
  }

  async function duplicate(trip) {
    await api(`/trips/${trip.id}/duplicate`, { method: "POST" });
    await load();
  }

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

  const totalPages = pagination?.totalPages ?? 1;
  const hasListFilters = Boolean(debouncedQuery) || filter !== "ACTIVE";

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
          <label className="trip-search">
            <Icon name="search" size={16} />
            <input
              aria-label="Search trips or destinations"
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
              ["IN_PROGRESS", "Ongoing"],
              ["COMPLETED", "Completed"],
              ["CANCELLED", "Cancelled"],
              ["ARCHIVED", "Archived"],
            ].map(([value, label]) => (
              <button
                className={filter === value ? "selected" : ""}
                aria-pressed={filter === value}
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
        ) : trips.length ? (
          <>
            <div className="trip-grid large">
              {trips.map((t) => (
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
            {totalPages > 1 && (
              <nav className="pagination" aria-label="Trip pages">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                  {pagination?.total != null && ` · ${pagination.total} trips`}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="empty-state dashboard-empty">
            <span>＋</span>
            <h2>{hasListFilters ? "No matching trips" : "No trips in this view"}</h2>
            <p>
              {hasListFilters
                ? "Try another search or clear the selected status."
                : "Create a trip to start planning your itinerary."}
            </p>
            {hasListFilters ? (
              <button
                className="btn outline"
                onClick={() => {
                  setQuery("");
                  setFilter("ACTIVE");
                }}
              >
                Clear search and filters
              </button>
            ) : (
              <Link className="btn primary" to="/app/create">
                Plan a trip
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
