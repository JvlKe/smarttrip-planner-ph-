import test from "node:test";
import assert from "node:assert/strict";
import { computeBudgetSummary } from "../src/lib/budgetSummary.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal trip fixture so each test only overrides what it needs. */
function makeTrip(overrides = {}) {
  return {
    totalBudget: "5000.00",
    travelers: 2,
    days: [],
    ...overrides,
  };
}

/** Build a single Activity fixture. */
function makeActivity(category, estimatedCost, title) {
  return { title: title ?? category, category, estimatedCost };
}

/** Build one ItineraryDay containing the supplied activities. */
function makeDay(activities) {
  return { activities };
}

// ---------------------------------------------------------------------------
// Empty itinerary
// ---------------------------------------------------------------------------

test("an empty itinerary returns zero totals and no warnings", () => {
  const summary = computeBudgetSummary(makeTrip());

  assert.equal(summary.scheduledTotal, 0);
  assert.equal(summary.remainingBudget, 5000);
  assert.equal(summary.isOverBudget, false);
  assert.equal(summary.percentUsed, 0);
  assert.deepEqual(summary.byCategory, {});
  assert.equal(summary.costPerTraveler, 0);
  assert.equal(summary.warnings.length, 0);
});

// ---------------------------------------------------------------------------
// Single day with several activities
// ---------------------------------------------------------------------------

test("sums activities across several days and categories", () => {
  const trip = makeTrip({
    totalBudget: "10000.00",
    travelers: 1,
    days: [
      makeDay([
        makeActivity("Food", "200.00"),
        makeActivity("Transport", "150.00"),
      ]),
      makeDay([
        makeActivity("Sightseeing", "500.00"),
        makeActivity("Food", "300.00"),
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.scheduledTotal, 1150);
  assert.equal(summary.remainingBudget, 8850);
  assert.equal(summary.isOverBudget, false);
  assert.equal(summary.percentUsed, 11.5);
  assert.deepEqual(summary.byCategory, {
    Food: 500,
    Transport: 150,
    Sightseeing: 500,
  });
  assert.equal(summary.costPerTraveler, 1150);
  assert.equal(summary.warnings.length, 0);
});

// ---------------------------------------------------------------------------
// Decimal precision — the 0.10 + 0.20 classic
// ---------------------------------------------------------------------------

test("decimal costs such as 0.10 + 0.20 resolve to exactly 0.30", () => {
  // Native JS floating-point: 0.1 + 0.2 === 0.30000000000000004
  const trip = makeTrip({
    totalBudget: "1.00",
    travelers: 1,
    days: [
      makeDay([
        makeActivity("Food", "0.10"),
        makeActivity("Food", "0.20"),
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.scheduledTotal, 0.3);
  assert.equal(summary.byCategory.Food, 0.3);
});

test("Prisma Decimal objects (toString-able) are coerced correctly", () => {
  // Simulate how Prisma returns Decimal: an object with a toString() that
  // yields the numeric string representation.
  const prismaDecimal = (str) => ({ toString: () => str, toFixed: (d) => Number(str).toFixed(d) });

  const trip = makeTrip({
    totalBudget: prismaDecimal("3000.00"),
    travelers: 3,
    days: [
      makeDay([
        makeActivity("Accommodation", prismaDecimal("900.00")),
        makeActivity("Food", prismaDecimal("300.50")),
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.scheduledTotal, 1200.5);
  assert.equal(summary.remainingBudget, 1799.5);
  assert.equal(summary.byCategory.Accommodation, 900);
  assert.equal(summary.byCategory.Food, 300.5);
  // 3 travelers: 1200.50 / 3 = 400.17 (rounded to nearest cent)
  assert.equal(summary.costPerTraveler, 400.17);
});

// ---------------------------------------------------------------------------
// Missing and invalid costs
// ---------------------------------------------------------------------------

test("activities with null estimatedCost are skipped and warned about", () => {
  const trip = makeTrip({
    days: [
      makeDay([
        { title: "Free walking tour", category: "Sightseeing", estimatedCost: null },
        makeActivity("Food", "200.00"),
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.scheduledTotal, 200);
  assert.equal(summary.warnings.length, 1);
  assert.ok(summary.warnings[0].includes("Free walking tour"));
  assert.ok(summary.warnings[0].includes("no estimatedCost"));
});

test("activities with undefined estimatedCost are skipped and warned about", () => {
  const trip = makeTrip({
    days: [
      makeDay([
        { title: "Mystery activity", category: "Other" /* no estimatedCost key */ },
        makeActivity("Transport", "100.00"),
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.scheduledTotal, 100);
  assert.equal(summary.warnings.length, 1);
  assert.ok(summary.warnings[0].includes("Mystery activity"));
});

test("activities with non-numeric estimatedCost are skipped and warned", () => {
  const trip = makeTrip({
    days: [
      makeDay([
        { title: "Broken entry", category: "Food", estimatedCost: "TBD" },
        makeActivity("Food", "150.00"),
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.scheduledTotal, 150);
  assert.equal(summary.warnings.length, 1);
  assert.ok(summary.warnings[0].includes("invalid estimatedCost"));
  assert.ok(summary.warnings[0].includes("TBD"));
});

// ---------------------------------------------------------------------------
// Over-budget detection
// ---------------------------------------------------------------------------

test("isOverBudget is true when scheduled total exceeds the trip budget", () => {
  const trip = makeTrip({
    totalBudget: "1000.00",
    travelers: 2,
    days: [
      makeDay([
        makeActivity("Accommodation", "600.00"),
        makeActivity("Food", "500.00"),
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.scheduledTotal, 1100);
  assert.equal(summary.isOverBudget, true);
  assert.equal(summary.remainingBudget, -100);
  assert.equal(summary.percentUsed, 110);
});

test("isOverBudget is false when costs exactly equal the budget", () => {
  const trip = makeTrip({
    totalBudget: "500.00",
    travelers: 1,
    days: [makeDay([makeActivity("Food", "500.00")])],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.isOverBudget, false);
  assert.equal(summary.remainingBudget, 0);
  assert.equal(summary.percentUsed, 100);
});

// ---------------------------------------------------------------------------
// Category totals
// ---------------------------------------------------------------------------

test("byCategory accumulates costs across multiple days for the same category", () => {
  const trip = makeTrip({
    totalBudget: "2000.00",
    travelers: 1,
    days: [
      makeDay([makeActivity("Food", "100.00"), makeActivity("Transport", "50.00")]),
      makeDay([makeActivity("Food", "120.00"), makeActivity("Food", "80.00")]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.byCategory.Food, 300);
  assert.equal(summary.byCategory.Transport, 50);
  assert.equal(Object.keys(summary.byCategory).length, 2);
});

// ---------------------------------------------------------------------------
// Cost per traveler
// ---------------------------------------------------------------------------

test("costPerTraveler divides the total evenly across all travelers", () => {
  const trip = makeTrip({
    totalBudget: "9000.00",
    travelers: 4,
    days: [
      makeDay([
        makeActivity("Accommodation", "3600.00"),
        makeActivity("Food", "800.00"),
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.costPerTraveler, 1100);
});

test("costPerTraveler rounds to the nearest cent when there is a remainder", () => {
  const trip = makeTrip({
    totalBudget: "1000.00",
    travelers: 3,
    days: [makeDay([makeActivity("Food", "100.00")])],
  });

  const summary = computeBudgetSummary(trip);

  // 100.00 / 3 = 33.333... → rounds to 33.33
  assert.equal(summary.costPerTraveler, 33.33);
});

test("missing travelers field defaults to 1 traveler", () => {
  const trip = { totalBudget: "1000.00", days: [] };
  // travelers property absent — module must not throw
  const summary = computeBudgetSummary(trip);
  assert.equal(summary.costPerTraveler, 0);
});

// ---------------------------------------------------------------------------
// Input immutability
// ---------------------------------------------------------------------------

test("the original trip object is not mutated by computeBudgetSummary", () => {
  const trip = makeTrip({
    days: [makeDay([makeActivity("Food", "200.00")])],
  });

  const before = JSON.stringify(trip);
  computeBudgetSummary(trip);

  assert.equal(JSON.stringify(trip), before);
});

// ---------------------------------------------------------------------------
// Negative activity costs (new)
// ---------------------------------------------------------------------------

test("a negative estimatedCost is skipped and a warning is emitted", () => {
  const trip = makeTrip({
    totalBudget: "1000.00",
    travelers: 1,
    days: [
      makeDay([
        makeActivity("Food", "200.00", "Lunch"),
        { title: "Refund", category: "Food", estimatedCost: "-50.00" },
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  // The negative activity must not reduce the total
  assert.equal(summary.scheduledTotal, 200);
  assert.equal(summary.byCategory.Food, 200);
  assert.equal(summary.warnings.length, 1);
  assert.ok(summary.warnings[0].includes("negative estimatedCost"));
  assert.ok(summary.warnings[0].includes("Refund"));
});

test("a mix of valid and negative costs counts only the valid ones", () => {
  const trip = makeTrip({
    totalBudget: "500.00",
    travelers: 1,
    days: [
      makeDay([
        makeActivity("Transport", "100.00", "Bus"),
        { title: "Discount", category: "Transport", estimatedCost: -30 },
        makeActivity("Food", "50.00", "Dinner"),
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.scheduledTotal, 150);
  assert.equal(summary.byCategory.Transport, 100);
  assert.equal(summary.byCategory.Food, 50);
  assert.equal(summary.warnings.length, 1);
});

// ---------------------------------------------------------------------------
// Invalid traveler counts (new)
// ---------------------------------------------------------------------------

test("a decimal traveler count (2.5) falls back to 1 and emits a warning", () => {
  const trip = makeTrip({ travelers: 2.5, days: [] });
  const summary = computeBudgetSummary(trip);

  // travelers must be a positive whole number; a decimal such as 2.5 is
  // invalid and must be rejected with a warning, not silently floored.
  assert.equal(summary.warnings.length, 1);
  assert.ok(summary.warnings[0].includes("travelers"));
  assert.ok(summary.warnings[0].includes("2.5"));
});

test("a traveler count of zero falls back to 1 and emits a warning", () => {
  const trip = makeTrip({
    travelers: 0,
    days: [makeDay([makeActivity("Food", "300.00")])],
  });

  const summary = computeBudgetSummary(trip);

  // Divided by 1 (the fallback), not 0
  assert.equal(summary.costPerTraveler, 300);
  assert.equal(summary.warnings.length, 1);
  assert.ok(summary.warnings[0].includes("travelers"));
  assert.ok(summary.warnings[0].includes("0"));
});

test("a negative traveler count falls back to 1 and emits a warning", () => {
  const trip = makeTrip({
    travelers: -3,
    days: [makeDay([makeActivity("Food", "300.00")])],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.costPerTraveler, 300);
  assert.equal(summary.warnings.length, 1);
  assert.ok(summary.warnings[0].includes("travelers"));
});

// ---------------------------------------------------------------------------
// Category edge cases (new)
// ---------------------------------------------------------------------------

test("a blank category string falls back to Uncategorised", () => {
  const trip = makeTrip({
    days: [
      makeDay([
        { title: "Unknown activity", category: "   ", estimatedCost: "100.00" },
      ]),
    ],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.byCategory["Uncategorised"], 100);
  assert.equal(summary.byCategory[""], undefined);
});

test("an empty string category falls back to Uncategorised", () => {
  const trip = makeTrip({
    days: [makeDay([{ title: "No category", category: "", estimatedCost: "50.00" }])],
  });

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.byCategory["Uncategorised"], 50);
});

test("a category named __proto__ does not corrupt the category totals", () => {
  const trip = makeTrip({
    totalBudget: "1000.00",
    travelers: 1,
    days: [
      makeDay([
        { title: "Proto exploit", category: "__proto__", estimatedCost: "200.00" },
        makeActivity("Food", "100.00", "Lunch"),
      ]),
    ],
  });

  // Must not throw and must not poison Object.prototype
  assert.doesNotThrow(() => computeBudgetSummary(trip));

  const summary = computeBudgetSummary(trip);

  assert.equal(summary.scheduledTotal, 300);
  // The __proto__ key must appear as an own property of byCategory
  assert.ok(
    Object.prototype.hasOwnProperty.call(summary.byCategory, "__proto__"),
  );
  assert.equal(summary.byCategory["__proto__"], 200);
  assert.equal(summary.byCategory.Food, 100);

  // Object.prototype must be unharmed
  assert.equal({}.toString, Object.prototype.toString);
});
