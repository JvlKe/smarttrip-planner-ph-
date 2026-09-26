import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import useTrips from "../hooks/useTrips";
import { api } from "../lib/api";
import { saveDownload } from "../lib/tripView";
import { useAuth } from "../context/AuthContext";
import { startingPointFor } from "../lib/startingPoint";

const GOOGLE_MAPS_MAX_ROUTE_POINTS = 11;

function googleMapsDirectionsUrl(points, destination, startingPoint) {
  if (!points.length) return "";
  const place = (point) => {
    const name = String(point.location || point.title || "").trim();
    if (!name) return `${point.latitude},${point.longitude}`;
    if (
      destination &&
      !name.toLowerCase().includes(String(destination).toLowerCase())
    )
      return `${name}, ${destination}`;
    return name;
  };
  if (points.length === 1 && !startingPoint) {
    const url = new URL("https://www.google.com/maps/search/");
    url.searchParams.set("api", "1");
    url.searchParams.set("query", place(points[0]));
    return url.toString();
  }
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", startingPoint || place(points[0]));
  url.searchParams.set("destination", place(points.at(-1)));
  const waypoints = startingPoint ? points.slice(0, -1) : points.slice(1, -1);
  if (waypoints.length)
    url.searchParams.set("waypoints", waypoints.map(place).join("|"));
  return url.toString();
}

function FitPins({ pins, selected }) {
  const map = useMap();
  useEffect(() => {
    if (selected) map.setView([selected.latitude, selected.longitude], 14);
    else if (pins.length)
      map.fitBounds(
        pins.map((p) => [p.latitude, p.longitude]),
        { padding: [35, 35], maxZoom: 13 },
      );
  }, [map, pins, selected]);
  return null;
}
export default function MapPage() {
  const { profile } = useAuth();
  const { trips, loading, error, reload } = useTrips();
  const [params, setParams] = useSearchParams();
  const tripId = params.get("trip") || "";
  const [trip, setTrip] = useState(null),
    [mapError, setMapError] = useState(""),
    [fetching, setFetching] = useState(false);
  const [query, setQuery] = useState(""),
    [day, setDay] = useState(""),
    [view, setView] = useState("map"),
    [selectedId, setSelectedId] = useState(null);
  const [refining, setRefining] = useState(false),
    [locationMessage, setLocationMessage] = useState("");
  useEffect(() => {
    let active = true;
    setTrip(null);
    setMapError("");
    setDay("");
    setSelectedId(null);
    setLocationMessage("");
    if (!tripId) {
      setFetching(false);
      return;
    }
    setFetching(true);
    api(`/trips/${tripId}`)
      .then((t) => active && setTrip(t))
      .catch((e) => active && setMapError(e.message))
      .finally(() => active && setFetching(false));
    return () => {
      active = false;
    };
  }, [tripId]);
  const allPins = useMemo(
    () =>
      trip
        ? trip.days.flatMap((d) =>
            d.activities.map((a) => ({
              ...a,
              dayNumber: d.dayNumber,
              tripId: trip.id,
            })),
          )
        : trips.map((t) => ({
            ...t.destination,
            id: t.id,
            title: t.name,
            location: t.destination?.name,
            tripId: t.id,
          })),
    [trip, trips],
  );
  const matchingLocations = useMemo(
    () =>
      allPins.filter(
        (p) =>
          (!day || String(p.dayNumber) === day) &&
          [p.title, p.location]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [allPins, day, query],
  );
  const pins = useMemo(
    () =>
      matchingLocations.filter(
        (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
      ),
    [matchingLocations],
  );
  const selected = pins.find((p) => p.id === selectedId);
  const missing = matchingLocations.filter(
    (p) => !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude),
  ).length;
  const refreshableLocations = trip
    ? matchingLocations.filter((value) => value.location?.trim())
    : [];
  const refreshTooLarge = refreshableLocations.length > 12;
  const startingPoint = startingPointFor(profile?.location);
  const routePinLimit = GOOGLE_MAPS_MAX_ROUTE_POINTS - (startingPoint ? 1 : 0);
  const routeTooLong = pins.length > routePinLimit;
  const destination = trip?.destination?.name || trip?.customLocation || "";
  const directionsUrl = useMemo(
    () =>
      routeTooLong
        ? ""
        : googleMapsDirectionsUrl(pins, destination, startingPoint),
    [destination, pins, routeTooLong, startingPoint],
  );
  function openDirections() {
    if (!directionsUrl) return;
    window.open(directionsUrl, "_blank", "noopener,noreferrer");
  }
  async function refineLocations() {
    if (!trip || !refreshableLocations.length || refreshTooLarge || refining)
      return;
    setRefining(true);
    setLocationMessage("");
    try {
      const result = await api(
        `/itinerary/trips/${trip.id}/refresh-locations`,
        {
          method: "POST",
          body: JSON.stringify({
            activityIds: refreshableLocations.map((value) => value.id),
          }),
          timeoutMs: 55000,
        },
      );
      setTrip(result.trip);
      const unresolved = result.unresolved?.length || 0;
      setLocationMessage(
        result.updated
          ? `${result.updated} pin location${result.updated === 1 ? "" : "s"} refined.${unresolved ? ` ${unresolved} could not be matched exactly.` : ""}`
          : "No exact matches were found. Use a more specific place name in the itinerary.",
      );
    } catch (error) {
      setLocationMessage(error.message);
    } finally {
      setRefining(false);
    }
  }
  function exportPins() {
    saveDownload(
      JSON.stringify(
        {
          type: "FeatureCollection",
          features: pins.map((p) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
            properties: {
              name: p.title,
              day: p.dayNumber,
              location: p.location,
            },
          })),
        },
        null,
        2,
      ),
      "smarttrip-map.geojson",
      "application/geo+json",
    );
  }
  return (
    <>
      <PageHeader
        title="Travel Map"
        subtitle="Keep your destinations and itinerary stops in view."
      />
      <div className="page map-page">
        <div className="discovery-filters raised-card">
          <label className="search-field">
            <Icon name="search" />
            <input
              aria-label="Search map locations"
              placeholder="Search locations…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId(null);
              }}
            />
          </label>
          <select
            aria-label="Choose trip for map"
            value={tripId}
            onChange={(e) =>
              setParams(e.target.value ? { trip: e.target.value } : {})
            }
          >
            <option value="">All trip destinations</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="segmented">
            <button
              className={view === "map" ? "selected" : ""}
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
            >
              Map
            </button>
            <button
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              List
            </button>
          </div>
        </div>
        {error || mapError ? (
          <div className="section-failure" role="alert">
            <p>{error || mapError}</p>
            <button onClick={() => (tripId ? setParams({}) : reload())}>
              Return to all trips
            </button>
          </div>
        ) : loading || fetching ? (
          <div className="screen-loader">Loading your map…</div>
        ) : (
          <div className={`map-workspace view-${view}`}>
            {view === "map" && (
              <section
                className="map-canvas raised-card"
                aria-label="Map of your trip locations"
              >
                <MapContainer
                  center={[12.8, 122]}
                  zoom={5}
                  scrollWheelZoom={false}
                >
                  <FitPins pins={pins} selected={selected} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {pins.map((p, i) => (
                    <CircleMarker
                      key={p.id}
                      center={[p.latitude, p.longitude]}
                      radius={selectedId === p.id ? 12 : 9}
                      pathOptions={{
                        color: "#fff",
                        weight: 3,
                        fillColor: selectedId === p.id ? "#f97316" : "#0f766e",
                        fillOpacity: 1,
                      }}
                      eventHandlers={{ click: () => setSelectedId(p.id) }}
                    >
                      <Popup>
                        <b>
                          {i + 1}. {p.title}
                        </b>
                        <p>{p.location}</p>
                        <Link to={`/app/trips/${p.tripId}`}>
                          View itinerary →
                        </Link>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </section>
            )}
            <section className="map-pin-panel raised-card">
              <div className="section-heading">
                <h2>All Pins</h2>
                <span>{pins.length} locations</span>
              </div>
              {trip && (
                <select
                  aria-label="Filter map by day"
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setSelectedId(null);
                  }}
                >
                  <option value="">All days</option>
                  {trip.days.map((d) => (
                    <option key={d.id} value={d.dayNumber}>
                      Day {d.dayNumber} — {d.title}
                    </option>
                  ))}
                </select>
              )}
              <div className="pin-list">
                {pins.map((p, i) => (
                  <div
                    className={selectedId === p.id ? "selected" : ""}
                    key={p.id}
                  >
                    <button
                      onClick={() => {
                        setSelectedId(p.id);
                        setView("map");
                      }}
                      aria-label={`Show ${p.title} on map`}
                    >
                      <span>{i + 1}</span>
                      <span>
                        <b>{p.title}</b>
                        <small>
                          {p.dayNumber ? `Day ${p.dayNumber} · ` : ""}
                          {p.location}
                        </small>
                      </span>
                    </button>
                    <Link
                      to={`/app/trips/${p.tripId}`}
                      aria-label={`View itinerary for ${p.title}`}
                    >
                      <Icon name="arrow" size={17} />
                    </Link>
                  </div>
                ))}
              </div>
              {!pins.length && <p>No mapped locations match this view.</p>}
              {missing > 0 && (
                <p className="field-help">
                  {missing} stop(s) have no coordinates yet. Add a location in
                  the itinerary to include them here.
                </p>
              )}
              {routeTooLong && (
                <p className="field-help" role="status">
                  Google Maps supports up to 11 locations in one shared route,
                  including your starting point. Choose a day to create
                  directions for this trip.
                </p>
              )}
              {refreshTooLarge && (
                <p className="field-help" role="status">
                  Choose a day before refining locations. Up to 12 places can be
                  checked at once.
                </p>
              )}
              {locationMessage && (
                <p className="field-help" role="status">
                  {locationMessage}
                </p>
              )}
              <div className="map-export-actions">
                {trip && (
                  <button
                    className="btn outline"
                    type="button"
                    disabled={
                      refining ||
                      !refreshableLocations.length ||
                      refreshTooLarge
                    }
                    onClick={refineLocations}
                  >
                    <Icon name="pin" size={16} />
                    {refining ? "Refining locations…" : "Refine pin accuracy"}
                  </button>
                )}
                <button
                  className="btn primary"
                  type="button"
                  disabled={!directionsUrl}
                  onClick={openDirections}
                >
                  <Icon name="map" size={16} />
                  {pins.length === 1 && !startingPoint
                    ? "Open pin in Google Maps"
                    : "Open Google Maps directions"}
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  disabled={!pins.length}
                  onClick={exportPins}
                >
                  <Icon name="download" size={16} /> Download pins (.geojson)
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
