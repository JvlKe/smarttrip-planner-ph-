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
    findFirst: unexpected, delete: unexpected, findMany: unexpected,
    updateMany: async ({ where }) => {
      assert.equal(where.userId, "owner");
      return { count: 0 };
    },
  },
  itineraryDay: { findFirst: unexpected },
  activity: { findMany: unexpected, create: unexpected },
  checklistItem: { update: unexpected, findMany: unexpected },
  favorite: { findMany: unexpected, upsert: unexpected, delete: unexpected },
  destination: { findUnique: unexpected, findMany: unexpected, count: unexpected },
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

  await t.test("Destination search endpoint", async (t) => {
    // Helper: mock both count and findMany so a single search call can succeed
    const mockSearch = (results = []) => ({
      count: t.mock.method(prisma.destination, "count", async () => results.length),
      findMany: t.mock.method(prisma.destination, "findMany", async () => results),
    });

    // No-auth: search is a public route, should work without credentials
    const publicMocks = mockSearch([]);
    const publicRes = await request("/api/destinations/search");
    assert.equal(publicRes.status, 200);
    publicMocks.count.mock.restore();
    publicMocks.findMany.mock.restore();

    // Empty search returns results and pagination shape
    const emptyMocks = mockSearch([{ id: 1, name: "Palawan", region: "Mimaropa" }]);
    const emptyRes = await request("/api/destinations/search");
    assert.equal(emptyRes.status, 200);
    const emptyBody = await emptyRes.json();
    assert.ok(Array.isArray(emptyBody.results), "results should be an array");
    assert.ok(emptyBody.pagination, "pagination object should be present");
    assert.equal(emptyBody.pagination.total, 1);
    assert.equal(emptyBody.pagination.page, 1);
    emptyMocks.count.mock.restore();
    emptyMocks.findMany.mock.restore();

    // Text query q is forwarded to Prisma as a case-insensitive contains on name/region/description
    const textCountMock = t.mock.method(prisma.destination, "count", async ({ where }) => {
      assert.ok(where.OR, "text search should produce an OR clause");
      assert.ok(
        where.OR.some((c) => c.name?.contains === "Boracay"),
        "name contains clause should match the query"
      );
      return 1;
    });
    const textFindMock = t.mock.method(prisma.destination, "findMany", async () =>
      [{ id: 2, name: "Boracay", region: "Western Visayas" }]
    );
    const textRes = await request("/api/destinations/search?q=Boracay");
    assert.equal(textRes.status, 200);
    assert.equal(textCountMock.mock.callCount(), 1);
    textCountMock.mock.restore();
    textFindMock.mock.restore();

    // Structured filters are mapped to the expected Prisma operators
    const filtersCountMock = t.mock.method(
      prisma.destination,
      "count",
      async ({ where }) => {
        assert.deepEqual(where.region, {
          contains: "Visayas",
          mode: "insensitive",
        });
        assert.deepEqual(where.interests, { has: "Beach" });
        assert.deepEqual(where.bestMonths, { has: "March" });
        assert.deepEqual(where.suggestedDays, { gte: 2, lte: 4 });
        return 0;
      },
    );
    const filtersFindMock = t.mock.method(
      prisma.destination,
      "findMany",
      async () => [],
    );
    const filtersRes = await request(
      "/api/destinations/search?region=Visayas&interest=Beach&month=March&daysMin=2&daysMax=4",
    );
    assert.equal(filtersRes.status, 200);
    filtersCountMock.mock.restore();
    filtersFindMock.mock.restore();

    // Valid budget range uses overlap logic
    const budgetCountMock = t.mock.method(prisma.destination, "count", async ({ where }) => {
      assert.equal(where.dailyBudgetMax.gte, 1000, "Should match destinations with max budget >= user's min");
      assert.equal(where.dailyBudgetMin.lte, 5000, "Should match destinations with min budget <= user's max");
      return 1;
    });
    const budgetFindMock = t.mock.method(prisma.destination, "findMany", async () =>
      [{ id: 4, name: "Cebu", region: "Central Visayas" }]
    );
    const budgetRes = await request("/api/destinations/search?budgetMin=1000&budgetMax=5000");
    assert.equal(budgetRes.status, 200);
    assert.equal(budgetCountMock.mock.callCount(), 1);
    budgetCountMock.mock.restore();
    budgetFindMock.mock.restore();

    // Invalid month name -> 400, no database access
    const badMonthGuard = t.mock.method(prisma.destination, "count",
      () => { throw new Error("should not reach DB for invalid month"); }
    );
    const badMonthRes = await request("/api/destinations/search?month=Octember");
    assert.equal(badMonthRes.status, 400);
    assert.equal(badMonthGuard.mock.callCount(), 0);
    badMonthGuard.mock.restore();

    // Negative budget -> 400, no database access
    const badBudgetGuard = t.mock.method(prisma.destination, "count",
      () => { throw new Error("should not reach DB for negative budget"); }
    );
    const badBudgetRes = await request("/api/destinations/search?budgetMin=-1");
    assert.equal(badBudgetRes.status, 400);
    assert.equal(badBudgetGuard.mock.callCount(), 0);
    badBudgetGuard.mock.restore();

    // budgetMin > budgetMax -> 400 (cross-field check), no database access
    const flippedBudgetGuard = t.mock.method(prisma.destination, "count",
      () => { throw new Error("should not reach DB for flipped budget range"); }
    );
    const flippedBudgetRes = await request("/api/destinations/search?budgetMin=5000&budgetMax=1000");
    assert.equal(flippedBudgetRes.status, 400);
    assert.equal(flippedBudgetGuard.mock.callCount(), 0);
    flippedBudgetGuard.mock.restore();

    // pageSize above cap (>50) -> 400, no database access
    const oversizeGuard = t.mock.method(prisma.destination, "count",
      () => { throw new Error("should not reach DB for oversized pageSize"); }
    );
    const oversizeRes = await request("/api/destinations/search?pageSize=999");
    assert.equal(oversizeRes.status, 400);
    assert.equal(oversizeGuard.mock.callCount(), 0);
    oversizeGuard.mock.restore();

    // Excessively deep pagination -> 400 before querying the database
    const deepPageGuard = t.mock.method(prisma.destination, "count", () => {
      throw new Error("should not reach DB for an excessive page offset");
    });
    const deepPageRes = await request(
      "/api/destinations/search?page=10002&pageSize=20",
    );
    assert.equal(deepPageRes.status, 400);
    assert.equal(deepPageGuard.mock.callCount(), 0);
    deepPageGuard.mock.restore();

    // daysMin > daysMax -> 400 (cross-field check), no database access
    const flippedDaysGuard = t.mock.method(prisma.destination, "count",
      () => { throw new Error("should not reach DB for flipped days range"); }
    );
    const flippedDaysRes = await request("/api/destinations/search?daysMin=10&daysMax=3");
    assert.equal(flippedDaysRes.status, 400);
    assert.equal(flippedDaysGuard.mock.callCount(), 0);
    flippedDaysGuard.mock.restore();

    // Pagination: page 2 with pageSize 1 returns correct page/totalPages
    const pageMocks = mockSearch([{ id: 3, name: "Batanes", region: "Cagayan Valley" }]);
    pageMocks.count.mock.restore();
    pageMocks.findMany.mock.restore();
    const pageCountMock = t.mock.method(prisma.destination, "count", async () => 5);
    const pageFindMock = t.mock.method(
      prisma.destination,
      "findMany",
      async ({ skip, take }) => {
        assert.equal(skip, 1, "page 2 with pageSize 1 should skip one row");
        assert.equal(take, 1, "pageSize should be passed to Prisma");
        return [{ id: 3, name: "Batanes", region: "Cagayan Valley" }];
      },
    );
    const pageRes = await request("/api/destinations/search?page=2&pageSize=1");
    assert.equal(pageRes.status, 200);
    const pageBody = await pageRes.json();
    assert.equal(pageBody.pagination.page, 2);
    assert.equal(pageBody.pagination.pageSize, 1);
    assert.equal(pageBody.pagination.total, 5);
    assert.equal(pageBody.pagination.totalPages, 5);
    pageCountMock.mock.restore();
    pageFindMock.mock.restore();
  });

  await t.test("Analytics endpoint", async (t) => {
    // Unauthenticated request -> 401 (endpoint is protected)
    assert.equal((await request("/api/trips/analytics")).status, 401);

    // Authenticated request queries only the signed-in user's trips
    // and excludes ARCHIVED and CANCELLED
    const analyticsMock = t.mock.method(prisma.trip, "findMany", async ({ where, select }) => {
      assert.equal(where.userId, "owner", "should scope to the authenticated user");
      assert.deepEqual(
        where.status,
        { notIn: ["ARCHIVED", "CANCELLED"] },
        "should exclude archived and cancelled trips"
      );
      assert.ok(select.startDate, "should select startDate");
      assert.ok(select.totalBudget, "should select totalBudget");
      return [
        { startDate: new Date("2024-06-10T00:00:00Z"), totalBudget: "5000" },
        { startDate: new Date("2024-06-20T00:00:00Z"), totalBudget: "3000" },
        { startDate: new Date("2024-07-01T00:00:00Z"), totalBudget: "2000" },
      ];
    });

    const res = await request("/api/trips/analytics", { headers });
    assert.equal(res.status, 200);
    const body = await res.json();

    // Response shape
    assert.equal(body.totalTrips, 3);
    assert.equal(body.totalPlannedBudget, 10000);
    assert.ok(Array.isArray(body.monthly), "monthly should be an array");

    // Two months returned, sorted chronologically
    assert.equal(body.monthly.length, 2);
    assert.equal(body.monthly[0].month, "2024-06");
    assert.equal(body.monthly[0].tripCount, 2);
    assert.equal(body.monthly[0].plannedBudget, 8000);
    assert.equal(body.monthly[1].month, "2024-07");
    assert.equal(body.monthly[1].tripCount, 1);
    assert.equal(body.monthly[1].plannedBudget, 2000);

    assert.equal(analyticsMock.mock.callCount(), 1);
    analyticsMock.mock.restore();
  });

  await t.test("schedule conflicts block activity creation before writing", async (t) => {
    const dayLookup = t.mock.method(prisma.itineraryDay, "findFirst", async ({ where }) => {
      assert.deepEqual(where, { id: "day-1", trip: { userId: "owner" } });
      return { id: "day-1", trip: { destination: { name: "Baguio" } } };
    });
    const existingActivities = t.mock.method(prisma.activity, "findMany", async ({ where }) => {
      assert.deepEqual(where, { dayId: "day-1" });
      return [{ id: "existing", title: "Museum", startTime: "10:00", durationMin: 90 }];
    });
    const create = t.mock.method(prisma.activity, "create", async () => {
      throw new Error("A conflicting activity must not be written.");
    });

    const response = await request("/api/itinerary/days/day-1/activities", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Lunch",
        category: "Food",
        startTime: "10:30",
        durationMin: 60,
        position: 1,
        latitude: 16.4,
        longitude: 120.6,
      }),
    });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /Museum/);
    assert.equal(create.mock.callCount(), 0);
    dayLookup.mock.restore();
    existingActivities.mock.restore();
    create.mock.restore();
  });

  await t.test("checklist reorder validates ownership and writes one ordered transaction", async (t) => {
    const firstId = "11111111-1111-4111-8111-111111111111";
    const secondId = "22222222-2222-4222-8222-222222222222";
    const tripLookup = t.mock.method(prisma.trip, "findFirst", async ({ where }) => {
      assert.deepEqual(where, { id: "owned-trip", userId: "owner" });
      return {
        id: "owned-trip",
        checklist: [
          { id: firstId, label: "Tickets", position: 0 },
          { id: secondId, label: "ID", position: 1 },
        ],
      };
    });
    const updates = t.mock.method(prisma.checklistItem, "update", async ({ where, data }) => ({
      id: where.id,
      position: data.position,
    }));
    const transaction = t.mock.method(prisma, "$transaction", async (operations) =>
      Promise.all(operations),
    );
    const list = t.mock.method(prisma.checklistItem, "findMany", async ({ where, orderBy }) => {
      assert.deepEqual(where, { tripId: "owned-trip" });
      assert.deepEqual(orderBy, { position: "asc" });
      return [
        { id: secondId, label: "ID", position: 0 },
        { id: firstId, label: "Tickets", position: 1 },
      ];
    });

    const response = await request("/api/travel/owned-trip/checklist/reorder", {
      method: "PUT",
      headers,
      body: JSON.stringify({ orderedIds: [secondId, firstId] }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).map((item) => item.id), [secondId, firstId]);
    assert.equal(updates.mock.callCount(), 2);
    assert.equal(transaction.mock.callCount(), 1);

    const invalid = await request("/api/travel/owned-trip/checklist/reorder", {
      method: "PUT",
      headers,
      body: JSON.stringify({ orderedIds: [firstId, firstId] }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(transaction.mock.callCount(), 1);
    tripLookup.mock.restore();
    updates.mock.restore();
    transaction.mock.restore();
    list.mock.restore();
  });

  await t.test("packing suggestions are trip-specific and omit existing checklist items", async (t) => {
    const tripLookup = t.mock.method(prisma.trip, "findFirst", async ({ where }) => {
      assert.deepEqual(where, { id: "owned-trip", userId: "owner" });
      return {
        id: "owned-trip",
        startDate: new Date("2026-10-03T00:00:00.000Z"),
        endDate: new Date("2026-10-07T00:00:00.000Z"),
        transportMode: "PRIVATE_VEHICLE",
        interests: ["Beach"],
        checklist: [{ label: "government-issued ID and booking confirmations" }],
      };
    });
    const response = await request("/api/travel/owned-trip/packing-suggestions", { headers });
    assert.equal(response.status, 200);
    const { suggestions } = await response.json();
    assert.ok(suggestions.some((item) => item.includes("Spare tire")));
    assert.ok(suggestions.some((item) => item.includes("Swimwear")));
    assert.ok(!suggestions.some((item) => item.toLowerCase().includes("government-issued id")));
    tripLookup.mock.restore();
  });
});
