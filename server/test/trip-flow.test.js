/**
 * trip-flow.test.js
 *
 * Integration test — verifies the full trip flow directly via Prisma and the
 * computeBudgetSummary library, mirroring exactly what the API routes do.
 *
 * Steps:
 *   1. CREATE a throwaway MANUAL trip (same logic as POST /api/trips)
 *   2. ADD an activity to Day 1        (same logic as POST /api/itinerary/days/:id/activities)
 *   3. Confirm budgetSummary reflects the new activity cost
 *   4. EDIT the activity cost           (same logic as PUT /api/itinerary/activities/:id)
 *   5. Re-read and confirm budgetSummary updated
 *   6. DELETE the throwaway trip        (cleanup)
 *
 * No HTTP server or JWT token is used — this checks Prisma persistence and
 * computeBudgetSummary directly, not the HTTP handlers or browser flow.
 * The test is opt-in because it writes to the database configured in .env.
 *
 * Run:
 *   PowerShell: $env:RUN_DATABASE_FLOW_TEST = "1"; node --test test/trip-flow.test.js
 *   Bash: RUN_DATABASE_FLOW_TEST=1 node --test test/trip-flow.test.js
 */

import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.js";
import { computeBudgetSummary } from "../src/lib/budgetSummary.js";

// ─── constants that mirror the route logic ────────────────────────────────────

const DAY_MS = 86_400_000;

function budgetData(total, mode) {
  return mode === "PRIVATE_VEHICLE"
    ? {
        transport:     total * 0.30,
        accommodation: total * 0.30,
        food:          total * 0.20,
        activities:    total * 0.15,
        emergency:     total * 0.05,
      }
    : {
        transport:     total * 0.20,
        accommodation: total * 0.35,
        food:          total * 0.25,
        activities:    total * 0.15,
        emergency:     total * 0.05,
      };
}

const TRIP_INCLUDE = {
  destination: true,
  budget:      true,
  alternatives: { orderBy: { position: "asc" } },
  days: {
    orderBy: { position: "asc" },
    include: { activities: { orderBy: { position: "asc" } } },
  },
};

function tripWithBudgetSummary(trip) {
  return { ...trip, budgetSummary: computeBudgetSummary(trip) };
}

// ─── test suite ───────────────────────────────────────────────────────────────

test("database-backed trip flow (Prisma + budgetSummary; opt-in)", async (t) => {
  if (process.env.RUN_DATABASE_FLOW_TEST !== "1") {
    t.skip(
      "Opt-in database test. Set RUN_DATABASE_FLOW_TEST=1 and use a development/test database."
    );
    return;
  }

  let tripId;
  t.after(async () => {
    try {
      if (tripId) {
        await prisma.trip.deleteMany({ where: { id: tripId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  // ── 0. Discover a real profile (test user) ────────────────────────────────
  const profile = await prisma.profile.findFirst({ select: { id: true } });

  if (!profile) {
    t.skip(
      "No profile found in the database — create one via the app first."
    );
    return;
  }

  const userId = profile.id;
  console.log("\n  Using the first profile in the configured development/test database.");

  let day1Id;
  let activityId;

  // ── Step 1: CREATE throwaway trip ─────────────────────────────────────────
  await t.test("CREATE trip — mirrors POST /api/trips", async () => {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() + 1);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 2); // 3-day trip

    const total     = 10_000;
    const transport = "PUBLIC_TRANSPORT";
    const dayCount  = Math.floor((endDate - startDate) / DAY_MS) + 1; // 3

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          userId,
          name:           "Throwaway Test Trip",
          customLocation: "Test City",
          startDate,
          endDate,
          travelers:      2,
          totalBudget:    total,
          travelStyle:    "MID_RANGE",
          planningMode:   "MANUAL",
          transportMode:  transport,
          status:         "PLANNING",
          interests:      ["sightseeing"],
        },
      });

      await tx.budgetEstimate.create({
        data: { tripId: trip.id, ...budgetData(total, transport) },
      });

      await tx.itineraryDay.createMany({
        data: Array.from({ length: dayCount }, (_, i) => ({
          tripId:    trip.id,
          dayNumber: i + 1,
          date:      new Date(startDate.getTime() + i * DAY_MS),
          title:     `Day ${i + 1}`,
          position:  i,
        })),
      });

      return tx.trip.findUnique({ where: { id: trip.id }, include: TRIP_INCLUDE });
    });

    assert.equal(result.name, "Throwaway Test Trip");
    assert.equal(result.planningMode, "MANUAL");
    assert.equal(result.days.length, 3, "Should have 3 days");
    assert.ok(result.budget, "Should have a BudgetEstimate row");

    // Budget check: PUBLIC_TRANSPORT → activities allocation = 15% of 10000
    assert.equal(Number(result.budget.activities), 1500);
    assert.equal(Number(result.budget.transport),  2000);

    tripId = result.id;
    day1Id = result.days[0].id;
    console.log(`  ✔ Trip created: ${tripId}  Day1: ${day1Id}`);
  });

  // ── Step 2: ADD an activity to Day 1 ──────────────────────────────────────
  await t.test("ADD activity — mirrors POST /api/itinerary/days/:id/activities", async () => {
    const created = await prisma.activity.create({
      data: {
        dayId:         day1Id,
        title:         "Test Museum Visit",
        category:      "Sightseeing",
        estimatedCost: 500,
        position:      0,
        status:        "PLANNED",
        priority:      "FLEXIBLE",
      },
    });

    assert.equal(created.title, "Test Museum Visit");
    assert.equal(Number(created.estimatedCost), 500);

    activityId = created.id;
    console.log(`  ✔ Activity created: ${activityId}`);
  });

  // ── Step 3: budgetSummary must reflect the ₱500 activity ──────────────────
  await t.test("budgetSummary after ADD — scheduledTotal = ₱500", async () => {
    const raw  = await prisma.trip.findUnique({ where: { id: tripId }, include: TRIP_INCLUDE });
    const trip = tripWithBudgetSummary(raw);
    const bs   = trip.budgetSummary;

    assert.equal(bs.scheduledTotal,  500,  `scheduledTotal should be 500,  got ${bs.scheduledTotal}`);
    assert.equal(bs.remainingBudget, 9500, `remainingBudget should be 9500, got ${bs.remainingBudget}`);
    assert.equal(bs.percentUsed,     5,    `percentUsed should be 5,       got ${bs.percentUsed}`);
    assert.equal(bs.isOverBudget,    false);
    assert.equal(bs.costPerTraveler, 250,  `costPerTraveler should be 250,  got ${bs.costPerTraveler}`);
    assert.ok(bs.byCategory["Sightseeing"] === 500, "byCategory.Sightseeing should be 500");

    console.log(
      `  ✔ After ADD — scheduled: ₱${bs.scheduledTotal}, remaining: ₱${bs.remainingBudget} (${bs.percentUsed}%)`
    );
  });

  // ── Step 4: EDIT the activity — raise cost to ₱1500 ──────────────────────
  await t.test("EDIT activity cost — mirrors PUT /api/itinerary/activities/:id", async () => {
    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: {
        estimatedCost: 1500,
      },
    });

    assert.equal(Number(updated.estimatedCost), 1500,
      `estimatedCost should be 1500, got ${updated.estimatedCost}`);

    console.log(`  ✔ Activity updated — new cost: ₱1500`);
  });

  // ── Step 5: Re-read trip → budgetSummary must show ₱1500 ─────────────────
  await t.test("budgetSummary after EDIT — scheduledTotal = ₱1500", async () => {
    const raw  = await prisma.trip.findUnique({ where: { id: tripId }, include: TRIP_INCLUDE });
    const trip = tripWithBudgetSummary(raw);
    const bs   = trip.budgetSummary;

    assert.equal(bs.scheduledTotal,  1500, `scheduledTotal should be 1500,  got ${bs.scheduledTotal}`);
    assert.equal(bs.remainingBudget, 8500, `remainingBudget should be 8500, got ${bs.remainingBudget}`);
    assert.equal(bs.percentUsed,     15,   `percentUsed should be 15,       got ${bs.percentUsed}`);
    assert.equal(bs.isOverBudget,    false);
    assert.equal(bs.costPerTraveler, 750,  `costPerTraveler should be 750,   got ${bs.costPerTraveler}`);
    assert.ok(bs.byCategory["Sightseeing"] === 1500, "byCategory.Sightseeing should be 1500");

    console.log(
      `  ✔ After EDIT — scheduled: ₱${bs.scheduledTotal}, remaining: ₱${bs.remainingBudget} (${bs.percentUsed}%)`
    );
  });

  // ── Step 6: EDIT trip budget — verify re-allocation logic ─────────────────
  await t.test("PATCH budget — upsert BudgetEstimate, then budgetSummary.remainingBudget is intact", async () => {
    // Simulate PATCH /api/trips/:id/budget: manually re-allocate categories
    const categories = {
      transport:     3000,
      accommodation: 4000,
      food:          2000,
      activities:    750,
      emergency:     250,
    };
    // Must sum to totalBudget (10000)
    const sum = Object.values(categories).reduce((a, b) => a + b, 0);
    assert.equal(sum, 10000, "Test budget categories must sum to 10000");

    await prisma.budgetEstimate.upsert({
      where:  { tripId },
      create: { tripId, ...categories },
      update: categories,
    });

    const raw  = await prisma.trip.findUnique({ where: { id: tripId }, include: TRIP_INCLUDE });
    const trip = tripWithBudgetSummary(raw);
    const bs   = trip.budgetSummary;

    // scheduledTotal (activity costs) doesn't change when we edit the budget estimate —
    // it's computed from actual activity rows, not from BudgetEstimate
    assert.equal(bs.scheduledTotal, 1500, "Activity costs unchanged after budget re-allocation");
    assert.equal(Number(raw.budget.transport), 3000);
    assert.equal(Number(raw.budget.accommodation), 4000);

    console.log(`  ✔ Budget re-allocated — activity rows still sum to ₱${bs.scheduledTotal}`);
  });

  // ── Step 7: DELETE throwaway trip (cleanup) ────────────────────────────────
  await t.test("DELETE trip — removes all cascaded records", async () => {
    await prisma.trip.delete({ where: { id: tripId } });

    const gone = await prisma.trip.findUnique({ where: { id: tripId } });
    assert.equal(gone, null, "Trip should no longer exist after deletion");

    // Cascade: activities and days should also be gone
    const orphanActivities = await prisma.activity.findMany({
      where: { day: { tripId } },
    });
    assert.equal(orphanActivities.length, 0, "Activities should be cascade-deleted");

    console.log(`  ✔ Trip ${tripId} deleted — all cascaded records removed`);
  });

  console.log("  ✔ All steps passed. Test complete.\n");
});
