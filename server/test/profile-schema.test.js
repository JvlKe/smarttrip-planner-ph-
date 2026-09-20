import assert from "node:assert/strict";
import test from "node:test";
import { profileSchema } from "../src/lib/profileSchema.js";

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
