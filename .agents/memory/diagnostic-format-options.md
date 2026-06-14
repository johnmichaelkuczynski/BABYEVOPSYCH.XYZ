---
name: Diagnostic reasoning format options
description: How the two diagnostic instruments let a student pick a response format per attempt, and the resume/retake semantics that interact with it.
---

# Diagnostic format options

The two DIAGNOSTIC reasoning instruments (not the graded course assignments) let the
student choose a response **format** per attempt: `mc` (multiple-choice only),
`hybrid` (MC + optional one-line note), `written` (brief open written). The same
question bank is generated, then transformed to the chosen format at attempt start
(`buildAttemptItems`), not regenerated per format.

**Why:** audience is busy college students/professors; cheating is NOT a concern on
the diagnostics, so the heavy DIT rate/rank dilemma flow was retired as the default
to cut writing burden. Dilemma scoring/review is kept only for backward-compat with
pre-existing attempts.

## Resume vs. retake vs. format-pick (the tricky part)
- A brand-new attempt needs a format. Start with no format returns `needsFormat=true`
  (id 0, empty items); the client shows a picker, then re-calls start with the format.
- **A retake that carries a chosen format always starts fresh — never resumes.** The
  start handler deletes any lingering `in_progress` attempt for that assessment before
  creating the new one. **Why:** otherwise a later plain refresh (no retake/format)
  would resume the abandoned old-format attempt instead of the fresh one, and the
  user's newly-picked format would be silently ignored.
- A plain open/refresh (no retake, no format) still resumes an in-progress attempt so
  mid-assessment progress is never lost.

## Written grading
Open written answers are graded leniently by an LLM into `verdict` =
`correct | partial | incorrect`; scoring credits 1 / 0.5 / 0. Persisted `isCorrect`
is boolean (`verdict === "correct"`), but the review UI must render the full verdict
(including a distinct "Partial" badge) — do not flatten partial into incorrect at the
presentation layer. `passed` is always true (submitting is a pass).
