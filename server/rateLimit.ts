import type { Request } from "express";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  req: Request,
  keyPrefix: string,
  max: number,
  windowMs: number
): string | null {
  const ip =
    (typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : null) || req.socket.remoteAddress || "unknown";
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return "Trop de tentatives. Réessayez plus tard.";
  }
  return null;
}
