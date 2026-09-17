import { createHash } from "node:crypto";
import { supabase } from "../lib/supabase.js";

const verifiedUsers = new Map();
const AUTH_CACHE_MS = 60000;
const MAX_AUTH_CACHE = 500;

function tokenKey(token) {
  return createHash("sha256").update(token).digest("base64url");
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token)
    return res.status(401).json({ error: "Authentication required." });

  const key = tokenKey(token);
  const cached = verifiedUsers.get(key);
  // Revalidate writes with Auth, so a cached pre-deletion token cannot recreate
  // a deleted profile or mutate data after account removal.
  if (
    ["GET", "HEAD"].includes(req.method) &&
    cached &&
    cached.expiresAt > Date.now()
  ) {
    req.user = cached.user;
    return next();
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user)
    return res
      .status(401)
      .json({ error: "Your session is invalid or expired." });

  if (verifiedUsers.size >= MAX_AUTH_CACHE)
    verifiedUsers.delete(verifiedUsers.keys().next().value);
  verifiedUsers.set(key, {
    user: data.user,
    expiresAt: Date.now() + AUTH_CACHE_MS,
  });
  req.user = data.user;
  next();
}
