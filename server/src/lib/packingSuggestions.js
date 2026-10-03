/**
 * packingSuggestions.js
 *
 * A rule-based helper that builds a context-aware packing suggestion list
 * for a trip. Suggestions vary by trip length, transport mode, and
 * any interests already recorded on the trip.
 *
 * The helper does NOT save anything to the database. It returns a plain
 * array of suggestion strings so the user can decide which ones to add.
 */

// Items that should always appear regardless of trip type
const ALWAYS = [
  "Government-issued ID and booking confirmations",
  "Reusable water bottle",
  "Phone charger and power bank",
  "Basic medicines and first-aid kit",
  "Sunscreen and insect repellent",
  "Light rain jacket or umbrella",
];

// Extra items added when the trip lasts longer than a weekend (3+ days)
const MULTI_DAY_EXTRAS = [
  "Extra change of clothes for each additional day",
  "Laundry bag or compression sacks",
  "Padlock for hostel lockers or luggage",
];

// Extra items added for long trips (7+ days)
const WEEK_PLUS_EXTRAS = [
  "Travel-size laundry detergent or detergent strips",
  "Packable clothesline for air-drying laundry",
  "Portable luggage scale to avoid airline overweight fees",
];

// Items added when transport mode is PRIVATE_VEHICLE
const PRIVATE_VEHICLE_ITEMS = [
  "Driver's license and vehicle registration papers",
  "Spare tire, jack, and basic emergency tools",
  "Fuel budget and highway toll cash",
  "Vehicle emergency kit (jumper cables, reflective triangle)",
];

// Items added for PUBLIC_TRANSPORT
const PUBLIC_TRANSPORT_ITEMS = [
  "Check accepted transit cards or payment options for local public transport",
  "Small cash for terminal fees and jeepney/tricycle fares",
  "Printed or offline copy of transit routes",
];

// Interest-specific additions keyed by interest tag
const INTEREST_ITEMS = {
  Beach: [
    "Swimwear and quick-dry towel",
    "Dry bag for gadgets and documents",
    "Reef-safe sunscreen (required in some Philippine marine parks)",
    "Waterproof sandals or water shoes",
  ],
  Diving: [
    "Dive certification card (PADI/SSI/NAUI)",
    "Dive logbook",
    "Underwater camera or GoPro with housing",
  ],
  Nature: [
    "Comfortable trail shoes or hiking boots",
    "Quick-dry pants and moisture-wicking shirts",
    "Trekking poles (for mountain trails)",
    "Headlamp with spare batteries",
  ],
  Adventure: [
    "Athletic wear and sport sandals",
    "Energy snacks (nuts, granola bars)",
    "Personal water filter or purification tablets",
  ],
  Culture: [
    "Modest cover-up for heritage churches and mosques",
    "Small notebook or travel journal",
    "Offline translation app downloaded",
  ],
  Food: [
    "Reusable utensil set and straw to reduce plastic waste",
    "Antacid tablets and probiotic supplements",
  ],
};

/**
 * Generates a deduplicated packing suggestion list for a trip.
 *
 * @param {Object} trip  – Trip record from the database
 *   @param {number}   trip.durationDays  – Number of days (inclusive, already calculated)
 *   @param {string}   trip.transportMode – "PRIVATE_VEHICLE" or "PUBLIC_TRANSPORT"
 *   @param {string[]} trip.interests     – Array of interest tag strings
 * @param {string[]}  existingLabels     – Labels already in the trip's checklist (to skip duplicates)
 * @returns {string[]} Ordered array of suggestion strings not already in the checklist
 */
export function buildPackingSuggestions(trip, existingLabels = []) {
  const { durationDays = 1, transportMode, interests = [] } = trip;

  const suggestions = [...ALWAYS];

  if (durationDays >= 3) suggestions.push(...MULTI_DAY_EXTRAS);
  if (durationDays >= 7) suggestions.push(...WEEK_PLUS_EXTRAS);

  if (transportMode === "PRIVATE_VEHICLE") {
    suggestions.push(...PRIVATE_VEHICLE_ITEMS);
  } else {
    suggestions.push(...PUBLIC_TRANSPORT_ITEMS);
  }

  for (const interest of interests) {
    const extras = INTEREST_ITEMS[interest];
    if (extras) suggestions.push(...extras);
  }

  // Normalise to lowercase for duplicate detection (existing checklist items)
  const existingNorm = new Set(existingLabels.map((l) => l.trim().toLowerCase()));

  // Remove duplicates within suggestions and filter out anything already in the checklist
  const seen = new Set();
  return suggestions.filter((item) => {
    const key = item.trim().toLowerCase();
    if (seen.has(key) || existingNorm.has(key)) return false;
    seen.add(key);
    return true;
  });
}
