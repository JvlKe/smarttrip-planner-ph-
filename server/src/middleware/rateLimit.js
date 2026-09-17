const buckets = new Map();
export function rateLimit({ windowMs = 60000, max = 20 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.user?.id || "public"}:${req.baseUrl}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.reset <= now)
      buckets.set(key, { count: 1, reset: now + windowMs });
    else if (++current.count > max)
      return res
        .status(429)
        .json({ error: "Too many requests. Please wait and try again." });
    next();
  };
}
