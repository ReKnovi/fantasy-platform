import {rateLimit, ipKeyGenerator} from "express-rate-limit";
import type {Request} from "express";

/**
 * express-rate-limit's default keyGenerator throws if req.ip is undefined
 * (ERR_ERL_UNDEFINED_IP_ADDRESS). Deployed Cloud Functions sit behind
 * Google's proxy and populate this correctly once `trust proxy` is set
 * (see app.ts) — but the Firebase emulator doesn't simulate that proxy
 * chain locally, so req.ip is reliably undefined in dev.
 *
 * This resolves the real client IP the same way in both environments
 * when available, and falls back to a constant bucket only when it
 * genuinely isn't — which in practice means "local emulator only."
 * Never rely on this fallback branch being safe in production; it
 * collapses all callers into one shared limit bucket.
 */
const resolveClientKey = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp =
    typeof forwarded === "string" ? forwarded.split(",")[0].trim() : undefined;
  const ip = req.ip ?? forwardedIp;

  // Fallback only fires when neither req.ip nor X-Forwarded-For resolved —
  // in practice this means "local emulator with no proxy info." Never
  // treat this branch as safe in production: it collapses every caller
  // into one shared bucket.
  if (!ip) return "unknown";

  return ipKeyGenerator(ip);
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: resolveClientKey,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: resolveClientKey,
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
});
