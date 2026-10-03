import test from "node:test";
import assert from "node:assert/strict";
import { toPublicSharedTrip } from "../src/lib/publicSharedTrip.js";
test("departure duration includes both travel dates", () => {
  const start = new Date("2026-08-21T00:00:00Z");
  const end = new Date("2026-08-23T00:00:00Z");
  assert.equal(Math.floor((end - start) / 86400000) + 1, 3);
});
test("public shared trips omit account, lodging, and private itinerary details", () => {
  const safe = toPublicSharedTrip({
    id: "private-trip-id",
    userId: "private-user-id",
    name: "Cebu weekend",
    customLocation: null,
    startDate: "2026-11-01",
    endDate: "2026-11-02",
    travelers: 2,
    totalBudget: "10000",
    notes: "private trip note",
    desiredPlaces: "private wish list",
    baseName: "Hotel",
    baseAddress: "private lodging address",
    baseCheckIn: "15:00",
    coverPath: "private-cover-path",
    destination: { name: "Cebu", id: 12, latitude: 10, longitude: 123 },
    days: [
      {
        id: "day-id",
        dayNumber: 1,
        title: "Arrival",
        notes: "private day note",
        activities: [
          {
            id: "activity-id",
            title: "Museum",
            description: "Visit the museum",
            startTime: "09:00",
            location: "Cebu City",
            estimatedCost: "500",
            notes: "private transport note",
            phone: "private phone",
            website: "private booking URL",
            bookingReference: "private booking code",
          },
        ],
      },
    ],
  });
  assert.deepEqual(safe, {
    name: "Cebu weekend",
    customLocation: null,
    startDate: "2026-11-01",
    endDate: "2026-11-02",
    travelers: 2,
    totalBudget: "10000",
    destination: { name: "Cebu" },
    days: [
      {
        id: "day-id",
        dayNumber: 1,
        title: "Arrival",
        activities: [
          {
            id: "activity-id",
            title: "Museum",
            description: "Visit the museum",
            startTime: "09:00",
            location: "Cebu City",
            estimatedCost: "500",
          },
        ],
      },
    ],
  });
});
