const cache = new Map();
let queue = Promise.resolve();
let lastRequest = 0;

const geocodingUrl =
  process.env.GEOCODING_URL || "https://nominatim.openstreetmap.org/search";
const genericWords = new Set([
  "a",
  "an",
  "at",
  "city",
  "in",
  "island",
  "of",
  "philippines",
  "province",
  "the",
]);

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bmt\.?\b/g, "mount")
    .replace(/\bst\.?\b/g, "saint")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token && !genericWords.has(token));
}

function administrativeResult(result) {
  return (
    result.category === "place" &&
    /^(?:city|municipality|town|village|suburb|county|state|province|region)$/.test(
      result.addresstype || result.type || "",
    )
  );
}

export function selectBestGeocodeResult(
  results,
  location,
  destination,
  { requireExact = false } = {},
) {
  const placeName = String(location || "")
    .split(",")[0]
    .trim();
  const placeTokens = tokens(placeName);
  const destinationTokens = tokens(destination);
  const normalizedPlace = normalize(placeName);
  const ranked = (Array.isArray(results) ? results : [])
    .map((result) => {
      const names = [
        result.name,
        result.display_name,
        ...Object.values(result.namedetails || {}),
      ]
        .map(normalize)
        .filter(Boolean);
      const haystack = names.join(" ");
      const matched = placeTokens.filter((token) => haystack.includes(token));
      const coverage = placeTokens.length
        ? matched.length / placeTokens.length
        : 0;
      const destinationCoverage = destinationTokens.length
        ? destinationTokens.filter((token) => haystack.includes(token)).length /
          destinationTokens.length
        : 0;
      const exactName = names.some((name) => name === normalizedPlace);
      const containsName = names.some(
        (name) =>
          normalizedPlace.length >= 4 &&
          (name.includes(normalizedPlace) || normalizedPlace.includes(name)),
      );
      const administrative = administrativeResult(result);
      const precise =
        Boolean(placeTokens.length) &&
        !administrative &&
        (exactName || containsName || coverage >= 0.6);
      const score =
        coverage * 100 +
        destinationCoverage * 20 +
        (exactName ? 80 : containsName ? 35 : 0) +
        Number(result.importance || 0) -
        (administrative && placeTokens.length > 1 ? 70 : 0);
      return { result, score, precise };
    })
    .filter(({ precise }) => !requireExact || precise)
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.result || null;
}

async function lookup(query, location, destination, options) {
  const delay = Math.max(0, 1100 - (Date.now() - lastRequest));
  if (delay) await wait(delay);
  lastRequest = Date.now();
  const url = new URL(geocodingUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "ph");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        process.env.GEOCODING_USER_AGENT ||
        "SmartTrip-PH/1.0 (https://github.com/JvlKe/smarttrip-planner-ph)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) return null;
  const result = selectBestGeocodeResult(
    await response.json(),
    location,
    destination,
    options,
  );
  if (!result) return null;
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  )
    return null;
  return { latitude, longitude };
}

export async function geocodeLocation(location, destination, options = {}) {
  if (!location?.trim()) return null;
  const query = `${location.trim()}, ${destination || "Philippines"}`;
  const key = `${options.requireExact ? "exact" : "best"}:${query.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);
  const task = queue
    .then(() => lookup(query, location, destination, options))
    .catch(() => null);
  queue = task.then(() => undefined);
  const result = await task;
  cache.set(key, result);
  return result;
}

export async function geocodePhilippinePlace(location) {
  if (!location?.trim()) return null;
  const query = location.trim();
  const key = `ph-only:${query.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);
  const task = queue
    .then(() => lookup(query, location, "Philippines", {}))
    .catch(() => null);
  queue = task.then(() => undefined);
  const result = await task;
  cache.set(key, result);
  return result;
}
