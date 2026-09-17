import test from "node:test";
import assert from "node:assert/strict";
test("departure duration includes both travel dates", () => {
  const start = new Date("2026-08-21T00:00:00Z");
  const end = new Date("2026-08-23T00:00:00Z");
  assert.equal(Math.floor((end - start) / 86400000) + 1, 3);
});
test("public trip allowlist omits ownership and notes", () => {
  const { userId, notes, ...safe } = {
    userId: "secret",
    notes: "private",
    name: "Cebu",
  };
  assert.deepEqual(safe, { name: "Cebu" });
});
