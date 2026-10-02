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
  favorite: { findMany: unexpected, upsert: unexpected, delete: unexpected },
  destination: { findUnique: unexpected },
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

  await t.test("Favorites endpoints", async (t) => {
    // Unauthenticated request -> 401
    assert.equal((await request("/api/favorites")).status, 401);

    // Listing favorites -> only the signed-in user's records
    const listMock = t.mock.method(prisma.favorite, "findMany", async ({ where }) => {
      assert.equal(where.userId, "owner");
      return [{ destinationId: 100 }];
    });
    const listRes = await request("/api/favorites", { headers });
    assert.equal(listRes.status, 200);
    assert.deepEqual(await listRes.json(), [{ destinationId: 100 }]);
    listMock.mock.restore();

    // Invalid destination ID -> 400
    const invalidIdRes = await request("/api/favorites", { method: "POST", headers, body: JSON.stringify({ destinationId: "invalid" }) });
    assert.equal(invalidIdRes.status, 400);

    const zeroIdRes = await request("/api/favorites", { method: "POST", headers, body: JSON.stringify({ destinationId: -5 }) });
    assert.equal(zeroIdRes.status, 400);

    const invalidDelRes = await request("/api/favorites/invalid-id", { method: "DELETE", headers });
    assert.equal(invalidDelRes.status, 400);

    // Unknown destination -> 404
    const destLookupMock = t.mock.method(prisma.destination, "findUnique", async ({ where }) => {
      assert.equal(where.id, 999);
      return null;
    });
    const unknownDestRes = await request("/api/favorites", { method: "POST", headers, body: JSON.stringify({ destinationId: 999 }) });
    assert.equal(unknownDestRes.status, 404);
    destLookupMock.mock.restore();

    // Repeated saves -> same compound key; ignore a client-supplied user ID
    const existingDestMock = t.mock.method(prisma.destination, "findUnique", async () => ({ id: 42, name: "Test" }));
    const upsertMock = t.mock.method(prisma.favorite, "upsert", async ({ where, update, create }) => {
      assert.deepEqual(where.userId_destinationId, { userId: "owner", destinationId: 42 });
      assert.deepEqual(update, {});
      assert.deepEqual(create, { userId: "owner", destinationId: 42 });
      return { id: "fav-1", userId: "owner", destinationId: 42 };
    });
    const saveBody = JSON.stringify({ destinationId: 42, userId: "forged-user" });
    const saveRes = await request("/api/favorites", { method: "POST", headers, body: saveBody });
    const repeatedSaveRes = await request("/api/favorites", { method: "POST", headers, body: saveBody });
    assert.equal(saveRes.status, 200);
    assert.equal(repeatedSaveRes.status, 200);
    assert.equal(upsertMock.mock.callCount(), 2);
    upsertMock.mock.restore();
    existingDestMock.mock.restore();

    // Removing your own favorite -> succeeds
    const deleteMock = t.mock.method(prisma.favorite, "delete", async ({ where }) => {
      assert.deepEqual(where.userId_destinationId, { userId: "owner", destinationId: 42 });
      return { count: 1 };
    });
    const delRes = await request("/api/favorites/42", { method: "DELETE", headers });
    assert.equal(delRes.status, 204);
    deleteMock.mock.restore();

    // Attempting to remove someone else's favorite -> does not delete it
    const deleteNotFoundMock = t.mock.method(prisma.favorite, "delete", async ({ where }) => {
      assert.deepEqual(where.userId_destinationId, { userId: "owner", destinationId: 99 });
      const err = new Error("Record to delete does not exist.");
      err.code = "P2025";
      throw err;
    });
    const delNotFoundRes = await request("/api/favorites/99", { method: "DELETE", headers });
    assert.equal(delNotFoundRes.status, 404);
    deleteNotFoundMock.mock.restore();
  });
});
