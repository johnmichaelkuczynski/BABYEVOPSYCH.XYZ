---
name: Reasoning attempt length
description: How per-attempt length (short/medium/long) maps to question counts for the two diagnostic instruments.
---

Diagnostic reasoning attempts let the student pick a LENGTH after the format. Length controls only the question count, not the kind of reasoning.

Counts per length:
- critical (seeded template = N MCQs, normally 10): short = max(3, round(N/2)), medium = N, long = round(N*1.6). So 5 / 10 / 16.
- ethical (seed = a single dilemma scenario): fixed short=2, medium=4, long=8.

**Why:** medium must equal the pre-existing standard set ("what you now have"), so critical medium is pinned to the seeded template count rather than a fixed number. The ethical seed is only one scenario, so its counts can't derive from the template and are hard-coded to give a meaningful spread.

**Deviation to remember:** the ethical instrument historically generated exactly 1 dilemma per attempt. medium is now 4, so even the "standard" ethical attempt produces more scenarios than before. This is intentional.

**How to apply:** critical attempts cycle/resize the seeded MCQ template to the target count; ethical attempts generate `count` fresh dilemma bank items in parallel (one dilemma per generate call). Both fall back to repeating template items only on generation failure.
