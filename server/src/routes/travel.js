import { Router } from "express";
import { startingPointFor } from "../lib/startingPoint.js";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
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
const packingFor = (trip) => [
  ...new Set([
    "Government ID and booking confirmations",
    "Reusable water bottle",
    "Phone charger and power bank",
    "Basic medicines and first-aid kit",
    "Sunscreen and insect repellent",
    "Light rain jacket or umbrella",
    ...(trip.interests.includes("Beach") || trip.interests.includes("Diving")
      ? ["Swimwear, dry bag, and reef-safe sunscreen"]
      : []),
    ...(trip.interests.includes("Nature") ||
    trip.interests.includes("Adventure")
      ? ["Comfortable trail shoes and quick-dry clothes"]
      : []),
    ...(trip.transportMode === "PRIVATE_VEHICLE"
      ? ["Driver’s license, vehicle papers, spare tire, and emergency tools"]
      : ["Small cash and stored-value transit card where available"]),
  ]),
];

router.get("/:id", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    const today = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const daysUntil = Math.max(0, Math.ceil((start - startOfToday) / 86400000));
    const durationDays = Math.max(1, Math.floor((end - start) / 86400000) + 1);
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
      packing: packingFor(trip),
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
export default router;
