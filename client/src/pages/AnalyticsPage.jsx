import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import useTrips from "../hooks/useTrips";
import {
  peso,
  summarizeTrips,
  saveDownload,
  statusLabel,
  tripDays,
} from "../lib/tripView";

export default function AnalyticsPage() {
  const { trips, loading, error, reload } = useTrips();
  const active = trips.filter(
    (t) => !["ARCHIVED", "CANCELLED"].includes(t.status),
  );
  const stats = summarizeTrips(trips);
  const allocations = [
    "transport",
    "accommodation",
    "food",
    "activities",
    "emergency",
  ].map((category) => ({
    category,
    value: active.reduce(
      (sum, t) => sum + Number(t.budget?.[category] || 0),
      0,
    ),
  }));
  const allocationTotal = allocations.reduce((sum, x) => sum + x.value, 0);
  const totalTravelers = active.reduce(
    (sum, t) => sum + (Number(t.travelers) || 1),
    0,
  );
  function download() {
    saveDownload(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          basis: "Planned budgets, not actual spending",
          summary: stats,
          allocations,
          trips: active.map(
            ({ id, name, totalBudget, status, startDate, endDate }) => ({
              id,
              name,
              totalBudget,
              status,
              startDate,
              endDate,
            }),
          ),
        },
        null,
        2,
      ),
      "smarttrip-budget-summary.json",
    );
  }
  return (
    <>
      <PageHeader
        title="Travel Analytics"
        subtitle="Your adventures and estimated budgets, at a glance."
      />
      <div className="page analytics-page">
        {error ? (
          <div className="section-failure" role="alert">
            <p>{error}</p>
            <button onClick={reload}>Try again</button>
          </div>
        ) : loading ? (
          <div className="screen-loader">Loading travel analytics…</div>
        ) : (
          <>
            <div className="stats dashboard-stats">
              {[
                ["trips", stats.total, "Trips planned"],
                ["check", stats.completed, "Completed trips"],
                ["calendar", stats.days, "Travel days"],
                ["wallet", peso(stats.budget), "Total estimated budget"],
              ].map(([icon, value, label]) => (
                <article key={label}>
                  <span>
                    <Icon name={icon} />
                  </span>
                  <div>
                    <b>{value}</b>
                    <small>{label}</small>
                  </div>
                </article>
              ))}
            </div>
            <div className="analytics-grid">
              <section className="raised-card analytics-panel">
                <div className="section-heading">
                  <h2>Budget allocation</h2>
                  <Icon name="wallet" />
                </div>
                <p>
                  Planned amounts across active and completed trips. These are
                  estimates, not recorded expenses.
                </p>
                <div className="allocation-stack">
                  {allocations.map(({ category, value }, i) => (
                    <i
                      key={category}
                      title={`${category}: ${peso(value)}`}
                      style={{
                        width: `${allocationTotal ? (value / allocationTotal) * 100 : 0}%`,
                        background: `var(--chart-${i})`,
                      }}
                    />
                  ))}
                </div>
                <div className="allocation-list">
                  {allocations.map(({ category, value }, i) => (
                    <div key={category}>
                      <span>
                        <i style={{ background: `var(--chart-${i})` }} />
                        {category}
                      </span>
                      <b>{peso(value)}</b>
                    </div>
                  ))}
                </div>
                <button className="btn ghost" onClick={download}>
                  <Icon name="download" size={16} /> Download summary
                </button>
              </section>
              <section className="raised-card analytics-panel">
                <h2>Travel at a glance</h2>
                <dl className="insight-list">
                  <div>
                    <dt>Destinations planned</dt>
                    <dd>{stats.destinations}</dd>
                  </div>
                  <div>
                    <dt>Average trip budget</dt>
                    <dd>
                      {peso(stats.total ? stats.budget / stats.total : 0)}
                    </dd>
                  </div>
                  <div>
                    <dt>Budget per travel day</dt>
                    <dd>{peso(stats.days ? stats.budget / stats.days : 0)}</dd>
                  </div>
                  <div>
                    <dt>Travelers across trips</dt>
                    <dd>{totalTravelers}</dd>
                  </div>
                </dl>
                <Link className="btn primary" to="/app/create">
                  <Icon name="plus" size={16} /> Plan your next trip
                </Link>
              </section>
            </div>
            <section className="raised-card analytics-panel">
              <div className="section-heading">
                <h2>Trip budgets</h2>
                <Link to="/app/trips">
                  View all trips <Icon name="arrow" size={16} />
                </Link>
              </div>
              <div className="budget-trip-list">
                {active.map((t) => (
                  <Link key={t.id} to={`/app/trips/${t.id}`}>
                    <span>
                      <b>{t.name}</b>
                      <small>
                        {statusLabel(t.status)} · {tripDays(t)} days
                      </small>
                    </span>
                    <strong>{peso(t.totalBudget)}</strong>
                    <Icon name="arrow" size={16} />
                  </Link>
                ))}
              </div>
              {!active.length && (
                <p>Create a trip to start seeing your travel statistics.</p>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
