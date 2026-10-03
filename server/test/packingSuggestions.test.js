import test from "node:test";
import assert from "node:assert/strict";
import { buildPackingSuggestions } from "../src/lib/packingSuggestions.js";

test("buildPackingSuggestions helper", async (t) => {
  await t.test("includes core items for every trip", () => {
    const suggestions = buildPackingSuggestions({
      durationDays: 1,
      transportMode: "PUBLIC_TRANSPORT",
      interests: [],
    });
    assert.ok(suggestions.some((s) => s.includes("Government-issued ID")));
    assert.ok(suggestions.some((s) => s.includes("water bottle")));
    assert.ok(suggestions.some((s) => s.includes("first-aid")));
  });

  await t.test("adds multi-day extras for trips of 3+ days", () => {
    const short = buildPackingSuggestions({ durationDays: 2, transportMode: "PUBLIC_TRANSPORT", interests: [] });
    const long = buildPackingSuggestions({ durationDays: 3, transportMode: "PUBLIC_TRANSPORT", interests: [] });
    assert.ok(!short.some((s) => s.includes("Laundry bag")));
    assert.ok(long.some((s) => s.includes("Laundry bag")));
  });

  await t.test("adds week-plus extras for trips of 7+ days", () => {
    const medium = buildPackingSuggestions({ durationDays: 5, transportMode: "PUBLIC_TRANSPORT", interests: [] });
    const weekLong = buildPackingSuggestions({ durationDays: 7, transportMode: "PUBLIC_TRANSPORT", interests: [] });
    assert.ok(!medium.some((s) => s.includes("detergent")));
    assert.ok(weekLong.some((s) => s.includes("detergent")));
  });

  await t.test("adds private-vehicle items when transportMode is PRIVATE_VEHICLE", () => {
    const suggestions = buildPackingSuggestions({
      durationDays: 2,
      transportMode: "PRIVATE_VEHICLE",
      interests: [],
    });
    assert.ok(suggestions.some((s) => s.includes("Driver's license")));
    assert.ok(suggestions.some((s) => s.includes("Spare tire")));
    // Public transport items must NOT appear
    assert.ok(!suggestions.some((s) => s.includes("transit card")));
  });

  await t.test("adds public-transport items when transportMode is PUBLIC_TRANSPORT", () => {
    const suggestions = buildPackingSuggestions({
      durationDays: 2,
      transportMode: "PUBLIC_TRANSPORT",
      interests: [],
    });
    assert.ok(suggestions.some((s) => s.includes("transit card")));
    assert.ok(!suggestions.some((s) => s.includes("Driver's license")));
  });

  await t.test("adds Beach interest extras when Beach is in interests", () => {
    const suggestions = buildPackingSuggestions({
      durationDays: 3,
      transportMode: "PUBLIC_TRANSPORT",
      interests: ["Beach"],
    });
    assert.ok(suggestions.some((s) => s.includes("Swimwear")));
    assert.ok(suggestions.some((s) => s.toLowerCase().includes("reef-safe")));
  });

  await t.test("does not duplicate interest items for multiple matching interests", () => {
    const suggestions = buildPackingSuggestions({
      durationDays: 3,
      transportMode: "PUBLIC_TRANSPORT",
      interests: ["Beach", "Beach"],
    });
    const swimwearCount = suggestions.filter((s) => s.includes("Swimwear")).length;
    assert.equal(swimwearCount, 1);
  });

  await t.test("filters out items already in the checklist", () => {
    const existing = ["Reusable water bottle", "Basic medicines and first-aid kit"];
    const suggestions = buildPackingSuggestions(
      { durationDays: 1, transportMode: "PUBLIC_TRANSPORT", interests: [] },
      existing,
    );
    assert.ok(!suggestions.some((s) => s.toLowerCase().includes("water bottle")));
    assert.ok(!suggestions.some((s) => s.toLowerCase().includes("first-aid")));
  });

  await t.test("returns no duplicates in the output array", () => {
    const suggestions = buildPackingSuggestions({
      durationDays: 7,
      transportMode: "PRIVATE_VEHICLE",
      interests: ["Beach", "Nature", "Diving"],
    });
    const seen = new Set();
    for (const s of suggestions) {
      assert.ok(!seen.has(s.toLowerCase()), `Duplicate found: "${s}"`);
      seen.add(s.toLowerCase());
    }
  });
});
