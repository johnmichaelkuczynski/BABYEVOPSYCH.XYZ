---
name: No auth by user mandate
description: All login (Clerk) was deliberately ripped out; app is intentionally unauthenticated.
---

The user explicitly ordered the entire Clerk login system removed ("rip it out, do not fix, do not patch") in July 2026, saying they "have a plan" for what comes next.

**Why:** User mandate. The app is single-user; auth added friction with no security value (API never had per-route authz anyway — Clerk gating was frontend-only).

**How to apply:**
- Do NOT re-add, restore, or suggest fixing any login system unless the user explicitly asks.
- Current state: `/` renders the public Landing (CTAs link straight to `/dashboard`); all routes are unguarded; server has no auth middleware; no `@clerk/*` deps anywhere.
- "Admin mode" and skipDetection remain intentional client-side flags, not a trust boundary.
- If the user's "plan" involves a new auth system, treat it as a fresh build, not a restoration of the old Clerk setup.
