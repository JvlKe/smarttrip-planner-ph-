import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import DestinationPhoto from "../components/DestinationPhoto";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import { peso } from "../lib/tripView";
import { useAuth } from "../context/AuthContext";
import TripGenerationScreen from "../components/TripGenerationScreen";
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
export default function CreateTrip() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const [params] = useSearchParams();
  const [destinations, setDestinations] = useState([]),
    [loadingPlaces, setLoadingPlaces] = useState(true),
    [busy, setBusy] = useState(false),
    [generationStage, setGenerationStage] = useState("saving"),
    [error, setError] = useState(""),
    [savedTrip, setSavedTrip] = useState(null),
    [draftStatus, setDraftStatus] = useState("Draft ready");
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("smarttrip-create-draft"));
      if (saved)
        return {
          ...saved,
          destinationId: params.get("destination") || saved.destinationId,
        };
    } catch {}
    return {
      name: "",
      destinationId: params.get("destination") || "",
      startDate: "",
      endDate: "",
      travelers: 1,
      totalBudget: 15000,
      travelStyle: "MID_RANGE",
      transportMode: "PUBLIC_TRANSPORT",
      planningMode: "AI",
      interests: [],
      desiredPlaces: "",
    };
  });
  const [destinationSearch, setDestinationSearch] = useState("");
  const [destinationPickerOpen, setDestinationPickerOpen] = useState(false);
  const [activeDestination, setActiveDestination] = useState(-1);
  useEffect(() => {
    api("/destinations")
      .then(setDestinations)
      .catch((e) => setError(`Could not load destinations: ${e.message}`))
      .finally(() => setLoadingPlaces(false));
  }, []);
  useEffect(() => {
    if (savedTrip) return;
    setDraftStatus("Saving draft…");
    const timer = setTimeout(() => {
      localStorage.setItem("smarttrip-create-draft", JSON.stringify(form));
      setDraftStatus("Draft saved on this device");
    }, 500);
    return () => clearTimeout(timer);
  }, [form, savedTrip]);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value }),
    toggle = (x) =>
      setForm({
        ...form,
        interests: form.interests.includes(x)
          ? form.interests.filter((i) => i !== x)
          : [...form.interests, x],
      });
  const tripDays =
    form.startDate && form.endDate
      ? Math.floor(
          (Date.parse(form.endDate + "T00:00:00Z") -
            Date.parse(form.startDate + "T00:00:00Z")) /
            86400000,
        ) + 1
      : 0;
  const exceedsDayLimit = tripDays > 30;
  const latestEndDate = form.startDate
    ? new Date(Date.parse(form.startDate + "T00:00:00Z") + 29 * 86400000)
        .toISOString()
        .slice(0, 10)
    : undefined;
  async function submit(e) {
    e.preventDefault();
    if (!profile) {
      setError("Finish setting up your profile before creating a trip.");
      return;
    }
    if (exceedsDayLimit) {
      setError(
        "Your selected trip is " +
          tripDays +
          " days. Please choose an end date within 30 days of the start date.",
      );
      return;
    }
    if (!destination) {
      setError("Choose a destination from the search results.");
      return;
    }
    setBusy(true);
    setGenerationStage("saving");
    setError("");
    let trip = savedTrip;
    try {
      if (!trip) {
        trip = await api("/trips", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            destinationId: Number(form.destinationId),
            travelers: Number(form.travelers),
            totalBudget: Number(form.totalBudget),
          }),
        });
        setSavedTrip(trip);
      }
      if (form.planningMode === "AI")
        setGenerationStage("generating");
      if (form.planningMode === "AI")
        await api(`/itinerary/trips/${trip.id}/generate`, {
          method: "POST",
          timeoutMs: 180000,
        });
      setGenerationStage("finishing");
      localStorage.removeItem("smarttrip-create-draft");
      nav(`/app/trips/${trip.id}`);
    } catch (e) {
      setError(
        trip
          ? `Your trip was saved, but AI generation failed: ${e.message}`
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  const locked = !!savedTrip;
  const destination = destinations.find(
    (d) => String(d.id) === String(form.destinationId),
  );
  const filteredDestinations = destinations.filter((place) =>
    `${place.name} ${place.region}`
      .toLocaleLowerCase()
      .includes(destinationSearch.trim().toLocaleLowerCase()),
  );
  function chooseDestination(place) {
    setForm((current) => ({ ...current, destinationId: String(place.id) }));
    setDestinationSearch("");
    setDestinationPickerOpen(false);
    setActiveDestination(-1);
  }
  function handleDestinationKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDestinationPickerOpen(true);
      setActiveDestination((current) =>
        Math.min(current + 1, filteredDestinations.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setDestinationPickerOpen(true);
      setActiveDestination((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && destinationPickerOpen) {
      event.preventDefault();
      const place =
        filteredDestinations[activeDestination] ||
        (filteredDestinations.length === 1 ? filteredDestinations[0] : null);
      if (place) chooseDestination(place);
    } else if (event.key === "Escape" && destinationPickerOpen) {
      event.preventDefault();
      setDestinationSearch("");
      setDestinationPickerOpen(false);
      setActiveDestination(-1);
    }
  }
  const checklist = [
    [!!profile?.location?.trim(), "Starting point"],
    [!!form.name.trim(), "Trip name"],
    [!!destination, "Destination"],
    [tripDays > 0 && !exceedsDayLimit, "Travel dates"],
    [Number(form.totalBudget) >= 1000, "Estimated budget"],
    [form.interests.length > 0, "Interests"],
  ];
  const complete = Math.round(
    (checklist.filter(([done]) => done).length / checklist.length) * 100,
  );
  return (
    <>
      {busy && (
        <TripGenerationScreen
          stage={generationStage}
          tripName={form.name}
          destination={destination?.name}
        />
      )}
      <PageHeader
        title="Create New Trip"
        subtitle="A thoughtful plan for your next adventure."
      />
      <div className="page create-page">
        <div className="create-layout">
          <form onSubmit={submit}>
            <div className="trip-limit-notice" role="note">
              <span className="trip-limit-icon" aria-hidden="true">
                !
              </span>
              <div>
                <strong>Trip length limit</strong>
                <p>You can create an itinerary for up to 30 days.</p>
              </div>
            </div>
            <section className="form-card">
              <div className="form-title">
                <span>⌖</span>
                <div>
                  <h3>Trip details</h3>
                  <p>Choose where, when, and how you want to travel.</p>
                </div>
              </div>
              <div className="trip-origin-summary" role="note">
                <span>Starting point</span>
                <strong>
                  {profile?.location || "Add a starting point in your profile"}
                </strong>
                <Link to="/app/profile#profile-information">
                  {profile?.location ? "Change" : "Add now"} →
                </Link>
              </div>
              <div className="field-grid">
                <label>
                  Trip name
                  <input
                    name="name"
                    value={form.name}
                    onChange={update}
                    required
                    disabled={locked}
                  />
                </label>
                <label
                  className="destination-field"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget))
                      setDestinationPickerOpen(false);
                  }}
                >
                  Destination
                  <div className="destination-picker">
                    <input
                      type="search"
                      role="combobox"
                      aria-label="Search destinations"
                      aria-autocomplete="list"
                      aria-expanded={destinationPickerOpen}
                      aria-controls="destination-options"
                      aria-activedescendant={
                        destinationPickerOpen && activeDestination >= 0
                          ? `destination-option-${filteredDestinations[activeDestination]?.id}`
                          : undefined
                      }
                      aria-required="true"
                      autoComplete="off"
                      placeholder={
                        loadingPlaces
                          ? "Loading destinations…"
                          : "Search 20 destinations by name or region"
                      }
                      value={
                        destinationPickerOpen
                          ? destinationSearch
                          : destination?.name || ""
                      }
                      onFocus={() => {
                        setDestinationSearch("");
                        setDestinationPickerOpen(true);
                        setActiveDestination(-1);
                      }}
                      onChange={(event) => {
                        setDestinationSearch(event.target.value);
                        setDestinationPickerOpen(true);
                        setActiveDestination(-1);
                        setForm((current) => ({
                          ...current,
                          destinationId: "",
                        }));
                      }}
                      onKeyDown={handleDestinationKeyDown}
                      disabled={loadingPlaces || locked}
                    />
                    {destinationPickerOpen && !loadingPlaces && !locked && (
                      <div
                        className="destination-options"
                        id="destination-options"
                        role="listbox"
                        aria-label="Matching destinations"
                      >
                        {filteredDestinations.length ? (
                          filteredDestinations.map((place, index) => (
                            <div
                              className={`destination-option${index === activeDestination ? " active" : ""}`}
                              id={`destination-option-${place.id}`}
                              key={place.id}
                              role="option"
                              aria-selected={
                                String(place.id) === String(form.destinationId)
                              }
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => chooseDestination(place)}
                            >
                              <span>{place.name}</span>
                              <small>{place.region}</small>
                            </div>
                          ))
                        ) : (
                          <p className="destination-no-results">
                            No destinations match “{destinationSearch}”.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </label>
                <label>
                  Start date
                  <input
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={update}
                    required
                    disabled={locked}
                  />
                </label>
                <label>
                  End date
                  <input
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    max={latestEndDate}
                    onChange={update}
                    required
                    disabled={locked}
                    aria-invalid={exceedsDayLimit}
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
                    disabled={locked}
                  />
                </label>
                <label>
                  Total estimated budget (PHP)
                  <input
                    name="totalBudget"
                    type="number"
                    min="1000"
                    step="500"
                    value={form.totalBudget}
                    onChange={update}
                    disabled={locked}
                  />
                </label>
                <label>
                  Travel style
                  <select
                    name="travelStyle"
                    value={form.travelStyle}
                    onChange={update}
                    disabled={locked}
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
                    disabled={locked}
                  >
                    <option value="PUBLIC_TRANSPORT">
                      Public transport — fares and transfers
                    </option>
                    <option value="PRIVATE_VEHICLE">
                      Private vehicle — fuel, tolls and parking
                    </option>
                  </select>
                </label>
              </div>
              {exceedsDayLimit && (
                <div className="date-limit-warning" role="alert">
                  <b>!</b>
                  <span>
                    This range is {tripDays} days. Move the end date to{" "}
                    <strong>{latestEndDate}</strong> or earlier (maximum 30
                    days).
                  </span>
                </div>
              )}
              <p className="field-help">
                Public transport reserves 20% of the estimate for transport.
                Private vehicle reserves 30% for fuel, tolls, and parking.
              </p>
            </section>
            <section className="form-card">
              <div className="form-title">
                <span>⌖</span>
                <div>
                  <h3>Optional places to include</h3>
                  <p>
                    Add specific attractions, restaurants, or areas you hope to
                    visit.
                  </p>
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
                  disabled={locked}
                  placeholder="Example: Burnham Park, Camp John Hay, and a local strawberry farm"
                />
              </label>
              <p className="field-help">
                The AI only considers places within or reasonably close to your
                selected destination. Unrelated or far-away requests are
                ignored.
              </p>
            </section>
            <section className="form-card">
              <div className="form-title">
                <span>♡</span>
                <div>
                  <h3>Interests</h3>
                  <p>Select what should shape the itinerary.</p>
                </div>
              </div>
              <div className="interest-grid">
                {interests.map((x) => (
                  <button
                    type="button"
                    disabled={locked}
                    className={`chip ${form.interests.includes(x) ? "selected" : ""}`}
                    onClick={() => toggle(x)}
                    key={x}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </section>
            <section className="form-card">
              <div className="form-title">
                <span>✦</span>
                <div>
                  <h3>Planning mode</h3>
                  <p>You can edit every activity later.</p>
                </div>
              </div>
              <div className="plan-choice">
                <label>
                  <input
                    type="radio"
                    name="planningMode"
                    value="AI"
                    checked={form.planningMode === "AI"}
                    onChange={update}
                    disabled={locked}
                  />
                  <span>✦</span>
                  <b>AI-assisted</b>
                  <small>Gemini or Groq creates the first draft.</small>
                </label>
                <label>
                  <input
                    type="radio"
                    name="planningMode"
                    value="MANUAL"
                    checked={form.planningMode === "MANUAL"}
                    onChange={update}
                    disabled={locked}
                  />
                  <span>✎</span>
                  <b>Build it myself</b>
                  <small>Begin with blank itinerary days.</small>
                </label>
              </div>
            </section>
            {error && (
              <div className="form-error form-card">
                {error}
                {savedTrip && (
                  <>
                    {" "}
                    <Link to={`/app/trips/${savedTrip.id}`}>
                      Open saved trip
                    </Link>
                  </>
                )}
              </div>
            )}
            <div className="form-actions">
              <span aria-live="polite">✓ {draftStatus}</span>
              <button
                className="btn primary big"
                disabled={busy || loadingPlaces}
              >
                {busy
                  ? "Please wait…"
                  : savedTrip
                    ? "Retry AI generation →"
                    : "Create trip →"}
              </button>
            </div>
          </form>
          <section
            className="create-preview-column"
            aria-label="Live trip preview"
          >
            <article className="raised-card create-preview">
              <h2>Trip preview</h2>
              <div className="preview-photo">
                {destination ? (
                  <DestinationPhoto trip={{ destination }} />
                ) : (
                  <Icon name="map" size={50} />
                )}
              </div>
              <h3>{form.name || "Your next adventure"}</h3>
              <p>{destination?.name || "Choose a destination"}</p>
              <dl>
                <div>
                  <dt>Duration</dt>
                  <dd>{tripDays > 0 ? tripDays + " days" : "Choose dates"}</dd>
                </div>
                <div>
                  <dt>Travelers</dt>
                  <dd>{form.travelers || 1}</dd>
                </div>
                <div>
                  <dt>Estimated budget</dt>
                  <dd>{peso(form.totalBudget)}</dd>
                </div>
                <div>
                  <dt>Planning</dt>
                  <dd>
                    {form.planningMode === "AI" ? "AI-assisted" : "Manual"}
                  </dd>
                </div>
              </dl>
            </article>
            <article className="raised-card create-preview">
              <h2>Plan completeness</h2>
              <strong className="completion-value">{complete}%</strong>
              <progress
                value={complete}
                max="100"
                aria-label="Plan completeness"
              />
              <ul>
                {checklist.map(([done, label]) => (
                  <li key={label}>
                    <Icon name={done ? "check" : "plus"} size={16} />
                    {label}
                  </li>
                ))}
              </ul>
            </article>
            {destination && (
              <article className="raised-card create-preview">
                <h2>About {destination.name}</h2>
                <p>{destination.description}</p>
                <p>
                  <b>Best months:</b> {destination.bestMonths.join(", ")}
                </p>
              </article>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
