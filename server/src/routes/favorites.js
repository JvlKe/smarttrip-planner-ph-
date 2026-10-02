import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Ensure all favorites routes require authentication
router.use(requireAuth);

const saveFavoriteSchema = z.object({
  destinationId: z.number({
    required_error: "destinationId is required",
    invalid_type_error: "destinationId must be a number"
  }).int("destinationId must be an integer").positive("destinationId must be positive")
});

const deleteFavoriteSchema = z.object({
  destinationId: z.coerce.number().int().positive()
});

router.get("/", async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            region: true,
            imageUrl: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(favorites);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { destinationId } = saveFavoriteSchema.parse(req.body);

    const destination = await prisma.destination.findUnique({
      where: { id: destinationId }
    });

    if (!destination) {
      return res.status(404).json({ error: "Destination not found" });
    }

    // Gracefully handle duplicates using upsert
    const favorite = await prisma.favorite.upsert({
      where: {
        userId_destinationId: {
          userId: req.user.id,
          destinationId
        }
      },
      update: {},
      create: {
        userId: req.user.id,
        destinationId
      }
    });

    // If it was just created vs already existed, status could be 201 vs 200, but res.json is fine.
    res.status(200).json(favorite);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || "Invalid input." });
    }
    next(error);
  }
});

router.delete("/:destinationId", async (req, res, next) => {
  try {
    const { destinationId } = deleteFavoriteSchema.parse(req.params);

    // Delete matching favorite owned by the user.
    // If it does not exist, Prisma will throw a P2025 error.
    try {
      await prisma.favorite.delete({
        where: {
          userId_destinationId: {
            userId: req.user.id,
            destinationId
          }
        }
      });
      res.status(204).end();
    } catch (dbError) {
      // Prisma error for "Record to delete does not exist"
      if (dbError.code === "P2025") {
        return res.status(404).json({ error: "Favorite not found" });
      }
      throw dbError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid destination ID." });
    }
    next(error);
  }
});

export default router;
