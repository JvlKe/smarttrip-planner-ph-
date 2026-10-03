import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const router = Router();
const MAX_SEARCH_OFFSET = 100_000;

// Valid Philippine months for the bestMonths filter
const VALID_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const searchSchema = z.object({
  // Free-text query: trim it and cap at 100 characters
  q: z
    .string()
    .trim()
    .max(100, "Search text is too long.")
    .optional(),

  // Region filter: trim and cap
  region: z
    .string()
    .trim()
    .max(100)
    .optional(),

  // Interest filter: must be a non-empty string
  interest: z
    .string()
    .trim()
    .max(60)
    .optional(),

  // Budget range: must be non-negative numbers and min <= max
  budgetMin: z.coerce
    .number()
    .int("budgetMin must be a whole number.")
    .min(0, "budgetMin cannot be negative.")
    .optional(),

  budgetMax: z.coerce
    .number()
    .int("budgetMax must be a whole number.")
    .min(0, "budgetMax cannot be negative.")
    .optional(),

  // Best month filter: must be a real month name
  month: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => v === undefined || VALID_MONTHS.includes(v),
      { message: "month must be a full English month name (e.g. January)." }
    ),

  // Suggested trip length: positive integers
  daysMin: z.coerce
    .number()
    .int("daysMin must be a whole number.")
    .min(1, "daysMin must be at least 1.")
    .optional(),

  daysMax: z.coerce
    .number()
    .int("daysMax must be a whole number.")
    .min(1, "daysMax must be at least 1.")
    .optional(),

  // Pagination
  page: z.coerce
    .number()
    .int()
    .min(1, "page must be at least 1.")
    .default(1),

  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(50, "pageSize cannot exceed 50.")
    .default(20),
});

// GET /api/destinations/search
router.get("/", async (req, res, next) => {
  try {
    // Validate and parse the query string
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || "Invalid search parameters.",
      });
    }

    const {
      q,
      region,
      interest,
      budgetMin,
      budgetMax,
      month,
      daysMin,
      daysMax,
      page,
      pageSize,
    } = parsed.data;

    // Sanity-check cross-field budget range
    if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax) {
      return res.status(400).json({
        error: "budgetMin cannot be greater than budgetMax.",
      });
    }

    // Sanity-check cross-field days range
    if (daysMin !== undefined && daysMax !== undefined && daysMin > daysMax) {
      return res.status(400).json({
        error: "daysMin cannot be greater than daysMax.",
      });
    }

    const skip = (page - 1) * pageSize;
    if (!Number.isSafeInteger(skip) || skip > MAX_SEARCH_OFFSET) {
      return res.status(400).json({
        error: "Requested page is too far into the results.",
      });
    }

    // Build the Prisma where clause from only the filters the user supplied
    const where = {};

    // Free-text search: match against name, region, or description
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { region: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    // Exact region filter (case-insensitive contains)
    if (region) {
      where.region = { contains: region, mode: "insensitive" };
    }

    // Interest filter: the interests field is an array in Postgres,
    // so we use Prisma's array filter: has
    if (interest) {
      where.interests = { has: interest };
    }

    // Budget filters against dailyBudgetMin and dailyBudgetMax fields
    // We use overlap logic: a destination matches if its budget range overlaps
    // the user's requested range. (destination.max >= user.min AND destination.min <= user.max)
    if (budgetMin !== undefined) {
      where.dailyBudgetMax = { gte: budgetMin };
    }
    if (budgetMax !== undefined) {
      where.dailyBudgetMin = { lte: budgetMax };
    }

    // Best-month filter: the bestMonths field is a string array in Postgres
    if (month) {
      where.bestMonths = { has: month };
    }

    // Suggested days filter against the suggestedDays field
    if (daysMin !== undefined) {
      where.suggestedDays = { ...(where.suggestedDays || {}), gte: daysMin };
    }
    if (daysMax !== undefined) {
      where.suggestedDays = { ...(where.suggestedDays || {}), lte: daysMax };
    }

    // Run count and data fetch in parallel for efficiency
    const [total, results] = await Promise.all([
      prisma.destination.count({ where }),
      prisma.destination.findMany({
        where,
        select: {
          id: true,
          name: true,
          region: true,
          province: true,
          description: true,
          imageUrl: true,
          bestMonths: true,
          interests: true,
          suggestedDays: true,
          dailyBudgetMin: true,
          dailyBudgetMax: true,
        },
        orderBy: [
          { featured: "desc" },
          { name: "asc" },
        ],
        skip,
        take: pageSize,
      }),
    ]);

    res.json({
      results,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
