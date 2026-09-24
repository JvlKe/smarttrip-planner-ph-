export function hasCoordinates(point) {
  return Number.isFinite(point?.latitude) && Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point?.longitude) && Math.abs(point.longitude) <= 180;
}

// Three waypoints are supported on mobile browsers as well as desktop.
export const MAX_ROUTE_PINS = 4;

export function googleMapsDirectionsUrl(points, startingPoint = "") {
  const pins = points.filter(hasCoordinates);
  if (!pins.length || pins.length > MAX_ROUTE_PINS) return "";
  const coordinates = (point) => `${point.latitude},${point.longitude}`;
  const origin = startingPoint.trim();
  if (pins.length === 1 && !origin) {
    const url = new URL("https://www.google.com/maps/search/");
    url.searchParams.set("api", "1");
    url.searchParams.set("query", coordinates(pins[0]));
    return url.toString();
  }
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin || coordinates(pins[0]));
  url.searchParams.set("destination", coordinates(pins.at(-1)));
  const stops = origin ? pins.slice(0, -1) : pins.slice(1, -1);
  if (stops.length) url.searchParams.set("waypoints", stops.map(coordinates).join("|"));
  return url.toString();
}

export function pinsGeoJson(points) {
  return {
    type: "FeatureCollection",
    features: points.filter(hasCoordinates).map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
      properties: { name: point.title, day: point.dayNumber, location: point.location },
    })),
  };
}
