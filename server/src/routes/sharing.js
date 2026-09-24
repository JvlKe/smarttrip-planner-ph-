import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { publicTrip } from "../lib/publicTrip.js";
const router = Router();
const publicInclude = {
  destination: true,
  budget: true,
  days: {
    orderBy: { position: "asc" },
    include: { activities: { orderBy: { position: "asc" } } },
  },
};
router.get("/:token", async (req, res, next) => {
  try {
    const link = await prisma.shareLink.findFirst({
      where: { token: req.params.token, active: true },
      include: { trip: { include: publicInclude } },
    });
    if (!link)
      return res
        .status(404)
        .json({ error: "This shared trip is unavailable." });
    res.set("Cache-Control", "no-store");
    res.json(publicTrip(link.trip));
  } catch (e) {
    next(e);
  }
});
router.post("/trips/:id", requireAuth, async (req, res, next) => {
  try {
    const trip = await prisma.trip.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    res.json(
      await prisma.shareLink.upsert({
        where: { tripId: trip.id },
        create: { tripId: trip.id },
        update: { active: true },
      }),
    );
  } catch (e) {
    next(e);
  }
});
router.delete("/trips/:id", requireAuth, async (req, res, next) => {
  try {
    await prisma.shareLink.updateMany({
      where: { tripId: req.params.id, trip: { userId: req.user.id } },
      data: { active: false },
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
export default router;
