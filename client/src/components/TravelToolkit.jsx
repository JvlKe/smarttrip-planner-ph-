import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const categories = ["General", "Booking", "Packing", "Transport", "Budget"];

export default function TravelToolkit({ tripId }) {
  const [data, setData] = useState(null);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("General");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setError("");
      const result = await api(`/travel/${tripId}`);
      setData(result);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [tripId]);
  const completed =
    data?.checklist?.filter((item) => item.completed).length || 0;
  const total = data?.checklist?.length || 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const packingToAdd = useMemo(() => {
    const saved = new Set((data?.checklist || []).map((item) => item.label));
    return (data?.packing || []).filter((item) => !saved.has(item));
  }, [data]);
  async function add(e) {
    e?.preventDefault();
    if (!label.trim() || busy) return;
    setBusy(true);
    try {
      await api(`/travel/${tripId}/checklist`, {
        method: "POST",
        body: JSON.stringify({ label, category }),
      });
      setLabel("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function addPacking() {
    if (!packingToAdd.length || busy) return;
    setBusy(true);
    try {
      for (const item of packingToAdd)
        await api(`/travel/${tripId}/checklist`, {
          method: "POST",
          body: JSON.stringify({ label: item, category: "Packing" }),
        });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(item) {
    try {
      setData((current) => ({
        ...current,
        checklist: current.checklist.map((value) =>
          value.id === item.id
            ? { ...value, completed: !value.completed }
            : value,
        ),
      }));
      await api(`/travel/checklist/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !item.completed }),
      });
    } catch (e) {
      setError(e.message);
      await load();
    }
  }
  async function remove(id) {
    try {
      await api(`/travel/checklist/${id}`, { method: "DELETE" });
      setData((current) => ({
        ...current,
        checklist: current.checklist.filter((item) => item.id !== id),
      }));
    } catch (e) {
      setError(e.message);
    }
  }
  if (!data && !error)
    return (
      <section className="toolkit toolkit-loading" aria-busy="true">
        <h2>Travel toolkit</h2>
        <div className="toolkit-grid">
          {[1, 2, 3, 4].map((item) => (
            <article className="skeleton" key={item} />
          ))}
        </div>
      </section>
    );
  if (!data)
    return (
      <section className="toolkit section-failure">
        <b>Unable to load the travel toolkit.</b>
        <p>{error}</p>
        <button onClick={load}>Try again</button>
      </section>
    );
  return (
    <section className="toolkit">
      <div className="toolkit-title">
        <div>
          <span className="eyebrow">TRIP READINESS</span>
          <h2>Travel toolkit</h2>
          <p>Departure details, packing, reminders, and safety in one place.</p>
        </div>
        <span className="toolkit-ready">{progress}% checklist ready</span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="toolkit-grid">
        <article className="departure-tool">
          <header className="tool-card-head">
            <span>✈</span>
            <div>
              <small>BEFORE YOU GO</small>
              <h3>Departure overview</h3>
            </div>
          </header>
          <div className="departure-countdown">
            <b>
              {data.departure.phase === "COMPLETED"
                ? "Trip completed"
                : data.departure.phase === "IN_PROGRESS"
                  ? "Trip in progress"
                  : data.departure.daysUntil === 0
                    ? "Starts today"
                    : `${data.departure.daysUntil} day${data.departure.daysUntil === 1 ? "" : "s"} to go`}
            </b>
            <span>
              {data.departure.destination}
              {data.departure.region ? ` · ${data.departure.region}` : ""}
            </span>
          </div>
          <dl className="departure-facts">
            <div>
              <dt>Starting point</dt>
              <dd>{data.departure.startingPoint}</dd>
            </div>
            <div>
              <dt>Dates</dt>
              <dd>
                {new Date(data.departure.startDate).toLocaleDateString()} –{" "}
                {new Date(data.departure.endDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>
                {data.departure.durationDays} day
                {data.departure.durationDays === 1 ? "" : "s"}
              </dd>
            </div>
            <div>
              <dt>Travelers</dt>
              <dd>{data.departure.travelers}</dd>
            </div>
            <div>
              <dt>Main transport</dt>
              <dd>
                {data.departure.transportMode === "PRIVATE_VEHICLE"
                  ? "Private vehicle"
                  : "Public transport"}
              </dd>
            </div>
          </dl>
          <div className="departure-reminders">
            <h4>Before departure</h4>
            <ul>
              {data.departure.preparation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </article>
        <article className="packing-tool">
          <header className="tool-card-head">
            <span>🎒</span>
            <div>
              <small>PERSONALIZED FOR THIS TRIP</small>
              <h3>Packing guide</h3>
            </div>
          </header>
          <ul className="packing-list">
            {data.packing.map((item) => (
              <li key={item}>
                <span>✓</span>
                {item}
              </li>
            ))}
          </ul>
          <button
            className="btn outline toolkit-wide-button"
            onClick={addPacking}
            disabled={busy || !packingToAdd.length}
          >
            {!packingToAdd.length
              ? "Packing list added"
              : `Add ${packingToAdd.length} items to checklist`}
          </button>
        </article>
        <article className="checklist-tool">
          <header className="tool-card-head">
            <span>✓</span>
            <div>
              <small>
                {completed} OF {total} COMPLETE
              </small>
              <h3>My checklist & notes</h3>
            </div>
          </header>
          <div className="tool-progress">
            <i style={{ width: `${progress}%` }} />
          </div>
          <form className="checklist-add" onSubmit={add}>
            <input
              aria-label="New checklist item"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Add booking, note, or task…"
              maxLength="120"
            />
            <select
              aria-label="Checklist category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button className="btn primary" disabled={busy || !label.trim()}>
              Add
            </button>
          </form>
          <div className="checklist-list">
            {!total && (
              <p className="tool-empty">
                Nothing here yet. Add a task or import the packing guide.
              </p>
            )}
            {data.checklist.map((item) => (
              <div
                className={`check-item ${item.completed ? "completed" : ""}`}
                key={item.id}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggle(item)}
                  />
                  <span>
                    {item.label}
                    <small>{item.category}</small>
                  </span>
                </label>
                <button
                  aria-label={`Delete ${item.label}`}
                  title="Delete item"
                  onClick={() => remove(item.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </article>
        <article className="emergency-tool">
          <header className="tool-card-head">
            <span>☎</span>
            <div>
              <small>KEEP AVAILABLE OFFLINE</small>
              <h3>Emergency information</h3>
            </div>
          </header>
          <div className="emergency-list">
            {data.emergency.map((item) => (
              <div key={item.label}>
                <small>{item.label}</small>
                {item.href ? (
                  <a href={item.href}>{item.number}</a>
                ) : (
                  <b>{item.number}</b>
                )}
                {item.detail && <span>{item.detail}</span>}
              </div>
            ))}
          </div>
          <p className="safety-note">
            <b>Important:</b> Call 911 for a life-threatening emergency in the
            Philippines. Save local contacts and booking details before leaving.
          </p>
        </article>
      </div>
    </section>
  );
}
