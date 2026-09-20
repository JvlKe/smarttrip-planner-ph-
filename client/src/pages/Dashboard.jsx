import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DestinationPhoto from "../components/DestinationPhoto";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import useTrips from "../hooks/useTrips";
import {
  dateLabel,
  destinationName,
  peso,
  statusLabel,
  summarizeTrips,
  tripDays,
} from "../lib/tripView";
import { profileGreetingName } from "../lib/profileName";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const name = profileGreetingName(profile, user);
  const { trips, loading, error, reload } = useTrips();
  const stats = summarizeTrips(trips);
  const today = new Date().toLocaleDateString("en-CA");
  const eligible = trips.filter(
    (t) => !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(t.status),
  );
  const nextTrip = [...eligible]
    .filter((t) => t.endDate.slice(0, 10) >= today)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
  const continueTrip = eligible.find((t) =>
    ["PLANNING", "DRAFT"].includes(t.status),
  );
  const completed = trips.find((t) => t.status === "COMPLETED");
  const daysUntil = nextTrip
    ? Math.max(
        0,
        Math.round(
          (Date.parse(nextTrip.startDate.slice(0, 10)) - Date.parse(today)) /
            86400000,
        ),
      )
    : 0;
  const quickActions = [
    ["plus", "Create New Trip", "Plan a new adventure", "/app/create"],
    [
      "pin",
      "Explore Destinations",
      "Find your next escape",
      "/app/destinations",
    ],
    ["trips", "Browse Trips", "Pick up where you left off", "/app/trips"],
    ["wallet", "Budget Overview", "Review your estimates", "/app/analytics"],
  ];
  return (
    <>
      <PageHeader
        title={`Good day, ${name}! 👋`}
        subtitle={new Date().toLocaleDateString("en-PH", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      />
      <div className="dash tactile-dashboard">
        <section className="journey-welcome">
          <div>
            <span className="eyebrow">YOUR PHILIPPINE ADVENTURE</span>
            <h2>A little planning.<br />A world of possibilities.</h2>
            <p>From your first stop to your last sunset, keep your journey together.</p>
            <Link className="btn primary" to="/app/create">Plan your next trip <Icon name="arrow" size={18} /></Link>
          </div>
          <img src="/assets/palawan-hero.webp" alt="Turquoise water and limestone cliffs in Palawan" />
          <span className="journey-caption"><Icon name="pin" size={14} /> Palawan, Philippines</span>
        </section>
        <div className="stats dashboard-stats" aria-busy={loading}>
          {[
            ["plane", stats.total, "Total trips"],
            ["pin", stats.upcoming, "Upcoming"],
            ["map", stats.destinations, "Destinations planned"],
            ["wallet", peso(stats.budget), "Total trip budgets"],
          ].map(([icon, value, label]) => (
            <article key={label}>
              <span>
                <Icon name={icon} size={24} />
              </span>
              <div>
                <b>{loading ? "–" : value}</b>
                <small>{label}</small>
              </div>
              <Icon className="stat-spark" name="chart" size={15} />
            </article>
          ))}
        </div>
        <Link className="btn primary mobile-create-trip" to="/app/create">
          <Icon name="plus" /> Create New Trip
        </Link>
        {error ? (
          <section className="section-failure" role="alert">
            <b>Unable to load your dashboard.</b>
            <p>{error}</p>
            <button className="btn outline" onClick={reload}>
              Try again
            </button>
          </section>
        ) : loading ? (
          <div className="trip-grid" aria-label="Loading trips">
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton skeleton-card" />
            ))}
          </div>
        ) : (
          <>
            <div className="dashboard-main-grid">
              <section className="upcoming-section">
                <div className="section-heading">
                  <h2>Upcoming Trip</h2>
                  <Link to="/app/trips">
                    View all <Icon name="arrow" size={15} />
                  </Link>
                </div>
                {nextTrip ? (
                  <article className="featured-trip raised-card">
                    <div className="featured-trip-photo">
                      <DestinationPhoto trip={nextTrip} eager />
                      <span className="departure-badge">
                        {nextTrip.status === "IN_PROGRESS"
                          ? "Enjoy your trip!"
                          : daysUntil === 0
                            ? "Starts today"
                            : `${daysUntil} days to go!`}
                      </span>
                    </div>
                    <div className="featured-trip-content">
                      <h2>{nextTrip.name}</h2>
                      <p className="detail-line">
                        <Icon name="pin" size={15} />{" "}
                        {destinationName(nextTrip)}
                      </p>
                      <p className="detail-line">
                        <Icon name="calendar" size={15} />{" "}
                        {dateLabel(nextTrip.startDate)} –{" "}
                        {dateLabel(nextTrip.endDate)} · {tripDays(nextTrip)}{" "}
                        days
                      </p>
                      <div className="featured-budget">
                        <span>
                          Trip budget: <b>{peso(nextTrip.totalBudget)}</b>
                        </span>
                        <span>
                          {nextTrip.travelers} traveler
                          {nextTrip.travelers === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="interest-tags">
                        {(nextTrip.interests || []).map((interest) => (
                          <span key={interest}>{interest}</span>
                        ))}
                      </div>
                      <div className="featured-actions">
                        <Link
                          className="btn primary"
                          to={`/app/trips/${nextTrip.id}`}
                        >
                          <Icon name="edit" size={16} /> View Itinerary
                        </Link>
                        <Link
                          className="btn ghost"
                          to={`/app/trips/${nextTrip.id}/edit`}
                        >
                          <Icon name="check" size={16} /> Edit Trip
                        </Link>
                      </div>
                    </div>
                  </article>
                ) : (
                  <div className="raised-card empty-state">
                    <Icon name="plane" size={38} />
                    <h2>Your next adventure starts here</h2>
                    <p>
                      Choose a destination, dates, and a budget that works for
                      you.
                    </p>
                    <Link className="btn primary" to="/app/create">
                      Plan a trip <Icon name="arrow" size={16} />
                    </Link>
                  </div>
                )}
              </section>
              <section className="quick-actions-section">
                <div className="section-heading">
                  <h2>Quick Actions</h2>
                </div>
                <div className="quick-actions-grid">
                  {quickActions.map(([icon, label, description, to]) => (
                    <Link className="quick-action raised-card" to={to} key={to}>
                      <span
                        className={icon === "wallet" ? "orange-medallion" : ""}
                      >
                        <Icon name={icon} size={25} />
                      </span>
                      <b>{label}</b>
                      <small>{description}</small>
                    </Link>
                  ))}
                </div>
                <p className="planner-ready">
                  <Icon name="spark" size={15} /> Your destinations, days, and budget — together.
                </p>
              </section>
            </div>
            {trips.length > 0 && (
              <section className="recent-section">
                <div className="section-heading">
                  <h2>Recent Trips</h2>
                  <Link to="/app/trips">
                    View all <Icon name="arrow" size={15} />
                  </Link>
                </div>
                <div className="recent-grid">
                  {trips.slice(0, 3).map((trip) => (
                    <Link
                      className="recent-card raised-card"
                      to={`/app/trips/${trip.id}`}
                      key={trip.id}
                    >
                      <div className="recent-photo">
                        <DestinationPhoto trip={trip} />
                      </div>
                      <div className="recent-content">
                        <h3>{trip.name}</h3>
                        <p>{dateLabel(trip.startDate)}</p>
                        <div>
                          <span
                            className={`trip-status status-${trip.status?.toLowerCase()}`}
                          >
                            {statusLabel(trip.status)}
                          </span>
                          <b>{peso(trip.totalBudget)}</b>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {(continueTrip || completed) && (
              <div className="dashboard-followups">
                {continueTrip && (
                  <section>
                    <span className="eyebrow">CONTINUE PLANNING</span>
                    <h3>{continueTrip.name}</h3>
                    <p>{continueTrip._count?.days ?? 0} itinerary days</p>
                    <Link to={`/app/trips/${continueTrip.id}`}>Continue →</Link>
                  </section>
                )}
                {completed && (
                  <section>
                    <span className="eyebrow">RECENTLY COMPLETED</span>
                    <h3>{completed.name}</h3>
                    <p>{destinationName(completed)}</p>
                    <Link to={`/app/trips/${completed.id}`}>
                      View summary →
                    </Link>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
