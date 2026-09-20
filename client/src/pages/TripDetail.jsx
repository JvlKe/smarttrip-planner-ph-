import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MAPS_ENABLED } from "../lib/releaseScope";
import StaticTravelMap from "../components/StaticTravelMap";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { api } from "../lib/api";
import DestinationPhoto from "../components/DestinationPhoto";
import ItineraryPosterButton from "../components/ItineraryPosterButton";
import TravelToolkit from "../components/TravelToolkit";
import SectionBoundary from "../components/SectionBoundary";
import TripExportMenu from "../components/TripExportMenu";
import { useAuth } from "../context/AuthContext";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
const peso = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(n));
const blank = {
  title: "",
  description: "",
  category: "Sightseeing",
  startTime: "09:00",
  durationMin: 60,
  location: "",
  latitude: "",
  longitude: "",
  estimatedCost: 0,
  notes: "",
  referenceNumber: "",
  website: "",
  phone: "",
  status: "PLANNED",
  priority: "FLEXIBLE",
};

function distanceKm(from, to) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat = radians(to.latitude - from.latitude);
  const lon = radians(to.longitude - from.longitude);
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function travelEstimate(from, to, mode) {
  if (!from || !to || from.latitude == null || to.latitude == null) return null;
  const direct = distanceKm(from, to);
  const roadDistance = direct * 1.28;
  const privateVehicle = mode === "PRIVATE_VEHICLE";
  const minutes = Math.max(
    5,
    Math.round(
      (roadDistance / (privateVehicle ? 32 : 18)) * 60 +
        (privateVehicle ? 5 : 12),
    ),
  );
  return { distance: roadDistance, minutes };
}

function directionsUrl(from, to, mode) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  if (from?.latitude != null)
    url.searchParams.set("origin", `${from.latitude},${from.longitude}`);
  else if (from?.location) url.searchParams.set("origin", from.location);
  url.searchParams.set(
    "destination",
    to.latitude != null
      ? `${to.latitude},${to.longitude}`
      : to.location || to.title,
  );
  url.searchParams.set(
    "travelmode",
    mode === "PRIVATE_VEHICLE" ? "driving" : "transit",
  );
  return url.toString();
}

async function openDirections(from, to, mode, startingPoint) {
  let origin =
    from || (startingPoint?.trim() ? { location: startingPoint.trim() } : null);
  if (!origin) {
    try {
      if (!navigator.geolocation) throw new Error("Geolocation unavailable");
      const location = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 7000,
          maximumAge: 300000,
        }),
      );
      origin = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch {
      const manual = window.prompt(
        "Current location was unavailable. Enter a starting address (or Cancel to let Google Maps choose):",
      );
      if (manual?.trim()) origin = { location: manual.trim() };
    }
  }
  window.open(directionsUrl(origin, to, mode), "_blank", "noopener,noreferrer");
}

function clockMinutes(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function durationLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return (
    [hours ? `${hours}h` : "", rest ? `${rest}m` : ""]
      .filter(Boolean)
      .join(" ") || "0m"
  );
}

function MapController({ positions, focus, fitVersion }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo(focus, 14, { duration: 0.7 });
  }, [map, focus]);
  useEffect(() => {
    if (!positions.length) return;
    if (positions.length === 1) map.setView(positions[0], 13);
    else map.fitBounds(positions, { padding: [28, 28], maxZoom: 14 });
  }, [map, fitVersion]);
  return null;
}
const numberedIcon = (number, active, status = "PLANNED") =>
  L.divIcon({
    className: "numbered-marker-wrap",
    html: `<span class="numbered-marker ${active ? "active" : ""} marker-${status.toLowerCase()}"><b>${status === "VISITED" ? "✓" : status === "SKIPPED" ? "×" : number}</b></span>`,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
    popupAnchor: [0, -34],
  });

export default function TripDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [trip, setTrip] = useState(null),
    [selected, setSelected] = useState(0),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [editingId, setEditingId] = useState(null),
    [form, setForm] = useState(blank),
    [busy, setBusy] = useState(false),
    [shareMessage, setShareMessage] = useState(""),
    [activeActivity, setActiveActivity] = useState(null),
    [fitVersion, setFitVersion] = useState(0),
    [budgetEditing, setBudgetEditing] = useState(false),
    [budgetForm, setBudgetForm] = useState(null),
    [undoDelete, setUndoDelete] = useState(null),
    [activityFilter, setActivityFilter] = useState("ALL"),
    [baseEditing, setBaseEditing] = useState(false),
    [baseForm, setBaseForm] = useState(null),
    [alternativesOpen, setAlternativesOpen] = useState(false);
  const deleteTimer = useRef(null);
  const dayTabs = useRef(null);
  const dayDrag = useRef({
    active: false,
    moved: false,
    suppressClick: false,
    x: 0,
    left: 0,
  });
  async function shareTrip() {
    try {
      const link = await api(`/share/trips/${id}`, { method: "POST" });
      const url = `${location.origin}/share/${link.token}`;
      await navigator.clipboard.writeText(url);
      setShareMessage("Secure share link copied.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function revokeShare() {
    try {
      await api(`/share/trips/${id}`, { method: "DELETE" });
      setShareMessage("Public link disabled.");
    } catch (e) {
      setError(e.message);
    }
  }
  const load = () =>
    api(`/trips/${id}`)
      .then((value) => {
        setTrip(value);
        setSelected((i) => Math.min(i, Math.max(0, value.days.length - 1)));
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [id]);
  useEffect(() => {
    if (trip?.name) document.title = `${trip.name} | SmartTrip PH`;
  }, [trip?.name]);
  useEffect(() => {
    const strip = dayTabs.current;
    const active = strip?.querySelector("button.active");
    if (!strip || !active) return;
    const tabBox = active.getBoundingClientRect();
    const stripBox = strip.getBoundingClientRect();
    // Center the selected date without moving the document vertically.
    strip.scrollTo({
      left:
        strip.scrollLeft +
        tabBox.left -
        stripBox.left -
        (strip.clientWidth - tabBox.width) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [selected, trip?.days?.length]);
  function startDayDrag(event) {
    const element = dayTabs.current;
    if (
      event.button !== 0 ||
      event.pointerType === "touch" ||
      !element ||
      element.scrollWidth <= element.clientWidth
    )
      return;
    dayDrag.current = {
      active: true,
      moved: false,
      suppressClick: false,
      x: event.clientX,
      left: element.scrollLeft,
    };
  }
  function moveDayDrag(event) {
    const drag = dayDrag.current;
    if (!drag.active || !dayTabs.current) return;
    const distance = event.clientX - drag.x;
    if (Math.abs(distance) <= 7 && !drag.moved) return;
    drag.moved = true;
    drag.suppressClick = true;
    dayTabs.current.classList.add("is-dragging");
    event.preventDefault();
    dayTabs.current.scrollLeft = drag.left - distance;
  }
  function endDayDrag() {
    const wasMoved = dayDrag.current.moved;
    dayDrag.current.active = false;
    dayTabs.current?.classList.remove("is-dragging");
    if (wasMoved)
      setTimeout(() => {
        dayDrag.current.moved = false;
        dayDrag.current.suppressClick = false;
      }, 100);
  }
  function closeEditor() {
    setForm(blank);
    setEditingId(null);
    setEditing(false);
  }
  function openNew() {
    setForm(blank);
    setEditingId(null);
    setEditing(true);
  }
  function openTransport() {
    setForm({
      ...blank,
      category: "Transportation",
      title: "",
      notes: "Add departure, arrival, carrier, or vehicle details.",
    });
    setEditingId(null);
    setEditing(true);
  }
  function editActivity(a) {
    setForm({
      title: a.title,
      description: a.description || "",
      category: a.category,
      startTime: a.startTime || "09:00",
      durationMin: a.durationMin || 60,
      location: a.location || "",
      latitude: a.latitude ?? "",
      longitude: a.longitude ?? "",
      estimatedCost: Number(a.estimatedCost),
      notes: a.notes || "",
      referenceNumber: a.referenceNumber || "",
      website: a.website || "",
      phone: a.phone || "",
      status: a.status || "PLANNED",
      priority: a.priority || "FLEXIBLE",
    });
    setEditingId(a.id);
    setEditing(true);
  }
  async function saveActivity(e) {
    e.preventDefault();
    const day = trip.days[selected];
    if (!day) return;
    setBusy(true);
    setError("");
    try {
      const existing = day.activities.find((a) => a.id === editingId);
      const payload = {
        ...form,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        durationMin: Number(form.durationMin),
        estimatedCost: Number(form.estimatedCost),
        position: existing?.position ?? day.activities.length,
      };
      await api(
        editingId
          ? `/itinerary/activities/${editingId}`
          : `/itinerary/days/${day.id}/activities`,
        { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      closeEditor();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function addAlternative(alternativeId) {
    setBusy(true);
    setError("");
    try {
      await api(`/itinerary/alternatives/${alternativeId}/add`, {
        method: "POST",
        body: JSON.stringify({ dayId: trip.days[selected].id }),
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function removeActivity(activityId) {
    if (undoDelete) {
      setError(
        "Undo the previous removal or wait a few seconds before deleting another activity.",
      );
      return;
    }
    const sourceDay = trip.days.find((value) =>
      value.activities.some((activity) => activity.id === activityId),
    );
    const removed = sourceDay?.activities.find(
      (activity) => activity.id === activityId,
    );
    if (!removed) return;
    setError("");
    setTrip((current) => ({
      ...current,
      days: current.days.map((value) =>
        value.id === sourceDay.id
          ? {
              ...value,
              activities: value.activities.filter(
                (activity) => activity.id !== activityId,
              ),
            }
          : value,
      ),
    }));
    setUndoDelete({ activity: removed, dayId: sourceDay.id });
    deleteTimer.current = setTimeout(async () => {
      try {
        await api(`/itinerary/activities/${activityId}`, { method: "DELETE" });
        setUndoDelete(null);
      } catch (e) {
        setUndoDelete(null);
        setError(`Could not delete activity: ${e.message}`);
        await load();
      }
    }, 7000);
  }
  function undoActivityDelete() {
    if (!undoDelete) return;
    clearTimeout(deleteTimer.current);
    deleteTimer.current = null;
    setTrip((current) => ({
      ...current,
      days: current.days.map((value) =>
        value.id === undoDelete.dayId
          ? {
              ...value,
              activities: [...value.activities, undoDelete.activity].sort(
                (a, b) => a.position - b.position,
              ),
            }
          : value,
      ),
    }));
    setUndoDelete(null);
  }
  async function duplicateActivity(activityId) {
    setError("");
    try {
      await api(`/itinerary/activities/${activityId}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ targetDayId: day.id }),
      });
      await load();
    } catch (e) {
      setError(`Could not duplicate activity: ${e.message}`);
    }
  }
  async function moveActivity(activityId, targetDayId) {
    if (!targetDayId) return;
    setError("");
    try {
      await api(`/itinerary/activities/${activityId}/move`, {
        method: "POST",
        body: JSON.stringify({ targetDayId }),
      });
      await load();
    } catch (e) {
      setError(`Could not move activity: ${e.message}`);
    }
  }
  async function updateActivityState(activityId, value) {
    setError("");
    try {
      await api(`/itinerary/activities/${activityId}/state`, {
        method: "PATCH",
        body: JSON.stringify(value),
      });
      setTrip((current) => ({
        ...current,
        days: current.days.map((item) => ({
          ...item,
          activities: item.activities.map((activity) =>
            activity.id === activityId ? { ...activity, ...value } : activity,
          ),
        })),
      }));
    } catch (e) {
      setError(`Could not update activity: ${e.message}`);
    }
  }
  async function reorderActivity(activityId, direction) {
    setError("");
    try {
      await api(`/itinerary/activities/${activityId}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ direction }),
      });
      await load();
    } catch (e) {
      setError(`Could not reorder activity: ${e.message}`);
    }
  }
  function openBudgetEditor() {
    setBudgetForm(
      Object.fromEntries(
        ["transport", "accommodation", "food", "activities", "emergency"].map(
          (key) => [key, Number(trip.budget?.[key] || 0)],
        ),
      ),
    );
    setBudgetEditing(true);
  }
  async function saveBudget(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setTrip(
        await api(`/trips/${id}/budget`, {
          method: "PATCH",
          body: JSON.stringify(budgetForm),
        }),
      );
      setBudgetEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function openBaseEditor() {
    setBaseForm({
      baseName: trip.baseName || "",
      baseAddress: trip.baseAddress || "",
      baseCheckIn: trip.baseCheckIn || "",
      baseCheckOut: trip.baseCheckOut || "",
    });
    setBaseEditing(true);
  }
  async function saveBase(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setTrip(
        await api(`/trips/${id}/base`, {
          method: "PATCH",
          body: JSON.stringify(
            Object.fromEntries(
              Object.entries(baseForm).map(([key, value]) => [
                key,
                value.trim() || null,
              ]),
            ),
          ),
        }),
      );
      setBaseEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function regenerate() {
    if (!confirm("Replace the current itinerary with a new AI plan?")) return;
    setBusy(true);
    setError("");
    try {
      setTrip(
        await api(`/itinerary/trips/${id}/generate`, {
          method: "POST",
          timeoutMs: 180000,
        }),
      );
      setSelected(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function improveDay(instruction) {
    if (!day || busy) return;
    setBusy(true);
    setError("");
    try {
      setTrip(
        await api(`/itinerary/trips/${id}/improve`, {
          method: "POST",
          timeoutMs: 90000,
          body: JSON.stringify({ dayNumber: day.dayNumber, instruction }),
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (error && !trip)
    return (
      <div className="empty-state">
        <h2>{error}</h2>
        <Link to="/app/trips">Back to trips</Link>
      </div>
    );
  if (!trip) return <div className="screen-loader">Loading trip…</div>;
  const day = trip.days[selected];
  const dayMarkers = (day?.activities || []).filter(
    (value) => value.latitude != null && value.longitude != null,
  );
  const center = dayMarkers[0]
    ? [dayMarkers[0].latitude, dayMarkers[0].longitude]
    : [
        trip.destination?.latitude || 12.8797,
        trip.destination?.longitude || 121.774,
      ];
  const routePositions = dayMarkers.map((value) => [
    value.latitude,
    value.longitude,
  ]);
  const plannedCost = trip.days
    .flatMap((value) => value.activities)
    .reduce((sum, value) => sum + Number(value.estimatedCost), 0);
  const budgetTotal = Number(trip.totalBudget);
  const budgetPercent = budgetTotal
    ? Math.round((plannedCost / budgetTotal) * 100)
    : 0;
  const budgetState =
    budgetPercent > 100 ? "over" : budgetPercent >= 85 ? "near" : "within";
  const dayDuration = (day?.activities || []).reduce(
    (sum, value) => sum + Number(value.durationMin || 0),
    0,
  );
  const scheduleWarnings = [];
  if ((day?.activities.length || 0) > 7)
    scheduleWarnings.push(
      "This day may feel overloaded with more than 7 activities.",
    );
  (day?.activities || []).forEach((value, index, values) => {
    const next = values[index + 1];
    if (!next) return;
    const start = clockMinutes(value.startTime);
    const nextStart = clockMinutes(next.startTime);
    if (start == null || nextStart == null) return;
    const gap = nextStart - (start + Number(value.durationMin || 0));
    const travel = travelEstimate(value, next, trip.transportMode);
    if (gap < 0)
      scheduleWarnings.push(
        `${value.title} overlaps ${next.title} by ${Math.abs(gap)} minutes.`,
      );
    else if (travel && gap < travel.minutes)
      scheduleWarnings.push(
        `Only ${gap} minutes are available to reach ${next.title}; allow about ${travel.minutes}.`,
      );
    else if (gap > 90)
      scheduleWarnings.push(
        `There is a ${durationLabel(gap)} free gap before ${next.title}.`,
      );
  });
  const allActivities = trip.days.flatMap((value) => value.activities);
  const completenessChecks = [
    {
      done: trip.days.every((value) => value.activities.length > 0),
      message: "Add at least one activity to every day.",
    },
    {
      done:
        allActivities.length > 0 &&
        allActivities.every((value) => value.startTime),
      message: "Add times to activities that are still unscheduled.",
    },
    {
      done:
        allActivities.length > 0 &&
        allActivities.every((value) => value.location),
      message: "Add locations so maps and directions work reliably.",
    },
    {
      done: allActivities.some((value) => value.priority === "MUST_VISIT"),
      message: "Mark at least one activity as Must Visit.",
    },
    {
      done: Boolean(trip.budget) && budgetTotal > 0,
      message: "Review the estimated budget allocation.",
    },
  ];
  const completeness = Math.round(
    (completenessChecks.filter((value) => value.done).length /
      completenessChecks.length) *
      100,
  );
  return (
    <>
      <header>
        <div>
          <small>MY TRIPS / {trip.destination?.name}</small>
          <h1>{trip.name}</h1>
        </div>
        <Link className="btn ghost" to="/app/trips">
          ← All trips
        </Link>
      </header>
      <div className="page itinerary">
        {undoDelete && (
          <div className="undo-toast" role="status">
            <span>Activity removed</span>
            <button onClick={undoActivityDelete}>Undo</button>
          </div>
        )}
        <div className="trip-heading">
          <div>
            <h2>{trip.destination?.name || trip.customLocation}</h2>
            <p>
              {new Date(trip.startDate).toLocaleDateString()} –{" "}
              {new Date(trip.endDate).toLocaleDateString()} · {trip.travelers}{" "}
              traveler(s) · {peso(trip.totalBudget)}
            </p>
          </div>
          <div className="heading-actions">
            <span className="status">
              {trip.planningMode} · {trip.status}
            </span>
            <Link className="btn outline" to={`/app/trips/${id}/edit`}>
              ✎ Edit trip
            </Link>
            <Link className="btn outline" to={`/app/map?trip=${id}`}>
              ⌖ Travel map
            </Link>
            <ItineraryPosterButton trip={trip} />
            <TripExportMenu trip={trip} />
            <button className="btn outline" onClick={shareTrip}>
              ↗ Share
            </button>
            {trip.planningMode === "AI" && (
              <button
                className="btn outline"
                onClick={regenerate}
                disabled={busy}
              >
                ✦ Regenerate
              </button>
            )}
          </div>
        </div>
        <section className="trip-cover-editor destination-cover-fixed">
          <div className="trip-cover-preview has-photo">
            <DestinationPhoto trip={trip} eager />
          </div>
          <div className="trip-cover-controls">
            <div>
              <span className="eyebrow">DESTINATION HIGHLIGHT</span>
              <h3>{trip.destination?.name || trip.customLocation}</h3>
              <p>
                SmartTrip automatically uses a recognizable destination photo,
                so you do not need to upload a cover for every plan.
              </p>
            </div>
          </div>
        </section>
        {error && <div className="form-error">{error}</div>}
        {shareMessage && (
          <div className="success-note" role="status">
            {shareMessage} <button onClick={revokeShare}>Disable link</button>
          </div>
        )}
        <section className="planning-completeness">
          <div>
            <span className="eyebrow">TRIP SETUP</span>
            <b>{completeness}% complete</b>
          </div>
          <div className="completeness-bar">
            <i style={{ width: `${completeness}%` }} />
          </div>
          {completeness < 100 && (
            <ul>
              {completenessChecks
                .filter((value) => !value.done)
                .slice(0, 3)
                .map((value) => (
                  <li key={value.message}>{value.message}</li>
                ))}
            </ul>
          )}
        </section>
        {trip.status === "COMPLETED" && (
          <section className="post-trip-summary">
            <div>
              <span className="eyebrow">TRIP SUMMARY</span>
              <h2>{trip.destination?.name || trip.customLocation}</h2>
              <p>
                {new Date(trip.startDate).toLocaleDateString()} –{" "}
                {new Date(trip.endDate).toLocaleDateString()}
              </p>
            </div>
            <dl>
              <div>
                <dt>Activities</dt>
                <dd>{allActivities.length}</dd>
              </div>
              <div>
                <dt>Visited</dt>
                <dd>
                  {
                    allActivities.filter((value) => value.status === "VISITED")
                      .length
                  }
                </dd>
              </div>
              <div>
                <dt>Skipped</dt>
                <dd>
                  {
                    allActivities.filter((value) => value.status === "SKIPPED")
                      .length
                  }
                </dd>
              </div>
              <div>
                <dt>Planned cost</dt>
                <dd>{peso(plannedCost)}</dd>
              </div>
            </dl>
            <small>Summary uses only information recorded in this trip.</small>
          </section>
        )}
        {trip.planningMode === "AI" && trip.days.length > 0 && (
          <section className="ai-improve-card">
            <div>
              <span className="eyebrow">✦ QUICK AI IMPROVE</span>
              <b>
                Adjust Day {day?.dayNumber || 1} without replacing the other
                days
              </b>
            </div>
            <div>
              <button
                disabled={busy}
                onClick={() =>
                  improveDay(
                    "Make this day cheaper while keeping the main highlights.",
                  )
                }
              >
                Make cheaper
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  improveDay(
                    "Make this day more relaxing with fewer rushed transitions.",
                  )
                }
              >
                More relaxing
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  improveDay(
                    "Add one or two worthwhile activities while keeping a realistic pace and budget.",
                  )
                }
              >
                Add activities
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  improveDay(
                    `Improve this day for ${trip.transportMode === "PRIVATE_VEHICLE" ? "private vehicle travel with fuel, toll and parking details" : "public transport with likely modes, fares and transfers"}.`,
                  )
                }
              >
                Improve transport
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  improveDay(
                    "Make this day family-friendly and suitable for a mixed-age group.",
                  )
                }
              >
                Family-friendly
              </button>
            </div>
            {busy && <small>Gemini or Groq is improving this day…</small>}
          </section>
        )}
        <div
          className="day-tabs"
          ref={dayTabs}
          onPointerDown={startDayDrag}
          onPointerMove={moveDayDrag}
          onPointerUp={endDayDrag}
          onPointerCancel={endDayDrag}
          onWheel={(event) => {
            const element = dayTabs.current;
            if (!element || element.scrollWidth <= element.clientWidth) return;
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
              event.preventDefault();
              element.scrollLeft += event.deltaY;
            }
          }}
          aria-label="Itinerary days. Drag horizontally to see more days."
        >
          {trip.days.map((d, i) => (
            <button
              key={d.id}
              className={selected === i ? "active" : ""}
              onClick={() => {
                if (dayDrag.current.suppressClick) {
                  dayDrag.current.moved = false;
                  dayDrag.current.suppressClick = false;
                  return;
                }
                setSelected(i);
                setActiveActivity(null);
                closeEditor();
              }}
            >
              Day {d.dayNumber}
              <small>
                {new Date(d.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </small>
            </button>
          ))}
        </div>
        <div className="itinerary-controls">
          <label>
            Jump to day
            <select
              value={selected}
              onChange={(event) => {
                setSelected(Number(event.target.value));
                setActiveActivity(null);
                closeEditor();
              }}
            >
              {trip.days.map((value, index) => (
                <option key={value.id} value={index}>
                  Day {value.dayNumber} — {value.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Show activities
            <select
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value)}
            >
              <option value="ALL">All activities</option>
              <option value="PLANNED">Planned</option>
              <option value="VISITED">Visited</option>
              <option value="SKIPPED">Skipped</option>
              <option value="MUST_VISIT">Must Visit</option>
              <option value="FOOD">Food</option>
              <option value="TRANSPORTATION">Transportation</option>
            </select>
          </label>
        </div>
        <div className="itinerary-grid">
          <section className="timeline-card">
            <div className="day-head">
              <div>
                <span className="eyebrow">DAY {day?.dayNumber || 1}</span>
                <h3>{day?.title || "No itinerary day"}</h3>
                {day && (
                  <small className="day-summary">
                    {day.activities.length}{" "}
                    {day.activities.length === 1 ? "activity" : "activities"} ·{" "}
                    {durationLabel(dayDuration)} planned
                  </small>
                )}
              </div>
              {day && (
                <div className="day-head-actions">
                  <button className="btn ghost" onClick={openTransport}>
                    ＋ Transport
                  </button>
                  <button className="btn outline" onClick={openNew}>
                    ＋ Activity
                  </button>
                </div>
              )}
            </div>
            {scheduleWarnings.length > 0 && (
              <div className="schedule-warnings" role="status">
                <b>Schedule check</b>
                <ul>
                  {scheduleWarnings.slice(0, 4).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {editing && (
              <form className="activity-form" onSubmit={saveActivity}>
                <div className="field-grid">
                  <label>
                    Activity
                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Location
                    <input
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Start time
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm({ ...form, startTime: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Duration (minutes)
                    <input
                      type="number"
                      min="15"
                      value={form.durationMin}
                      onChange={(e) =>
                        setForm({ ...form, durationMin: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Priority
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm({ ...form, priority: e.target.value })
                      }
                    >
                      <option value="MUST_VISIT">Must visit</option>
                      <option value="FLEXIBLE">Flexible</option>
                      <option value="OPTIONAL">Optional</option>
                    </select>
                  </label>
                  <label>
                    Estimated cost (PHP)
                    <input
                      type="number"
                      min="0"
                      value={form.estimatedCost}
                      onChange={(e) =>
                        setForm({ ...form, estimatedCost: e.target.value })
                      }
                    />
                  </label>
                </div>
                <p className="field-help location-auto-help">
                  Map coordinates are detected automatically from the location.
                </p>
                <label>
                  Description
                  <textarea
                    rows="2"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>
                <label>
                  Transport notes (optional)
                  <textarea
                    rows="2"
                    value={form.notes}
                    placeholder="Example: Take a jeepney from the previous stop; estimated fare ₱15."
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </label>
                <div className="field-grid">
                  <label>
                    Booking / reference number
                    <input
                      value={form.referenceNumber}
                      onChange={(e) =>
                        setForm({ ...form, referenceNumber: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Website
                    <input
                      type="url"
                      placeholder="https://…"
                      value={form.website}
                      onChange={(e) =>
                        setForm({ ...form, website: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={closeEditor}
                  >
                    Cancel
                  </button>
                  <button className="btn primary" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : editingId
                        ? "Save activity"
                        : "Add activity"}
                  </button>
                </div>
              </form>
            )}
            {day?.activities.length ? (
              <div className="timeline">
                {day.activities
                  .filter((activity) =>
                    activityFilter === "ALL"
                      ? true
                      : activityFilter === "MUST_VISIT"
                        ? activity.priority === "MUST_VISIT"
                        : ["PLANNED", "VISITED", "SKIPPED"].includes(
                              activityFilter,
                            )
                          ? (activity.status || "PLANNED") === activityFilter
                          : activity.category?.toUpperCase() === activityFilter,
                  )
                  .map((a, index, visibleActivities) => {
                    const previous = visibleActivities[index - 1];
                    const originalIndex = day.activities.findIndex(
                      (value) => value.id === a.id,
                    );
                    const travel = travelEstimate(
                      previous,
                      a,
                      trip.transportMode,
                    );
                    return (
                      <article
                        id={`activity-${a.id}`}
                        className={`${activeActivity === a.id ? "active-activity" : ""} activity-${(a.status || "PLANNED").toLowerCase()}`}
                        onClick={() => setActiveActivity(a.id)}
                        key={a.id}
                      >
                        <time>{a.startTime || "Any time"}</time>
                        <i>⌖</i>
                        <div>
                          <div className="activity-actions">
                            <button
                              disabled={originalIndex === 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                reorderActivity(a.id, "UP");
                              }}
                              aria-label={`Move ${a.title} earlier`}
                            >
                              ↑ Earlier
                            </button>
                            <button
                              disabled={
                                originalIndex === day.activities.length - 1
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                reorderActivity(a.id, "DOWN");
                              }}
                              aria-label={`Move ${a.title} later`}
                            >
                              ↓ Later
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                editActivity(a);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                duplicateActivity(a.id);
                              }}
                            >
                              Duplicate
                            </button>
                            {trip.days.length > 1 && (
                              <select
                                aria-label={`Move ${a.title} to another day`}
                                defaultValue=""
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  moveActivity(a.id, event.target.value);
                                  event.target.value = "";
                                }}
                              >
                                <option value="" disabled>
                                  Move to…
                                </option>
                                {trip.days
                                  .filter((value) => value.id !== day.id)
                                  .map((value) => (
                                    <option key={value.id} value={value.id}>
                                      Day {value.dayNumber}
                                    </option>
                                  ))}
                              </select>
                            )}
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                removeActivity(a.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                          <h4>{a.title}</h4>
                          <div className="activity-state-controls">
                            <select
                              aria-label={`Status for ${a.title}`}
                              value={a.status || "PLANNED"}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                updateActivityState(a.id, {
                                  status: event.target.value,
                                })
                              }
                            >
                              <option value="PLANNED">Planned</option>
                              <option value="VISITED">Visited</option>
                              <option value="SKIPPED">Skipped</option>
                            </select>
                            <span
                              className={`priority priority-${(a.priority || "FLEXIBLE").toLowerCase()}`}
                            >
                              {(a.priority || "FLEXIBLE").replaceAll("_", " ")}
                            </span>
                          </div>
                          {travel && (
                            <div className="travel-leg">
                              <b>
                                {trip.transportMode === "PRIVATE_VEHICLE"
                                  ? "🚙 Drive"
                                  : "🚌 Transfer"}
                              </b>
                              <span>
                                about {travel.minutes} min ·{" "}
                                {travel.distance.toFixed(1)} km
                              </span>
                            </div>
                          )}
                          <p>{a.description}</p>
                          <span>
                            {a.durationMin
                              ? `${a.durationMin} min`
                              : a.category}
                          </span>
                          <b>{peso(a.estimatedCost)}</b>
                          <p>⌖ {a.location}</p>
                          {a.notes && (
                            <p className="transport-guidance">
                              <b>Transport:</b> {a.notes}
                            </p>
                          )}
                          {a.referenceNumber && (
                            <p>
                              <b>Reference:</b> {a.referenceNumber}
                            </p>
                          )}
                          <div className="map-links">
                            {MAPS_ENABLED && <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDirections(
                                  previous,
                                  a,
                                  trip.transportMode,
                                  profile?.location,
                                );
                              }}
                            >
                              {previous
                                ? "Directions"
                                : "Directions from starting point"}{" "}
                              ↗
                            </button>}
                            {MAPS_ENABLED && a.latitude != null && a.longitude != null && (
                              <a
                                className="street-link"
                                href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${a.latitude},${a.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Street View ↗
                              </a>
                            )}
                            {a.website && (
                              <a
                                href={a.website}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Website ↗
                              </a>
                            )}
                            {a.phone && (
                              <a href={`tel:${a.phone}`}>Call venue</a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
              </div>
            ) : (
              <div className="empty-mini">
                <p>No activities for this day yet. Add one above.</p>
              </div>
            )}
          </section>
          <aside className="trip-side">
            <section
              className={`alternative-panel ${alternativesOpen ? "open" : ""}`}
            >
              <button
                type="button"
                className="alternative-toggle"
                onClick={() => setAlternativesOpen((value) => !value)}
                aria-expanded={alternativesOpen}
              >
                <span className="menu-lines" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <b>Alternative places</b>
                  <small>{trip.alternatives?.length || 0} optional ideas</small>
                </span>
                <strong>{alternativesOpen ? "−" : "+"}</strong>
              </button>
              <div className="alternative-list">
                <div className="alternative-heading">
                  <div>
                    <span className="eyebrow">EXTRA OPTIONS</span>
                    <h3>Alternative places</h3>
                  </div>
                  <small>Add any idea to this day.</small>
                </div>
                {(trip.alternatives || []).length ? (
                  trip.alternatives.slice(0, 5).map((alternative) => (
                    <article key={alternative.id}>
                      <div>
                        <b>{alternative.title}</b>
                        <span>{alternative.category}</span>
                        <small>
                          {alternative.location || "Location to be confirmed"}
                          {Number(alternative.estimatedCost) > 0
                            ? ` · ${peso(alternative.estimatedCost)}`
                            : ""}
                        </small>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => addAlternative(alternative.id)}
                      >
                        ＋ Add
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="field-help">
                    New AI-generated trips include up to five optional places
                    for each day.
                  </p>
                )}
                <button
                  type="button"
                  className="btn outline alternative-custom"
                  onClick={() => {
                    openNew();
                    setAlternativesOpen(false);
                  }}
                >
                  ＋ Add my own activity
                </button>
              </div>
            </section>
            {MAPS_ENABLED && <><button
              className="btn outline map-fit-button"
              onClick={() => setFitVersion((v) => v + 1)}
            >
              ⌖ Show entire day
            </button>
            <SectionBoundary
              name="Map"
              message="The map is temporarily unavailable."
            >
              <div className="real-map">
                <MapContainer
                  center={center}
                  zoom={dayMarkers.length ? 11 : 6}
                  scrollWheelZoom={false}
                >
                  <MapController
                    positions={
                      routePositions.length ? routePositions : [center]
                    }
                    focus={
                      activeActivity
                        ? routePositions[
                            dayMarkers.findIndex((a) => a.id === activeActivity)
                          ]
                        : null
                    }
                    fitVersion={`${selected}-${fitVersion}`}
                  />
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {routePositions.length > 1 && (
                    <Polyline
                      positions={routePositions}
                      pathOptions={{
                        color: "#0f766e",
                        weight: 4,
                        opacity: 0.75,
                        dashArray: "8 7",
                      }}
                    />
                  )}
                  {dayMarkers.map((a, index) => (
                    <Marker
                      key={a.id}
                      position={[a.latitude, a.longitude]}
                      icon={numberedIcon(
                        index + 1,
                        activeActivity === a.id,
                        a.status,
                      )}
                      eventHandlers={{
                        click: () => {
                          setActiveActivity(a.id);
                          document
                            .getElementById(`activity-${a.id}`)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                        },
                      }}
                    >
                      <Popup>
                        <b>{a.title}</b>
                        <br />
                        {a.location}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </SectionBoundary></>}
            {!MAPS_ENABLED && <section className="trip-static-map"><h3>Travel map</h3><StaticTravelMap /></section>}
            <section className="trip-base-card">
              <div className="budget-title">
                <h3>⌂ Trip Base</h3>
                <button className="text-btn" onClick={openBaseEditor}>
                  {trip.baseName ? "Edit" : "Add accommodation"}
                </button>
              </div>
              {baseEditing ? (
                <form className="budget-editor" onSubmit={saveBase}>
                  <label>
                    Accommodation
                    <input
                      value={baseForm.baseName}
                      onChange={(e) =>
                        setBaseForm({ ...baseForm, baseName: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Address
                    <input
                      value={baseForm.baseAddress}
                      onChange={(e) =>
                        setBaseForm({
                          ...baseForm,
                          baseAddress: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Check-in
                    <input
                      placeholder="Example: 2:00 PM"
                      value={baseForm.baseCheckIn}
                      onChange={(e) =>
                        setBaseForm({
                          ...baseForm,
                          baseCheckIn: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Check-out
                    <input
                      placeholder="Example: 11:00 AM"
                      value={baseForm.baseCheckOut}
                      onChange={(e) =>
                        setBaseForm({
                          ...baseForm,
                          baseCheckOut: e.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="inline-actions">
                    <button type="button" onClick={() => setBaseEditing(false)}>
                      Cancel
                    </button>
                    <button className="btn primary" disabled={busy}>
                      Save base
                    </button>
                  </div>
                </form>
              ) : trip.baseName ? (
                <div className="trip-base-details">
                  <b>{trip.baseName}</b>
                  <p>{trip.baseAddress || "Address not added"}</p>
                  <small>
                    Check-in: {trip.baseCheckIn || "Not set"} · Check-out:{" "}
                    {trip.baseCheckOut || "Not set"}
                  </small>
                  {trip.baseAddress && (
                    <button
                      onClick={() =>
                        openDirections(
                          null,
                          { location: trip.baseAddress },
                          trip.transportMode,
                          profile?.location,
                        )
                      }
                    >
                      Directions to Trip Base ↗
                    </button>
                  )}
                </div>
              ) : (
                <p className="field-help">
                  Add your hotel or accommodation for quick return directions.
                </p>
              )}
            </section>
            {trip.budget && (
              <section>
                <div className="budget-title">
                  <h3>Estimated budget</h3>
                  <button className="text-btn" onClick={openBudgetEditor}>
                    Adjust categories
                  </button>
                </div>
                <div className={`budget-health ${budgetState}`}>
                  <div>
                    <b>{peso(plannedCost)}</b>
                    <span>of {peso(budgetTotal)} scheduled</span>
                  </div>
                  <strong>{budgetPercent}%</strong>
                  <div className="budget-health-bar">
                    <i style={{ width: `${Math.min(100, budgetPercent)}%` }} />
                  </div>
                  <small>
                    {budgetState === "over"
                      ? `Over budget by ${peso(plannedCost - budgetTotal)}. Use “Make cheaper” on a day.`
                      : budgetState === "near"
                        ? "Close to the budget limit—keep an emergency buffer."
                        : `Within budget with ${peso(Math.max(0, budgetTotal - plannedCost))} remaining.`}
                  </small>
                </div>
                <p className="transport-note">
                  {trip.transportMode === "PRIVATE_VEHICLE"
                    ? "Private vehicle: transport includes estimated fuel, tolls, and parking."
                    : "Public transport: transport includes estimated fares and transfers."}
                </p>
                {budgetEditing ? (
                  <form className="budget-editor" onSubmit={saveBudget}>
                    {Object.entries(budgetForm).map(([key, value]) => (
                      <label key={key}>
                        {key[0].toUpperCase() + key.slice(1)}
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={value}
                          onChange={(event) =>
                            setBudgetForm({
                              ...budgetForm,
                              [key]: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                    <p>
                      Allocated:{" "}
                      {peso(
                        Object.values(budgetForm).reduce(
                          (sum, value) => sum + Number(value),
                          0,
                        ),
                      )}{" "}
                      of {peso(budgetTotal)}
                    </p>
                    <div className="inline-actions">
                      <button
                        type="button"
                        onClick={() => setBudgetEditing(false)}
                      >
                        Cancel
                      </button>
                      <button className="btn primary" disabled={busy}>
                        Save allocation
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl>
                    {Object.entries(trip.budget)
                      .filter(([k]) => !["id", "tripId"].includes(k))
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{k[0].toUpperCase() + k.slice(1)}</dt>
                          <dd>{peso(v)}</dd>
                        </div>
                      ))}
                  </dl>
                )}
                <small className="field-help">
                  Planning estimate only; actual costs may vary. Coordinates are
                  © OpenStreetMap contributors.
                </small>
              </section>
            )}
          </aside>
        </div>
        <SectionBoundary
          name="Travel toolkit"
          message="Weather and travel tools are temporarily unavailable."
        >
          <TravelToolkit tripId={id} />
        </SectionBoundary>
      </div>
    </>
  );
}
