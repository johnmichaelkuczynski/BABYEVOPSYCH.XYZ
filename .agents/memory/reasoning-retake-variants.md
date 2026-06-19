---
name: Reasoning diagnostic retake variants
description: How retakes of diagnostics get fresh-but-same-kind questions, and the invariants that must hold.
---

# Diagnostic retakes

There are two diagnostic kinds: `subject` (evolutionary-psychology questions
grounded in the course's own lecture text) and `reasoning` (genuine general
reasoning). Items are `mcq` or `short_answer`. Diagnostics NEVER affect the
grade (coursework = 100%).

EVERY take of a diagnostic — including the very first take and any take after a
course reset (attempts cleared) — generates fresh items of the SAME KIND and
persists them against that attempt (`diagnostic_items.attemptId = <attempt>`),
so every attempt owns its own item set. Prior attempts' prompts are passed as
exclusions so a question never repeats.

**Why not "first take uses template":** an earlier version only generated on
retake (gated on prior-attempt existence). After a reset wiped attempts, the
next take looked like a first take and served an identical stale item again.
Never gate freshness on prior-attempt existence — always generate per new
attempt. (Generation may fall back to a small static pool only when the AI call
fails, so submission never blocks.)

**Invariants a retake MUST preserve (the "same kind" contract):**
- Same instrument (`subject` vs `reasoning`), same item count, same answer
  structure for the chosen format.
- MCQs: 4 options, exactly one correct.

**Scoring must use the attempt's own items.** Submit resolves the in-progress
attempt first, then loads items for THAT attempt (`attemptId`). Resume (start
without retake) returns the in-progress attempt's items so a refresh mid-attempt
shows the same questions.

**Never block submission:** any AI/validation failure falls back to a static
item pool rather than erroring.

**How to apply:** the client-facing item response intentionally omits the answer
key, so verify correctness via the submit metrics breakdown, not the GET.

**Per-question review on the results screen:** submit and revisit both return a
`review[]` (question + student's answer + correct answer), built from the
attempt's items and stored `responses` jsonb. An UNANSWERED MCQ (no
selectedIndex) must report `isCorrect: null`, NOT `false` — submit validation
does not force every item answered, so treating "no answer" as "incorrect"
mislabels it. UI: null = neutral "No answer", true = green, false = red.

**Grade on actual correctness, not the stored answer key.** Correctness is
judged by the model on the merits; stored keys/model answers are only fallible
hints it can override. The judged result must drive ALL THREE grading surfaces
in lockstep — the `scoreSummary` headline/metrics, the `review[]`, AND the
persisted `diagnostic_responses.is_correct` rows — or analytics will disagree
with the results screen. Judged answers are persisted so revisit rebuilds review
without re-judging.
**Why:** stored keys can be wrong, and partial updates leave one surface on the
old key behavior (an architect-caught regression).
