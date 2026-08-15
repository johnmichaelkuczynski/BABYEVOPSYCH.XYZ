import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { storage } from "../storage";
import { logger } from "./logger";

declare module "express-session" {
  interface SessionData {
    genChars?: number;
  }
}

// ---------------------------------------------------------------------------
// Anonymous unique-visitor tracking (owner-only analytics)
// ---------------------------------------------------------------------------

const VISITOR_COOKIE = "bep_vid";
const TOUCH_THROTTLE_MS = 10 * 60 * 1000; // don't hammer the DB per request
const lastTouched = new Map<string, number>();

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Assigns every browser a long-lived anonymous visitor id cookie and records
 * it in site_visitors (first_seen / last_seen). Never blocks the request.
 */
export const trackVisitor: RequestHandler = (req, res, next) => {
  try {
    let vid = readCookie(req.headers.cookie, VISITOR_COOKIE);
    if (!vid || !/^[a-f0-9-]{16,64}$/i.test(vid)) {
      vid = crypto.randomUUID();
      res.cookie(VISITOR_COOKIE, vid, {
        maxAge: 2 * 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV === "production" ||
          !!process.env.REPLIT_DEV_DOMAIN,
      });
    }
    const now = Date.now();
    const last = lastTouched.get(vid) ?? 0;
    if (now - last > TOUCH_THROTTLE_MS) {
      lastTouched.set(vid, now);
      if (lastTouched.size > 10000) lastTouched.clear();
      storage.touchVisitor(vid).catch((err) => {
        logger.warn({ err }, "failed to record unique visitor");
      });
    }
  } catch (err) {
    logger.warn({ err }, "visitor tracking error");
  }
  next();
};

// ---------------------------------------------------------------------------
// Free-sample gate: anonymous users may generate a couple of paragraphs of
// AI output, then must sign in with Google.
// ---------------------------------------------------------------------------

// ~2 paragraphs of generated text. Measured on the JSON payloads the AI
// endpoints return, so it is a slight over-count in the visitor's favor.
export const FREE_GEN_CHAR_LIMIT = 1600;

// Endpoints whose responses are AI-GENERATED content (tutor answers, fresh
// practice problems, grading feedback, reasoning items, lecture rewrites).
// Plain course reading (lectures, overview) stays completely open.
function isGenerativeRequest(method: string, path: string): boolean {
  if (method === "GET") {
    return path.startsWith("/tutor/suggestions/");
  }
  if (method !== "POST") return false;
  return (
    path.startsWith("/tutor/") ||
    path.startsWith("/practice") ||
    path.startsWith("/assignments") ||
    path.startsWith("/reasoning") ||
    path.startsWith("/detection") ||
    path.startsWith("/analytics/report") ||
    path.startsWith("/course/lectures")
  );
}

/**
 * Mounted on /api. Signed-in users pass through untouched. Anonymous users
 * get a per-session character budget of AI-generated output; once exhausted,
 * generative endpoints return 401 { code: "login_required" }.
 */
export const usageGate: RequestHandler = (req, res, next) => {
  if (!isGenerativeRequest(req.method, req.path)) return next();
  if (req.isAuthenticated && req.isAuthenticated()) return next();

  const used = req.session?.genChars ?? 0;
  if (used >= FREE_GEN_CHAR_LIMIT) {
    res.status(401).json({
      error:
        "You've used the free preview. Sign in with Google to keep using the course.",
      code: "login_required",
    });
    return;
  }

  // Count the generated output against the anonymous budget.
  const origJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    try {
      if (res.statusCode < 400 && req.session) {
        const size =
          typeof body === "string"
            ? body.length
            : JSON.stringify(body ?? "").length;
        req.session.genChars = (req.session.genChars ?? 0) + size;
      }
    } catch {
      // never let accounting break a response
    }
    return origJson(body as never);
  }) as typeof res.json;

  next();
};
