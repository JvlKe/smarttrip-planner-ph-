import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { startingPointFor } from "../lib/startingPoint.js";
import { tripDayCount } from "../lib/tripDates.js";
import { buildPackingSuggestions } from "../lib/packingSuggestions.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
const owned = (id, userId) =>
  prisma.trip.findFirst({
    where: { id, userId },
    include: {
      profile: { select: { location: true } },
      destination: true,
      checklist: { orderBy: { position: "asc" } },
    },
  });
router.get("/:id", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    const today = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    // Use UTC midnight for startOfToday so the comparison is timezone-safe
    const startOfToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const daysUntil = Math.max(0, Math.ceil((start - startOfToday) / 86400000));
    const durationDays = Math.max(1, tripDayCount(start, end));
    const phase =
      end < startOfToday
        ? "COMPLETED"
        : start <= startOfToday
          ? "IN_PROGRESS"
          : "UPCOMING";
    const transportReminder =
      trip.transportMode === "PRIVATE_VEHICLE"
        ? "Check fuel, tires, vehicle papers, tolls, and parking plans."
        : "Confirm fares, terminals, transfer times, and backup transport options.";
    res.set("Cache-Control", "no-store, max-age=0").json({
      departure: {
        startingPoint: startingPointFor(trip.profile.location),
        destination: trip.destination?.name || trip.customLocation,
        region: trip.destination?.region || null,
        startDate: trip.startDate,
        endDate: trip.endDate,
        daysUntil,
        durationDays,
        travelers: trip.travelers,
        transportMode: trip.transportMode,
        phase,
        preparation: [
          transportReminder,
          trip.baseName
            ? `Reconfirm your stay at ${trip.baseName}.`
            : "Save your accommodation address and booking confirmation.",
          "Download tickets, IDs, contacts, and the itinerary for offline access.",
        ],
      },
      packing: buildPackingSuggestions(
        {
          durationDays,
          transportMode: trip.transportMode,
          interests: trip.interests,
        },
        trip.checklist.map((item) => item.label),
      ),
      emergency: [
        { label: "National emergency", number: "911", href: "tel:911" },
        {
          label: "Trip base",
          number: trip.baseName || "Add your accommodation before departure",
          detail: trip.baseAddress || null,
        },
      ],
      checklist: trip.checklist,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/checklist", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    const v = z
      .object({
        label: z.string().trim().min(1).max(120),
        category: z.string().trim().max(40).default("General"),
      })
      .parse(req.body);
    res.status(201).json(
      await prisma.checklistItem.create({
        data: { ...v, tripId: trip.id, position: trip.checklist.length },
      }),
    );
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: e.issues[0]?.message });
    next(e);
  }
});
router.patch("/checklist/:itemId", async (req, res, next) => {
  try {
    const item = await prisma.checklistItem.findFirst({
      where: { id: req.params.itemId, trip: { userId: req.user.id } },
    });
    if (!item)
      return res.status(404).json({ error: "Checklist item not found." });
    const v = z
      .object({
        completed: z.boolean().optional(),
        label: z.string().trim().min(1).max(120).optional(),
      })
      .parse(req.body);
    res.json(
      await prisma.checklistItem.update({ where: { id: item.id }, data: v }),
    );
  } catch (e) {
    next(e);
  }
});
router.delete("/checklist/:itemId", async (req, res, next) => {
  try {
    const result = await prisma.checklistItem.deleteMany({
      where: { id: req.params.itemId, trip: { userId: req.user.id } },
    });
    if (!result.count)
      return res.status(404).json({ error: "Checklist item not found." });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
// Activity 2: Reorder checklist items for a trip in a single transaction.
// The client sends an ordered array of item IDs. The endpoint verifies that
// every ID belongs to this trip and that no IDs are missing or duplicated,
// then updates all positions atomically so a failed write cannot leave the
// list in a half-updated state.
router.put("/:id/checklist/reorder", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });

    const { orderedIds } = z
      .object({ orderedIds: z.array(z.string().uuid()).min(1) })
      .parse(req.body);

    // Verify that the submitted IDs exactly match the checklist for this trip
    const tripItemIds = new Set(trip.checklist.map((item) => item.id));
    const submittedSet = new Set(orderedIds);

    if (submittedSet.size !== orderedIds.length)
      return res.status(400).json({ error: "Duplicate IDs are not allowed." });

    if (
      submittedSet.size !== tripItemIds.size ||
      [...submittedSet].some((id) => !tripItemIds.has(id))
    )
      return res
        .status(400)
        .json({ error: "Submitted IDs do not match this trip's checklist." });

    // Update every item's position in one transaction so the list is never
    // left in a partial state if something goes wrong mid-way.
    await prisma.$transaction(
      orderedIds.map((itemId, index) =>
        prisma.checklistItem.update({
          where: { id: itemId },
          data: { position: index },
        }),
      ),
    );

    // Return the full updated checklist in the new order
    const updated = await prisma.checklistItem.findMany({
      where: { tripId: trip.id },
      orderBy: { position: "asc" },
    });
    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: e.issues[0]?.message });
    next(e);
  }
});

// Activity 3: Return context-aware packing suggestions for one trip.
// The helper compares the trip's length, transport mode, and interests to
// a set of pre-defined rules and returns items the user has NOT already added
// to their checklist. Nothing is saved; the user decides what to add.
router.get("/:id/packing-suggestions", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });

    const durationDays = Math.max(
      1,
      tripDayCount(new Date(trip.startDate), new Date(trip.endDate)),
    );

    const existingLabels = trip.checklist.map((item) => item.label);

    const suggestions = buildPackingSuggestions(
      { durationDays, transportMode: trip.transportMode, interests: trip.interests },
      existingLabels,
    );

    res.json({ suggestions });
  } catch (e) {
    next(e);
  }
});

export default router;
