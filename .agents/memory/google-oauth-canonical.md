---
name: Google OAuth canonical auth file
description: The app's only login is the user's canonical passport-google-oauth20 auth.ts; rules for touching it and bundling gotcha.
---

The user supplied a canonical `server/auth.ts` (passport-google-oauth20 + express-session + connect-pg-simple) and mandated it be used VERBATIM — only app-specific values may change. NO Clerk, NO Replit Auth, EVER. Login is REQUIRED (user mandate, July 2026): unauthenticated visitors must not see or use ANY part of the site — frontend AuthGate shows only a sign-in card, and the entire /api router is gated behind isAuthenticated (exceptions: /api/auth/* and /api/healthz). An owner-only "Administrative" page (admin email match; server isAdmin guard) shows login history + day/week/month/year/all-time graphs.

**Why:** Explicit repeated user mandate ("do NOT rewrite/regenerate/replace"). Prior Clerk system was ordered destroyed.

**How to apply:**
- Never restructure `artifacts/api-server/src/auth.ts` (e.g. no helper extraction). Allowed edits only: callback path (`/api/auth/google/callback` — proxy routes only /api to the server; `/auth/google/callback` kept as alias), trustedHosts, fallback domains, session-secret fallback string, conditional pg SSL (helium/sslmode=disable DB breaks with forced ssl), and type-level-only fixes required by this repo's `noImplicitReturns`.
- Every modification to that file must be disclosed line-by-line to the user with justification.
- Secrets use the canonical fallback names GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / SESSION_SECRET (already set).
- Bundling gotcha: connect-pg-simple `createTableIfMissing` reads `table.sql` relative to `__dirname`; when esbuild-bundled that becomes `dist/` → build.mjs must copy `connect-pg-simple/table.sql` into dist or session-table creation fails with ENOENT.
- Admin analytics gate: `isAdmin` checks the owner email in the canonical file; do not alter.
