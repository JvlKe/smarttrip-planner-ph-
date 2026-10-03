import test from "node:test";
import assert from "node:assert/strict";
import { computeTripAnalytics } from "../src/lib/tripAnalytics.js";

test("computeTripAnalytics", async (t) => {
  await t.test("returns zeroed totals for an empty array", () => {
    const result = computeTripAnalytics([]);
    assert.deepEqual(result, {
      totalTrips: 0,
      totalPlannedBudget: 0,
      monthly: [],
    });
  });

  await t.test("skips null and undefined entries completely", () => {
    // null and undefined are not counted at all — the guard `if (!trip) continue` exits early
    const result = computeTripAnalytics([null, undefined]);
    assert.deepEqual(result, {
      totalTrips: 0,
      totalPlannedBudget: 0,
      monthly: [],
    });
  });

  await t.test(
    "counts non-null objects in totalTrips but omits them from monthly when startDate is absent or invalid",
    () => {
      // A bare {} passes the null guard, so it increments totalTrips,
      // but it has no startDate so it produces no monthly entry.
      // An object with an invalid date string also increments totalTrips but is not grouped.
      const result = computeTripAnalytics([{}, { startDate: "not-a-date" }]);
      assert.equal(result.totalTrips, 2);
      assert.equal(result.totalPlannedBudget, 0);
      assert.deepEqual(result.monthly, []);
    },
  );

  await t.test("groups by UTC month correctly, even on boundary dates", () => {
    // 2024-05-01T00:00:00.000Z in local time (e.g., GMT-8) might be April 30.
    // By using UTC methods, it should correctly group into 2024-05.
    const trips = [
      { startDate: new Date("2024-05-01T00:00:00.000Z"), totalBudget: 1000 },
      { startDate: new Date("2024-05-31T23:59:59.999Z"), totalBudget: 2000 },
      { startDate: new Date("2024-06-01T00:00:00.000Z"), totalBudget: 3000 },
    ];

    const result = computeTripAnalytics(trips);
    assert.equal(result.totalTrips, 3);
    assert.equal(result.totalPlannedBudget, 6000);
    assert.deepEqual(result.monthly, [
      { month: "2024-05", tripCount: 2, plannedBudget: 3000 },
      { month: "2024-06", tripCount: 1, plannedBudget: 3000 },
    ]);
  });

  await t.test(
    "sums budget using cent precision to prevent floating-point drift",
    () => {
      const trips = [
        { startDate: new Date("2024-05-15T12:00:00Z"), totalBudget: 0.1 },
        { startDate: new Date("2024-05-16T12:00:00Z"), totalBudget: 0.2 },
      ];
      const result = computeTripAnalytics(trips);

      // 0.10 + 0.20 = 0.30000000000000004 in standard JS floats, but our helper uses cents
      assert.equal(result.totalPlannedBudget, 0.3);
      assert.equal(result.monthly[0].plannedBudget, 0.3);
    },
  );

  await t.test("handles Prisma Decimal objects gracefully", () => {
    // A mock Decimal object that toStrings to the value
    const mockDecimal = (val) => ({
      toString: () => String(val),
    });

    const trips = [
      {
        startDate: new Date("2024-01-01T00:00:00Z"),
        totalBudget: mockDecimal(1500.5),
      },
    ];

    const result = computeTripAnalytics(trips);
    assert.equal(result.totalPlannedBudget, 1500.5);
    assert.deepEqual(result.monthly, [
      { month: "2024-01", tripCount: 1, plannedBudget: 1500.5 },
    ]);
  });
});
