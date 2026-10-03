import test from "node:test";
import assert from "node:assert/strict";
import { findScheduleConflict } from "../src/lib/scheduleConflicts.js";

test("findScheduleConflict helper", async (t) => {
  const existing = [
    { id: "a1", title: "Breakfast", startTime: "08:00", durationMin: 60 },
    { id: "a2", title: "Museum", startTime: "10:00", durationMin: 120 },
    { id: "a3", title: "Unscheduled", startTime: null, durationMin: null },
  ];

  await t.test("returns null when there is no conflict", () => {
    const proposed = { startTime: "09:00", durationMin: 60 };
    assert.equal(findScheduleConflict(proposed, existing), null);
  });

  await t.test("returns null for back-to-back activities (touching boundaries)", () => {
    const proposed1 = { startTime: "09:00", durationMin: 60 }; // Ends at 10:00 exactly
    assert.equal(findScheduleConflict(proposed1, existing), null);

    const proposed2 = { startTime: "12:00", durationMin: 60 }; // Starts at 12:00 exactly
    assert.equal(findScheduleConflict(proposed2, existing), null);
  });

  await t.test("detects a conflict that overlaps the start of another", () => {
    const proposed = { startTime: "09:30", durationMin: 60 }; // 09:30 - 10:30 overlaps with 10:00 - 12:00
    const conflict = findScheduleConflict(proposed, existing);
    assert.ok(conflict);
    assert.equal(conflict.id, "a2");
  });

  await t.test("detects a conflict that overlaps the end of another", () => {
    const proposed = { startTime: "11:30", durationMin: 60 }; // 11:30 - 12:30 overlaps with 10:00 - 12:00
    const conflict = findScheduleConflict(proposed, existing);
    assert.ok(conflict);
    assert.equal(conflict.id, "a2");
  });

  await t.test("detects a conflict completely inside another", () => {
    const proposed = { startTime: "10:30", durationMin: 30 };
    const conflict = findScheduleConflict(proposed, existing);
    assert.ok(conflict);
    assert.equal(conflict.id, "a2");
  });

  await t.test("detects a conflict that completely engulfs another", () => {
    const proposed = { startTime: "07:30", durationMin: 120 }; // 07:30 - 09:30 engulfs 08:00 - 09:00
    const conflict = findScheduleConflict(proposed, existing);
    assert.ok(conflict);
    assert.equal(conflict.id, "a1");
  });

  await t.test("ignores conflicts with itself (for edits)", () => {
    const proposed = { id: "a2", startTime: "09:30", durationMin: 180 }; // Changing time of a2
    const conflict = findScheduleConflict(proposed, existing);
    assert.equal(conflict, null);
  });

  await t.test("ignores activities without scheduled times", () => {
    const proposed = { startTime: null, durationMin: 60 };
    assert.equal(findScheduleConflict(proposed, existing), null);

    const proposed2 = { startTime: "08:00", durationMin: null };
    assert.equal(findScheduleConflict(proposed2, existing), null);
  });
});
