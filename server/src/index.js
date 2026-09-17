import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { randomUUID } from "node:crypto";
import { prisma } from "./lib/prisma.js";
import profileRouter from "./routes/profile.js";
import tripsRouter from "./routes/trips.js";
import itineraryRouter from "./routes/itinerary.js";
import assistantRouter from "./routes/assistant.js";
import travelRouter from "./routes/travel.js";
import sharingRouter from "./routes/sharing.js";
import { rateLimit } from "./middleware/rateLimit.js";

const app = express();
let destinationCache;
let destinationCacheTime = 0;
const destinationPhotoCache = new Map();
const DESTINATION_CACHE_MS = 5 * 60 * 1000;
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(",") ?? "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "850kb" }));
app.use((req, res, next) => {
  const started = performance.now();
  req.requestId = req.get("x-request-id") || randomUUID();
  res.setHeader("x-request-id", req.requestId);
  res.on("finish", () => {
    const duration = performance.now() - started;
    if (duration > 2000)
      console.warn(
        `[slow] ${req.requestId} ${req.method} ${req.originalUrl} ${duration.toFixed(0)}ms`,
      );
  });
  next();
});
app.use(morgan("dev"));
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "smarttrip-api" }),
);
app.post("/api/client-errors", rateLimit({ max: 12 }), (req, res) => {
  const message = String(req.body?.message || "Unknown frontend error")
    .replace(/[\r\n]/g, " ")
    .slice(0, 500);
  const path = String(req.body?.path || "unknown").slice(0, 200);
  console.warn(`[frontend] ${req.requestId} ${path}: ${message}`);
  res.status(204).end();
});
app.get("/api/destinations", async (_req, res, next) => {
  try {
    if (
      !destinationCache ||
      Date.now() - destinationCacheTime > DESTINATION_CACHE_MS
    ) {
      destinationCache = await prisma.destination.findMany({
        where: { featured: true },
        orderBy: { name: "asc" },
      });
      destinationCacheTime = Date.now();
    }
    res.set(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=86400",
    );
    res.json(destinationCache);
  } catch (error) {
    next(error);
  }
});
app.get("/api/destinations/photo", async (req, res, next) => {
  try {
    const title = String(req.query.title || "")
      .trim()
      .slice(0, 100);
    if (!title)
      return res
        .status(400)
        .json({ error: "A destination title is required." });
    if (destinationPhotoCache.has(title)) {
      res.set(
        "Cache-Control",
        "public, max-age=86400, stale-while-revalidate=604800",
      );
      return res.json({ photoUrl: destinationPhotoCache.get(title) });
    }
    const params = new URLSearchParams({
      action: "query",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "960",
      redirects: "1",
      format: "json",
      titles: title,
    });
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?${params}`,
      {
        headers: { "User-Agent": "SmartTripPlannerPH/1.0" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error("Destination photo provider unavailable");
    const result = await response.json();
    const photoUrl =
      Object.values(result?.query?.pages || {})[0]?.thumbnail?.source || "";
    destinationPhotoCache.set(title, photoUrl);
    res.set(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=604800",
    );
    res.json({ photoUrl });
  } catch (error) {
    next(error);
  }
});
app.use("/api/profile", profileRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/itinerary", rateLimit({ max: 40 }), itineraryRouter);
app.use("/api/travel", travelRouter);
app.use("/api/share", sharingRouter);
app.use("/api/assistant", rateLimit({ max: 15 }), assistantRouter);
app.use((error, req, res, _next) => {
  console.error(`[${req.requestId}]`, error);
  res.status(500).json({
    error: "Something went wrong. Please try again.",
    requestId: req.requestId,
  });
});
// Vercel imports the Express application as a serverless function. Local
// development starts the regular HTTP server.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 4000);
  const server = app.listen(port, "0.0.0.0", () =>
    console.log(`SmartTrip API listening on ${port}`),
  );
  const shutdown = async () => {
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export default app;
