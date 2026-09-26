import assert from "node:assert/strict";
import test from "node:test";
import { profileSchema } from "../src/lib/profileSchema.js";
import {
  DEFAULT_STARTING_POINT,
  startingPointFor,
} from "../src/lib/startingPoint.js";

test("an empty starting point defaults to Cubao", () => {
  assert.equal(startingPointFor(""), DEFAULT_STARTING_POINT);
  assert.equal(startingPointFor(null), DEFAULT_STARTING_POINT);
});

test("a chosen starting point overrides the Cubao default", () => {
  assert.equal(startingPointFor("  Tokyo, Japan  "), "Tokyo, Japan");
});

test("an account profile can be created before a starting point is chosen", () => {
  assert.deepEqual(profileSchema.parse({ fullName: "Juan Dela Cruz" }), {
    fullName: "Juan Dela Cruz",
  });
});

test("a provided starting point must be usable", () => {
  assert.equal(
    profileSchema.safeParse({ fullName: "Juan Dela Cruz", location: " " })
      .success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({
      fullName: "Juan Dela Cruz",
      location: "Tokyo, Japan",
    }).success,
    true,
  );
});
