---
name: Diagnostic model (kinds, formats, retake/resume semantics)
description: The two diagnostic kinds, the per-attempt format picker, and the resume/retake start-handler semantics.
---

# Diagnostic model

There are TWO diagnostic kinds (`instrument` enum): `subject` (evolutionary-psychology
questions grounded in the course lecture bodies) and `reasoning` (genuine reasoning
questions solvable by careful thinking, NOT course knowledge). Each spans FOUR phases
(`before | during1 | during2 | after`) = 8 assessment rows (2 kinds × 4 phases). Any
test, any time, any order.

Per attempt the student picks a **format** — `mc` (multiple-choice), `hybrid` (MC +
optional one-line note), `written` (brief open written) — then a **length**. Items are
generated fresh at attempt start (`buildAttemptItems`).

**Why:** cheating is not a concern on diagnostics, so they are low-burden practice. The
student controls depth via format/length.

## Hard design mandates (user-stated, durable)
- Diagnostics NEVER affect the grade. Coursework = 100%, single gradebook component.
  The reasoning list is returned ungraded.
- Questions NEVER repeat: every attempt is freshly generated and prior attempt prompts
  are passed as exclusions to the generator. No seeded template items — the 8 rows are
  empty shells; items are produced only at attempt start.
- `reasoning` kind must be genuine reasoning — explicitly NOT fallacy-spotting,
  source-credibility, skepticism, or recall.

## Resume vs. retake vs. format-pick (the tricky part)
- A brand-new attempt needs a format. Start with no format returns `needsFormat=true`
  (empty items); client shows a picker, then re-calls start with format + length.
- **A retake that carries a chosen format always starts fresh — never resumes.** The
  start handler deletes any lingering `in_progress` attempt for that assessment before
  creating the new one. **Why:** otherwise a later plain refresh would resume the
  abandoned old attempt and silently ignore the newly-picked format.
- A plain open/refresh (no retake, no format) resumes an in-progress attempt so
  mid-assessment progress is never lost.

## Written grading
Open written answers are graded leniently by an LLM into `verdict` =
`correct | partial | incorrect`; scoring credits 1 / 0.5 / 0. Persisted `isCorrect` is
boolean (`verdict === "correct"`), but the review UI must render the full verdict
(distinct "Partial" badge) — do not flatten partial into incorrect at the presentation
layer. `passed` is always true (submitting completes the diagnostic; UI says
"Completed", never "Passed").
