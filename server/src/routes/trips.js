import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
const DAY_MS = 86400000;
const statusRefreshes = new Map();
const STATUS_REFRESH_MS = 60000;
const tripSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    destinationId: z.coerce.number().int().positive().nullable().optional(),
    customLocation: z.string().trim().max(120).nullable().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    travelers: z.coerce.number().int().min(1).max(30),
    totalBudget: z.coerce.number().min(1000).max(10000000),
    travelStyle: z.enum(["BUDGET", "MID_RANGE", "PREMIUM"]),
    planningMode: z.enum(["AI", "MANUAL"]),
    transportMode: z
      .enum(["PUBLIC_TRANSPORT", "PRIVATE_VEHICLE"])
      .default("PUBLIC_TRANSPORT"),
    interests: z.array(z.string().trim().min(1)).max(10).default([]),
    desiredPlaces: z.string().trim().max(800).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine((v) => Math.floor((v.endDate - v.startDate) / DAY_MS) + 1 <= 30, {
    message: "Trips can be a maximum of 30 days.",
    path: ["endDate"],
  })
  .refine((v) => v.destinationId || v.customLocation, {
    message: "Choose or enter a destination.",
    path: ["destinationId"],
  });
const include = {
  destination: true,
  budget: true,
  alternatives: { orderBy: { position: "asc" } },
  days: {
    orderBy: { position: "asc" },
    include: { activities: { orderBy: { position: "asc" } } },
  },
};
const budgetData = (total, mode) =>
  mode === "PRIVATE_VEHICLE"
    ? {
        transport: total * 0.3,
        accommodation: total * 0.3,
        food: total * 0.2,
        activities: total * 0.15,
        emergency: total * 0.05,
      }
    : {
        transport: total * 0.2,
        accommodation: total * 0.35,
        food: total * 0.25,
        activities: total * 0.15,
        emergency: total * 0.05,
      };
const startOfToday = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};
const statusFor = (start, end) => {
  const now = startOfToday();
  if (end < now) return "COMPLETED";
  if (start <= now && end >= now) return "IN_PROGRESS";
  return "UPCOMING";
};
async function refreshStatuses(userId) {
  const recent = statusRefreshes.get(userId);
  if (recent && Date.now() - recent.time < STATUS_REFRESH_MS)
    return recent.promise;
  const promise = refreshStatusesNow(userId).catch((error) => {
    statusRefreshes.delete(userId);
    throw error;
  });
  statusRefreshes.set(userId, { time: Date.now(), promise });
  return promise;
}
async function refreshStatusesNow(userId) {
  const today = startOfToday();
  await prisma.$transaction([
    prisma.trip.updateMany({
      where: {
        userId,
        status: { notIn: ["CANCELLED", "ARCHIVED"] },
        endDate: { lt: today },
      },
      data: { status: "COMPLETED" },
    }),
    prisma.trip.updateMany({
      where: {
        userId,
        status: { notIn: ["CANCELLED", "COMPLETED", "ARCHIVED"] },
        startDate: { lte: today },
        endDate: { gte: today },
      },
      data: { status: "IN_PROGRESS" },
    }),
    prisma.trip.updateMany({
      where: {
        userId,
        status: { notIn: ["CANCELLED", "PLANNING", "COMPLETED", "ARCHIVED"] },
        startDate: { gt: today },
      },
      data: { status: "UPCOMING" },
    }),
  ]);
}
async function owned(id, userId) {
  return prisma.trip.findFirst({ where: { id, userId }, include });
}

router.get("/stats", async (req, res, next) => {
  try {
    await refreshStatuses(req.user.id);
    const rows = await prisma.trip.findMany({
      where: { userId: req.user.id, status: { not: "ARCHIVED" } },
      select: { status: true, destinationId: true },
    });
    res.json({
      total: rows.length,
      upcoming: rows.filter((x) => ["UPCOMING", "PLANNING"].includes(x.status))
        .length,
      destinations: new Set(rows.map((x) => x.destinationId).filter(Boolean))
        .size,
    });
  } catch (e) {
    next(e);
  }
});
router.get("/", async (req, res, next) => {
  try {
    await refreshStatuses(req.user.id);
    res.json(
      await prisma.trip.findMany({
        where: { userId: req.user.id },
        include: {
          destination: true,
          budget: true,
          _count: { select: { days: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
    );
  } catch (e) {
    next(e);
  }
});
router.post("/", async (req, res, next) => {
  try {
    const v = tripSchema.parse(req.body);
    const profile = await prisma.profile.findUnique({
      where: { id: req.user.id },
      select: { location: true },
    });
    if (!profile?.location?.trim())
      return res.status(400).json({
        error:
          "Add your required starting point in Profile before creating a trip.",
      });
    const result = await prisma.$transaction(
      async (tx) => {
        const trip = await tx.trip.create({
          data: {
            ...v,
            userId: req.user.id,
            status:
              v.planningMode === "MANUAL"
                ? "PLANNING"
                : statusFor(v.startDate, v.endDate),
          },
        });
        await tx.budgetEstimate.create({
          data: {
            tripId: trip.id,
            ...budgetData(v.totalBudget, v.transportMode),
          },
        });
        if (v.planningMode === "MANUAL") {
          const count = Math.floor((v.endDate - v.startDate) / DAY_MS) + 1;
          await tx.itineraryDay.createMany({
            data: Array.from({ length: count }, (_, i) => ({
              tripId: trip.id,
              dayNumber: i + 1,
              date: new Date(v.startDate.getTime() + i * DAY_MS),
              title: `Day ${i + 1}`,
              position: i,
            })),
          });
        }
        return tx.trip.findUnique({ where: { id: trip.id }, include });
      },
      { maxWait: 10000, timeout: 30000 },
    );
    res.status(201).json(result);
  } catch (e) {
    if (e instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: e.issues[0]?.message || "Invalid trip." });
    next(e);
  }
});
router.post("/:id/status", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    const { action } = z
      .object({ action: z.enum(["COMPLETE", "REOPEN", "ARCHIVE", "RESTORE"]) })
      .parse(req.body);
    const status =
      action === "COMPLETE"
        ? "COMPLETED"
        : action === "ARCHIVE"
          ? "ARCHIVED"
          : statusFor(trip.startDate, trip.endDate);
    await prisma.trip.update({ where: { id: trip.id }, data: { status } });
    res.json(await owned(trip.id, req.user.id));
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: "Invalid trip action." });
    next(e);
  }
});
router.post("/:id/duplicate", async (req, res, next) => {
  try {
    const source = await owned(req.params.id, req.user.id);
    if (!source) return res.status(404).json({ error: "Trip not found." });
    const copy = await prisma.trip.create({
      data: {
        userId: req.user.id,
        destinationId: source.destinationId,
        customLocation: source.customLocation,
        name: `${source.name} (Copy)`,
        startDate: source.startDate,
        endDate: source.endDate,
        travelers: source.travelers,
        totalBudget: source.totalBudget,
        travelStyle: source.travelStyle,
        planningMode: "MANUAL",
        transportMode: source.transportMode,
        status: "PLANNING",
        interests: source.interests,
        desiredPlaces: source.desiredPlaces,
        notes: source.notes,
        budget: source.budget
          ? {
              create: {
                transport: source.budget.transport,
                accommodation: source.budget.accommodation,
                food: source.budget.food,
                activities: source.budget.activities,
                emergency: source.budget.emergency,
              },
            }
          : undefined,
        days: {
          create: source.days.map((day) => ({
            dayNumber: day.dayNumber,
            date: day.date,
            title: day.title,
            notes: day.notes,
            position: day.position,
            activities: {
              create: day.activities.map(
                ({ id, dayId, ...activity }) => activity,
              ),
            },
          })),
        },
        alternatives: {
          create: source.alternatives.map(
            ({ id, tripId, ...alternative }) => alternative,
          ),
        },
      },
      include,
    });
    res.status(201).json(copy);
  } catch (e) {
    next(e);
  }
});
router.patch("/:id/budget", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    const values = z
      .object({
        transport: z.coerce.number().min(0).max(10000000),
        accommodation: z.coerce.number().min(0).max(10000000),
        food: z.coerce.number().min(0).max(10000000),
        activities: z.coerce.number().min(0).max(10000000),
        emergency: z.coerce.number().min(0).max(10000000),
      })
      .refine(
        (value) =>
          Math.abs(
            Object.values(value).reduce((sum, amount) => sum + amount, 0) -
              Number(trip.totalBudget),
          ) < 0.01,
        { message: "Budget categories must add up to the total trip budget." },
      )
      .parse(req.body);
    await prisma.budgetEstimate.upsert({
      where: { tripId: trip.id },
      create: { tripId: trip.id, ...values },
      update: values,
    });
    res.json(await owned(trip.id, req.user.id));
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: e.issues[0].message });
    next(e);
  }
});
router.patch("/:id/base", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    const value = z
      .object({
        baseName: z.string().trim().max(120).nullable(),
        baseAddress: z.string().trim().max(240).nullable(),
        baseCheckIn: z.string().trim().max(40).nullable(),
        baseCheckOut: z.string().trim().max(40).nullable(),
      })
      .parse(req.body);
    await prisma.trip.update({ where: { id: trip.id }, data: value });
    res.json(await owned(trip.id, req.user.id));
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: e.issues[0].message });
    next(e);
  }
});
router.patch("/:id/cover", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    const { coverPath } = z
      .object({
        coverPath: z
          .string()
          .trim()
          .max(300)
          .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/cover\.(webp|jpe?g|png)$/i)
          .nullable(),
      })
      .parse(req.body);
    if (coverPath && !coverPath.startsWith(`${req.user.id}/${trip.id}/`))
      return res.status(403).json({ error: "Invalid cover-photo path." });
    await prisma.trip.update({ where: { id: trip.id }, data: { coverPath } });
    res.json(await owned(trip.id, req.user.id));
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: "Invalid cover-photo path." });
    next(e);
  }
});
router.get("/:id", async (req, res, next) => {
  try {
    await refreshStatuses(req.user.id);
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    res.json(trip);
  } catch (e) {
    next(e);
  }
});
router.put("/:id", async (req, res, next) => {
  try {
    const existing = await owned(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: "Trip not found." });
    const v = tripSchema.parse(req.body);
    const count = Math.floor((v.endDate - v.startDate) / DAY_MS) + 1;
    await prisma.$transaction(
      async (tx) => {
        await tx.trip.update({
          where: { id: existing.id },
          data: {
            ...v,
            status:
              v.planningMode === "MANUAL" && existing.status === "PLANNING"
                ? "PLANNING"
                : statusFor(v.startDate, v.endDate),
            budget: {
              upsert: {
                create: budgetData(v.totalBudget, v.transportMode),
                update: budgetData(v.totalBudget, v.transportMode),
              },
            },
          },
        });
        await tx.itineraryDay.deleteMany({
          where: { tripId: existing.id, dayNumber: { gt: count } },
        });
        const current = await tx.itineraryDay.findMany({
          where: { tripId: existing.id },
          select: { id: true, dayNumber: true },
        });
        for (let i = 0; i < count; i++) {
          const dayNumber = i + 1;
          const date = new Date(v.startDate.getTime() + i * DAY_MS);
          const found = current.find((d) => d.dayNumber === dayNumber);
          if (found)
            await tx.itineraryDay.update({
              where: { id: found.id },
              data: { date, position: i },
            });
          else
            await tx.itineraryDay.create({
              data: {
                tripId: existing.id,
                dayNumber,
                date,
                title: `Day ${dayNumber}`,
                position: i,
              },
            });
        }
      },
      { maxWait: 10000, timeout: 60000 },
    );
    res.json(await owned(existing.id, req.user.id));
  } catch (e) {
    if (e instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: e.issues[0]?.message || "Invalid trip." });
    next(e);
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    const trip = await owned(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    await prisma.trip.delete({ where: { id: trip.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
export default router;
