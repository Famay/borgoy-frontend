import type { RequestHandler } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface CreateRateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message: string;
}

function getClientKey(req: Parameters<RequestHandler>[0]) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function createRateLimiter({
  windowMs,
  maxRequests,
  message,
}: CreateRateLimiterOptions): RequestHandler {
  const entries = new Map<string, RateLimitEntry>();
  let totalRequests = 0;

  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req);
    const current = entries.get(key);

    totalRequests += 1;

    if (totalRequests % 500 === 0) {
      entries.forEach((entry, entryKey) => {
        if (entry.resetAt <= now) {
          entries.delete(entryKey);
        }
      });
    }

    if (!current || current.resetAt <= now) {
      entries.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    current.count += 1;

    if (current.count > maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000)
      );

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ message });
      return;
    }

    next();
  };
}
