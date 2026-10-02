import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

// Set isolated configuration before importing the app. No provider requests or
// database writes are made: tests replace only the boundaries they exercise.
process.env.VERCEL = "1";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-only-placeholder";
const unexpected = () => { throw new Error("Unexpected database access in HTTP test"); };
globalThis.__smarttripPrisma = {
  profile: { findUnique: unexpected },
  trip: {
    findFirst: unexpected, delete: unexpected,
    updateMany: async ({ where }) => {
      assert.equal(where.userId, "owner");
      return { count: 0 };
    },
  },
  $transaction: async (operations) => Promise.all(operations),
};
const { default: app } = await import("../src/index.js");
const { prisma } = await import("../src/lib/prisma.js");
const { supabase } = await import("../src/lib/supabase.js");

test("Express HTTP contracts", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options = {}) => fetch(base + path, options);
  const headers = { authorization: "Bearer http-test-user", "content-type": "application/json" };
  t.mock.method(supabase.auth, "getUser", async () => ({ data: { user: { id: "owner" } }, error: null }));

  await t.test("health and unknown routes return JSON", async () => {
    assert.equal((await request("/api/health")).status, 200);
    const missing = await request("/api/no-such-route");
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: "Route not found." });
  });
  await t.test("protected routes reject missing credentials", async () => {
    for (const path of ["/api/trips", "/api/profile", "/api/travel/example"]) {
      assert.equal((await request(path)).status, 401);
    }
  });
  await t.test("malformed JSON returns 400 with a request identifier", async () => {
    const response = await request("/api/trips", { method: "POST", headers, body: "{" });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).requestId);
  });
  await t.test("oversized JSON returns 413", async () => {
    const response = await request("/api/trips", { method: "POST", headers, body: JSON.stringify({ text: "x".repeat(900000) }) });
    assert.equal(response.status, 413);
  });
  await t.test("invalid trip input returns 400 before database access", async () => {
    const guard = t.mock.method(prisma.profile, "findUnique", () => { throw new Error("unexpected database call"); });
    const response = await request("/api/trips", { method: "POST", headers, body: "{}" });
    assert.equal(response.status, 400);
    assert.equal(guard.mock.callCount(), 0);
    guard.mock.restore();
  });
  await t.test("trip read and delete constrain lookup to the authenticated owner", async () => {
    const lookup = t.mock.method(prisma.trip, "findFirst", async ({ where }) => {
      assert.deepEqual(where, { id: "foreign-trip", userId: "owner" });
      return null;
    });
    const deletion = t.mock.method(prisma.trip, "delete", () => { throw new Error("must not delete another user's trip"); });
    for (const method of ["GET", "DELETE"]) {
      assert.equal((await request("/api/trips/foreign-trip", { method, headers })).status, 404);
    }
    assert.equal(lookup.mock.callCount(), 2);
    assert.equal(deletion.mock.callCount(), 0);
    lookup.mock.restore();
    deletion.mock.restore();
  });
  await t.test("trip response calculates budget from stored activities", async () => {
    const lookup = t.mock.method(prisma.trip, "findFirst", async () => ({
      id: "owned-trip", totalBudget: "10000", travelers: 2,
      days: [{ activities: [{ estimatedCost: "1500", category: "Sightseeing" }] }],
    }));
    const response = await request("/api/trips/owned-trip", { headers });
    assert.equal(response.status, 200);
    const { budgetSummary } = await response.json();
    assert.equal(budgetSummary.scheduledTotal, 1500);
    assert.equal(budgetSummary.remainingBudget, 8500);
    assert.equal(budgetSummary.costPerTraveler, 750);
    lookup.mock.restore();
  });
});
