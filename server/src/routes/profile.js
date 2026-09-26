import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { profileSchema } from "../lib/profileSchema.js";
import { startingPointFor } from "../lib/startingPoint.js";
import { requireAuth } from "../middleware/auth.js";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  confirmAccountDeletion,
  removeAccountInTransaction,
} from "../lib/accountDeletion.js";

const router = Router();
router.use(requireAuth);
router.delete(
  "/",
  rateLimit({ max: 5, windowMs: 15 * 60000 }),
  async (req, res) => {
    const verifier = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    try {
      await confirmAccountDeletion({
        user: req.user,
        body: req.body,
        verifyPassword: async (email, password) => {
          const { data, error } = await verifier.auth.signInWithPassword({
            email,
            password,
          });
          return error ? null : data.user;
        },
        removeAccount: (id) => removeAccountInTransaction(prisma, id),
      });
      res.json({ deleted: true });
    } catch (error) {
      res.status(error.status || 503).json({
        error: error.status
          ? error.message
          : "Account deletion could not be confirmed. Please try signing in again or contact support.",
      });
    } finally {
      // Do not retain the temporary password-verification session.
      await verifier.auth.signOut({ scope: "local" }).catch(() => {});
    }
  },
);
router.get("/", async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user.id },
    });
    res.json(
      profile
        ? { ...profile, location: startingPointFor(profile.location) }
        : null,
    );
  } catch (e) {
    next(e);
  }
});
router.put("/", async (req, res, next) => {
  try {
    const value = profileSchema.parse(req.body);
    res.json(
      await prisma.profile.upsert({
        where: { id: req.user.id },
        update: value,
        create: { id: req.user.id, ...value },
      }),
    );
  } catch (e) {
    if (e instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: e.issues[0]?.message || "Invalid profile." });
    next(e);
  }
});
export default router;
