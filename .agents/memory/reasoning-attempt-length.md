---
name: Diagnostic attempt length
description: How per-attempt length (short/medium/long) maps to question counts for the diagnostics.
---

Diagnostic attempts let the student pick a LENGTH after the format. Length controls only
the question count, not the kind of question.

Counts per length (same for both `subject` and `reasoning` kinds):
- short = 4
- medium = 8
- long = 14

**How to apply:** the generator is asked for exactly `count` fresh items, with prior
attempt prompts supplied as exclusions so nothing repeats. On generation failure it
falls back to a correct-first fallback bank rather than blocking the attempt.
