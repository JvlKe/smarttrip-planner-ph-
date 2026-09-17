import test from "node:test";
import assert from "node:assert/strict";
import {
  atlasSimilarity,
  isSafeAtlasCacheQuestion,
  normalizeAtlasQuestion,
} from "../src/lib/atlasCache.js";

test("similar Atlas questions normalize to a reusable form", () => {
  assert.equal(
    normalizeAtlasQuestion("How do I create a trip, please?"),
    "create trip",
  );
  assert.ok(atlasSimilarity("create trip", "create new trip") >= 0.8);
});

test("personal or confidential questions are not globally cached", () => {
  assert.equal(isSafeAtlasCacheQuestion("Help with my booking 123456"), false);
  assert.equal(isSafeAtlasCacheQuestion("How do trip budgets work?"), true);
});
