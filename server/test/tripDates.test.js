import test from "node:test";
import assert from "node:assert/strict";
import { tripDates, tripDayCount } from "../src/lib/tripDates.js";

test("tripDates helper", async (t) => {
  await t.test("returns a single date for a one-day trip", () => {
    const dates = tripDates(new Date("2024-05-10T12:00:00Z"), new Date("2024-05-10T15:00:00Z"));
    assert.equal(dates.length, 1);
    assert.equal(dates[0].toISOString(), "2024-05-10T00:00:00.000Z");
  });

  await t.test("crosses month and year boundaries correctly", () => {
    const dates = tripDates(new Date("2023-12-30T00:00:00Z"), new Date("2024-01-02T00:00:00Z"));
    assert.equal(dates.length, 4);
    assert.equal(dates[0].toISOString(), "2023-12-30T00:00:00.000Z");
    assert.equal(dates[1].toISOString(), "2023-12-31T00:00:00.000Z");
    assert.equal(dates[2].toISOString(), "2024-01-01T00:00:00.000Z");
    assert.equal(dates[3].toISOString(), "2024-01-02T00:00:00.000Z");
  });

  await t.test("handles leap days correctly", () => {
    const dates = tripDates(new Date("2024-02-28T00:00:00Z"), new Date("2024-03-01T00:00:00Z"));
    assert.equal(dates.length, 3);
    assert.equal(dates[1].toISOString(), "2024-02-29T00:00:00.000Z");
  });

  await t.test("throws on invalid dates", () => {
    assert.throws(() => tripDates(new Date("invalid"), new Date()), RangeError);
    assert.throws(() => tripDates(new Date(), new Date("invalid")), RangeError);
    assert.throws(() => tripDates(null, new Date()), RangeError);
  });

  await t.test("returns empty array for reversed dates", () => {
    const dates = tripDates(new Date("2024-05-10T00:00:00Z"), new Date("2024-05-09T00:00:00Z"));
    assert.deepEqual(dates, []);
  });

  await t.test("does not enforce the MAX_TRIP_DAYS limit directly", () => {
    const start = new Date("2024-01-01T00:00:00Z");
    // 30 days (Jan 1 to Jan 30)
    const exactlyMax = new Date("2024-01-30T00:00:00Z");
    const dates = tripDates(start, exactlyMax);
    assert.equal(dates.length, 30);

    // 31 days (Jan 1 to Jan 31)
    const overMax = new Date("2024-01-31T00:00:00Z");
    assert.equal(tripDates(start, overMax).length, 31);
  });
});

test("tripDayCount helper", async (t) => {
  await t.test("returns the correct count for valid dates", () => {
    assert.equal(tripDayCount(new Date("2024-01-01T00:00:00Z"), new Date("2024-01-10T00:00:00Z")), 10);
  });

  await t.test("returns 0 for invalid inputs without throwing", () => {
    assert.equal(tripDayCount(new Date("invalid"), new Date()), 0);
    assert.equal(tripDayCount(new Date("2024-05-10T00:00:00Z"), new Date("2024-05-09T00:00:00Z")), 0);

  });
});
