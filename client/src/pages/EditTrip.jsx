import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
const interests = [
  "Beach",
  "Nature",
  "Food",
  "History",
  "Culture",
  "Adventure",
  "Diving",
  "Surfing",
  "Photography",
  "Family",
];
export default function EditTrip() {
  const { id } = useParams(),
    nav = useNavigate();
  const [destinations, setDestinations] = useState([]),
    [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saveStatus, setSaveStatus] = useState("Saved");
  const skipAutosave = useRef(true);
  useEffect(() => {
    Promise.all([api("/destinations"), api(`/trips/${id}`)])
      .then(([places, t]) => {
        setDestinations(places);
        const serverForm = {
          name: t.name,
          destinationId: t.destinationId || "",
          customLocation: t.customLocation || null,
          startDate: t.startDate.slice(0, 10),
          endDate: t.endDate.slice(0, 10),
          travelers: t.travelers,
          totalBudget: Number(t.totalBudget),
          travelStyle: t.travelStyle,
          transportMode: t.transportMode || "PUBLIC_TRANSPORT",
          planningMode: t.planningMode,
          interests: t.interests || [],
          desiredPlaces: t.desiredPlaces || "",
          notes: t.notes || null,
        };
        try {
          const draft = JSON.parse(
            localStorage.getItem(`smarttrip-edit-draft-${id}`),
          );
          setForm(draft || serverForm);
          if (draft) setSaveStatus("Recovered unsaved draft");
        } catch {
          setForm(serverForm);
        }
      })
      .catch((e) => setError(e.message));
  }, [id]);
  const payload = (value) => ({
    ...value,
    destinationId: Number(value.destinationId),
    travelers: Number(value.travelers),
    totalBudget: Number(value.totalBudget),
  });
  useEffect(() => {
    if (!form) return;
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    localStorage.setItem(`smarttrip-edit-draft-${id}`, JSON.stringify(form));
    const valid =
      form.name.trim().length >= 3 &&
      form.destinationId &&
      form.startDate &&
      form.endDate >= form.startDate &&
      Number(form.travelers) >= 1 &&
      Number(form.totalBudget) >= 1000;
    if (!valid) {
      setSaveStatus("Draft kept — complete required fields");
      return;
    }
    setSaveStatus("Saving…");
    const timer = setTimeout(async () => {
      try {
        await api(`/trips/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload(form)),
        });
        localStorage.removeItem(`smarttrip-edit-draft-${id}`);
        setSaveStatus("Saved");
      } catch (e) {
        setSaveStatus("Save failed — draft kept on this device");
        setError(e.message);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [form, id]);
  if (!form)
    return <div className="screen-loader">{error || "Loading trip…"}</div>;
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value }),
    toggle = (x) =>
      setForm({
        ...form,
        interests: form.interests.includes(x)
          ? form.interests.filter((i) => i !== x)
          : [...form.interests, x],
      });
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/trips/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload(form)),
      });
      localStorage.removeItem(`smarttrip-edit-draft-${id}`);
      nav(`/app/trips/${id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <div>
          <small>MY TRIPS</small>
          <h1>Edit Trip</h1>
        </div>
        <Link className="btn ghost" to={`/app/trips/${id}`}>
          Cancel
        </Link>
      </header>
      <div className="page">
        <form onSubmit={save}>
          <section className="form-card">
            <div className="form-title">
              <span>✎</span>
              <div>
                <h3>Trip details</h3>
                <p>Update dates, budget, travel style, or transportation.</p>
              </div>
            </div>
            <div className="field-grid">
              <label>
                Trip name
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Destination
                <select
                  name="destinationId"
                  value={form.destinationId}
                  onChange={update}
                  required
                >
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.region}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Start date
                <input
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={update}
                  required
                />
              </label>
              <label>
                End date
                <input
                  name="endDate"
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Travelers
                <input
                  name="travelers"
                  type="number"
                  min="1"
                  max="30"
                  value={form.travelers}
                  onChange={update}
                />
              </label>
              <label>
                Budget (PHP)
                <input
                  name="totalBudget"
                  type="number"
                  min="1000"
                  value={form.totalBudget}
                  onChange={update}
                />
              </label>
              <label>
                Travel style
                <select
                  name="travelStyle"
                  value={form.travelStyle}
                  onChange={update}
                >
                  <option value="BUDGET">Budget</option>
                  <option value="MID_RANGE">Mid-range</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </label>
              <label>
                Main transportation
                <select
                  name="transportMode"
                  value={form.transportMode}
                  onChange={update}
                >
                  <option value="PUBLIC_TRANSPORT">Public transport</option>
                  <option value="PRIVATE_VEHICLE">Private vehicle</option>
                </select>
              </label>
            </div>
          </section>
          <section className="form-card">
            <div className="form-title">
              <span>⌖</span>
              <div>
                <h3>Optional places to include</h3>
                <p>Add destination-relevant places for future AI generation.</p>
              </div>
            </div>
            <label>
              Places you want to visit (optional)
              <textarea
                name="desiredPlaces"
                value={form.desiredPlaces || ""}
                onChange={update}
                maxLength="800"
                rows="3"
                placeholder="Example: Burnham Park, Camp John Hay, and a local strawberry farm"
              />
            </label>
            <p className="field-help">
              Only places within or reasonably close to the selected destination
              are considered. Unrelated requests are ignored.
            </p>
          </section>
          <section className="form-card">
            <h3>Interests</h3>
            <div className="interest-grid">
              {interests.map((x) => (
                <button
                  type="button"
                  className={`chip ${form.interests.includes(x) ? "selected" : ""}`}
                  onClick={() => toggle(x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
            </div>
          </section>
          {error && <div className="form-error form-card">{error}</div>}
          <div className="form-actions">
            <span aria-live="polite">{saveStatus}</span>
            <button className="btn primary big" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
