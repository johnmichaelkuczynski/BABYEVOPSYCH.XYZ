import { Router, type IRouter } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  attemptsTable,
  diagnosticAssessmentsTable,
  diagnosticItemsTable,
  diagnosticAttemptsTable,
  diagnosticResponsesTable,
} from "@workspace/db";
import {
  ListReasoningAssessmentsResponse,
  GetReasoningAssessmentResponse,
  StartReasoningAttemptResponse,
  StartReasoningAttemptBody,
  SubmitReasoningAttemptResponse,
  SubmitReasoningAttemptBody,
  GetGradebookResponse,
} from "@workspace/api-zod";
import {
  scoreAssessment,
  judgeCritical,
  gradeWritten,
  generateFeedback,
  buildAttemptItems,
  buildReview,
  publicItem,
  type DiagnosticItemRow,
  type GeneratedItemContent,
  type ResponseInput,
  type ReasoningMetric,
  type ScoreSummary,
  type WrittenGrade,
  type Format,
  type Length,
  type ItemType,
} from "../lib/reasoning";

const router: IRouter = Router();

const COURSEWORK_WEIGHT = 80;
const DIAGNOSTIC_WEIGHT = 20;

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

type Instrument = "ethical" | "critical";
type Phase = "baseline" | "unit1" | "unit2" | "unit3" | "unit4";

type ItemRowRaw = typeof diagnosticItemsTable.$inferSelect;

function mapItemRows(rows: ItemRowRaw[]): DiagnosticItemRow[] {
  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    type: r.type as ItemType,
    prompt: r.prompt,
    payload: r.payload,
    scoring: r.scoring,
  }));
}

// The seeded "template" items for an assessment (attemptId IS NULL). Used for
// the first take, the assessment preview, and as the blueprint for retake
// generation.
async function loadTemplateItems(assessmentId: number): Promise<DiagnosticItemRow[]> {
  const rows = await db
    .select()
    .from(diagnosticItemsTable)
    .where(
      and(
        eq(diagnosticItemsTable.assessmentId, assessmentId),
        isNull(diagnosticItemsTable.attemptId),
      ),
    )
    .orderBy(asc(diagnosticItemsTable.position));
  return mapItemRows(rows);
}

// The items to present/score for a specific attempt: its own generated items if
// it has any (retakes), otherwise the seeded template (first take).
async function loadItemsForAttempt(
  assessmentId: number,
  attemptId: number,
): Promise<DiagnosticItemRow[]> {
  const rows = await db
    .select()
    .from(diagnosticItemsTable)
    .where(eq(diagnosticItemsTable.attemptId, attemptId))
    .orderBy(asc(diagnosticItemsTable.position));
  if (rows.length > 0) return mapItemRows(rows);
  return loadTemplateItems(assessmentId);
}

// Persist freshly generated items, tagged to an attempt.
async function insertAttemptItems(
  assessmentId: number,
  attemptId: number,
  contents: GeneratedItemContent[],
): Promise<void> {
  if (contents.length === 0) return;
  await db.insert(diagnosticItemsTable).values(
    contents.map((c, i) => ({
      assessmentId,
      attemptId,
      position: i,
      type: c.type,
      prompt: c.prompt,
      payload: c.payload,
      scoring: c.scoring,
    })),
  );
}

router.get("/reasoning/assessments", async (_req, res) => {
  const assessments = await db
    .select()
    .from(diagnosticAssessmentsTable)
    .orderBy(asc(diagnosticAssessmentsTable.position));
  const result = await Promise.all(
    assessments.map(async (a) => {
      const items = await db
        .select({ id: diagnosticItemsTable.id })
        .from(diagnosticItemsTable)
        .where(
          and(
            eq(diagnosticItemsTable.assessmentId, a.id),
            isNull(diagnosticItemsTable.attemptId),
          ),
        );
      const attempts = await db
        .select()
        .from(diagnosticAttemptsTable)
        .where(eq(diagnosticAttemptsTable.assessmentId, a.id))
        .orderBy(asc(diagnosticAttemptsTable.id));
      const submitted = attempts.find((x) => x.status === "submitted");
      const inProgress = attempts.find((x) => x.status === "in_progress");
      const status: "not_started" | "in_progress" | "passed" = submitted
        ? "passed"
        : inProgress
        ? "in_progress"
        : "not_started";
      const last = attempts[attempts.length - 1];
      return {
        id: a.id,
        instrument: a.instrument as Instrument,
        phase: a.phase as Phase,
        title: a.title,
        subtitle: a.subtitle,
        itemCount: items.length,
        status,
        lastAttemptId: last?.id ?? null,
      };
    }),
  );
  res.json(ListReasoningAssessmentsResponse.parse(result));
});

router.get("/reasoning/assessments/:assessmentId", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.assessmentId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [a] = await db
    .select()
    .from(diagnosticAssessmentsTable)
    .where(eq(diagnosticAssessmentsTable.id, id));
  if (!a) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const items = await loadTemplateItems(id);
  res.json(
    GetReasoningAssessmentResponse.parse({
      id: a.id,
      instrument: a.instrument as Instrument,
      phase: a.phase as Phase,
      title: a.title,
      subtitle: a.subtitle,
      instructions: a.instructions,
      items: items.map(publicItem),
    }),
  );
});

router.post("/reasoning/assessments/:assessmentId/start", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.assessmentId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const parsedBody = StartReasoningAttemptBody.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }
  const retake = parsedBody.data.retake === true;
  const length = (parsedBody.data.length as Length | undefined) ?? "medium";

  const [a] = await db
    .select()
    .from(diagnosticAssessmentsTable)
    .where(eq(diagnosticAssessmentsTable.id, id));
  if (!a) {
    res.status(404).json({ error: "assessment not found" });
    return;
  }

  // A retake that already carries a chosen format wants a brand-new attempt in
  // exactly that format — never a resume. This is the format-picker → start flow
  // from the UI, where the student has explicitly re-selected how to answer.
  const wantsFreshFormat = retake && typeof parsedBody.data.format === "string";
  // Discard any stale in-progress attempt first, so a later plain refresh can't
  // resume the abandoned one instead of the fresh attempt we're about to make.
  if (wantsFreshFormat) {
    await db
      .delete(diagnosticAttemptsTable)
      .where(
        and(
          eq(diagnosticAttemptsTable.assessmentId, id),
          eq(diagnosticAttemptsTable.status, "in_progress"),
        ),
      );
  }

  // Resume an in-progress attempt if one exists (so a refresh mid-assessment
  // never loses progress). Otherwise, on a normal open we surface the
  // already-passed attempt for review; on a retake we fall through and start a
  // brand-new attempt so the student can take it again. A retake with a chosen
  // format always starts fresh (handled above).
  const existing = wantsFreshFormat
    ? []
    : await db
        .select()
        .from(diagnosticAttemptsTable)
        .where(eq(diagnosticAttemptsTable.assessmentId, id))
        .orderBy(asc(diagnosticAttemptsTable.id));
  const reusable = retake
    ? existing.find((x) => x.status === "in_progress")
    : existing.find((x) => x.status === "in_progress") ??
      existing.find((x) => x.status === "submitted");
  if (reusable) {
    const items = await loadItemsForAttempt(id, reusable.id);
    const reviewed = reusable.status === "submitted";
    const summary = reviewed
      ? (reusable.scoreSummary as ScoreSummary | null)
      : null;
    const storedResponses = reviewed
      ? ((reusable.responses as ResponseInput[] | null) ?? [])
      : [];
    // Reuse the model-judged correct answers persisted at submit time so the
    // review shows the same answers it was graded against (no re-judging).
    const judged = new Map<number, number>(
      Object.entries(summary?.correctByItem ?? {}).map(([k, v]) => [
        Number(k),
        v as number,
      ]),
    );
    // Reuse the persisted written grades so the review shows the same verdicts.
    const written = new Map<number, WrittenGrade>(
      Object.entries(summary?.writtenByItem ?? {}).map(([k, v]) => [
        Number(k),
        v as WrittenGrade,
      ]),
    );
    res.json(
      StartReasoningAttemptResponse.parse({
        id: reusable.id,
        assessmentId: reusable.assessmentId,
        status: reusable.status as "in_progress" | "submitted",
        format: (reusable.format as Format | null) ?? null,
        length: (reusable.length as Length | null) ?? null,
        needsFormat: false,
        startedAt: reusable.startedAt.toISOString(),
        submittedAt: reusable.submittedAt?.toISOString() ?? null,
        passed: reusable.passed,
        feedback: reusable.feedback,
        headline: summary?.headline ?? null,
        metrics: (summary?.metrics as ReasoningMetric[] | undefined) ?? null,
        review: reviewed ? buildReview(items, storedResponses, judged, written) : null,
        items: items.map(publicItem),
      }),
    );
    return;
  }

  // No reusable attempt: a brand-new attempt needs a format. If the client has
  // not chosen one yet, signal needsFormat so it can prompt the student, then
  // re-call start with the chosen format. No attempt row is created yet.
  const format = parsedBody.data.format as Format | undefined;
  if (!format) {
    res.json(
      StartReasoningAttemptResponse.parse({
        id: 0,
        assessmentId: id,
        status: "in_progress",
        format: null,
        length: null,
        needsFormat: true,
        startedAt: new Date().toISOString(),
        submittedAt: null,
        passed: null,
        feedback: null,
        items: [],
      }),
    );
    return;
  }

  const [created] = await db
    .insert(diagnosticAttemptsTable)
    .values({ assessmentId: id, status: "in_progress", format, length })
    .returning();
  if (!created) {
    res.status(500).json({ error: "failed to create" });
    return;
  }

  // Every occurrence of the assessment presents freshly generated questions of
  // the same kind (different scenarios/items) — including the very first take
  // and any take after a course reset. The seeded template is only the
  // structural blueprint, and the fallback if generation fails. The items are
  // shaped to the chosen response format (multiple-choice, hybrid, or written).
  const template = await loadTemplateItems(id);
  const variant = await buildAttemptItems(a.instrument as Instrument, format, length, template);
  await insertAttemptItems(id, created.id, variant);
  const items = await loadItemsForAttempt(id, created.id);

  res.json(
    StartReasoningAttemptResponse.parse({
      id: created.id,
      assessmentId: created.assessmentId,
      status: "in_progress",
      format,
      length,
      needsFormat: false,
      startedAt: created.startedAt.toISOString(),
      submittedAt: null,
      passed: null,
      feedback: null,
      items: items.map(publicItem),
    }),
  );
});

router.post("/reasoning/assessments/:assessmentId/submit", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.assessmentId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const parsed = SubmitReasoningAttemptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [a] = await db
    .select()
    .from(diagnosticAssessmentsTable)
    .where(eq(diagnosticAssessmentsTable.id, id));
  if (!a) {
    res.status(404).json({ error: "assessment not found" });
    return;
  }

  const responses = parsed.data.responses as ResponseInput[];

  // Attach to the in-progress attempt if present, else create one. Score
  // against THAT attempt's own generated items. Prefer the in-progress attempt;
  // if none (e.g. a resubmit), fall back to the most recent attempt for this
  // assessment. The seeded template is used only when the assessment has never
  // been attempted (in which case the client has no generated item IDs anyway).
  const attempts = await db
    .select()
    .from(diagnosticAttemptsTable)
    .where(eq(diagnosticAttemptsTable.assessmentId, id))
    .orderBy(asc(diagnosticAttemptsTable.id));
  const target =
    attempts.find((x) => x.status === "in_progress") ??
    attempts[attempts.length - 1];

  const items = target
    ? await loadItemsForAttempt(id, target.id)
    : await loadTemplateItems(id);
  const instrument = a.instrument as Instrument;
  // For MCQ (critical) assessments, judge the genuinely correct option with the
  // model rather than trusting the stored answer key. Both scoring and the
  // per-question review use these judged answers.
  const judged =
    instrument === "critical" ? await judgeCritical(items) : new Map<number, number>();
  // Grade any open written (short_answer) responses leniently against their
  // model answers; used by both scoring and the per-question review.
  const written = items.some((it) => it.type === "short_answer")
    ? await gradeWritten(items, responses)
    : new Map<number, WrittenGrade>();
  const summary = scoreAssessment(instrument, items, responses, judged, written);
  const feedback = await generateFeedback(instrument, a.title, summary);

  // Pass/Fail policy: submitting the assessment is a pass.
  const passed = true;

  let attemptId: number;
  if (target) {
    attemptId = target.id;
    await db
      .update(diagnosticAttemptsTable)
      .set({
        status: "submitted",
        passed,
        feedback,
        responses,
        scoreSummary: summary,
        submittedAt: new Date(),
      })
      .where(eq(diagnosticAttemptsTable.id, target.id));
  } else {
    const [created] = await db
      .insert(diagnosticAttemptsTable)
      .values({
        assessmentId: id,
        status: "submitted",
        passed,
        feedback,
        responses,
        scoreSummary: summary,
        submittedAt: new Date(),
      })
      .returning();
    if (!created) {
      res.status(500).json({ error: "failed to record attempt" });
      return;
    }
    attemptId = created.id;
  }

  // Persist one normalized row per answered item (replacing any prior rows for
  // this attempt). isCorrect is set for mcq (judged option) and short_answer
  // (grader verdict) items, and left null for dilemmas.
  await db
    .delete(diagnosticResponsesTable)
    .where(eq(diagnosticResponsesTable.attemptId, attemptId));
  const byItem = new Map(responses.map((r) => [r.itemId, r]));
  const rows = items.map((item) => {
    const resp = byItem.get(item.id);
    let isCorrect: boolean | null = null;
    if (item.type === "mcq") {
      const sc = item.scoring as { correctIndex?: number };
      // Grade against the model-judged correct option (same source as scoring
      // and review), falling back to the stored key only if unjudged.
      const correctIndex = judged.get(item.id) ?? sc.correctIndex;
      isCorrect =
        typeof resp?.selectedIndex === "number" &&
        resp.selectedIndex === correctIndex;
    } else if (item.type === "short_answer") {
      const grade = written.get(item.id);
      isCorrect = grade ? grade.verdict === "correct" : null;
    }
    return {
      attemptId,
      itemId: item.id,
      selectedIndex: resp?.selectedIndex ?? null,
      answerText: resp?.text ?? null,
      note: resp?.note ?? null,
      decisionIndex: resp?.decisionIndex ?? null,
      ratings: resp?.ratings ?? null,
      ranking: resp?.ranking ?? null,
      isCorrect,
    };
  });
  if (rows.length > 0) {
    await db.insert(diagnosticResponsesTable).values(rows);
  }

  res.json(
    SubmitReasoningAttemptResponse.parse({
      attemptId,
      passed,
      feedback,
      headline: summary.headline,
      metrics: summary.metrics,
      review: buildReview(items, responses, judged, written),
    }),
  );
});

router.get("/reasoning/grades", async (_req, res) => {
  // ---- Coursework (80%) ----
  const assignments = await db
    .select()
    .from(assignmentsTable)
    .orderBy(asc(assignmentsTable.weekNumber), asc(assignmentsTable.position));
  const coursework = await Promise.all(
    assignments.map(async (a) => {
      const attempts = await db
        .select()
        .from(attemptsTable)
        .where(eq(attemptsTable.assignmentId, a.id));
      const submitted = attempts.filter((x) => x.status === "submitted");
      const inProgress = attempts.some((x) => x.status === "in_progress");
      const best = submitted.reduce(
        (b, x) => (x.scorePercent != null && x.scorePercent > b ? x.scorePercent : b),
        -1,
      );
      const status: "not_started" | "in_progress" | "submitted" =
        submitted.length > 0 ? "submitted" : inProgress ? "in_progress" : "not_started";
      return {
        id: a.id,
        kind: a.kind as "homework" | "test" | "midterm" | "final",
        title: a.title,
        weekNumber: a.weekNumber,
        status,
        bestScore: best < 0 ? null : best,
      };
    }),
  );
  const courseworkAvg =
    coursework.length === 0
      ? 0
      : coursework.reduce((s, c) => s + (c.bestScore ?? 0), 0) / coursework.length;

  // ---- Diagnostics (20%) ----
  const assessments = await db
    .select()
    .from(diagnosticAssessmentsTable)
    .orderBy(asc(diagnosticAssessmentsTable.position));
  const reasoning = await Promise.all(
    assessments.map(async (a) => {
      const attempts = await db
        .select()
        .from(diagnosticAttemptsTable)
        .where(eq(diagnosticAttemptsTable.assessmentId, a.id));
      const passed = attempts.some((x) => x.status === "submitted" && x.passed);
      const inProgress = attempts.some((x) => x.status === "in_progress");
      const status: "not_started" | "in_progress" | "passed" = passed
        ? "passed"
        : inProgress
        ? "in_progress"
        : "not_started";
      return {
        id: a.id,
        instrument: a.instrument as Instrument,
        phase: a.phase as Phase,
        title: a.title,
        status,
      };
    }),
  );
  const passedCount = reasoning.filter((r) => r.status === "passed").length;
  const reasoningPct =
    reasoning.length === 0 ? 0 : (passedCount / reasoning.length) * 100;

  const courseworkEarned = (courseworkAvg / 100) * COURSEWORK_WEIGHT;
  const diagnosticsEarned = (reasoningPct / 100) * DIAGNOSTIC_WEIGHT;
  const overall = courseworkEarned + diagnosticsEarned;

  const letterGrade =
    overall >= 90
      ? "A"
      : overall >= 80
      ? "B"
      : overall >= 70
      ? "C"
      : overall >= 60
      ? "D"
      : "F";

  res.json(
    GetGradebookResponse.parse({
      overallPercent: Math.round(overall * 10) / 10,
      letterGrade,
      components: [
        {
          key: "coursework",
          label: "Coursework",
          weightPercent: COURSEWORK_WEIGHT,
          earnedPercent: Math.round(courseworkEarned * 10) / 10,
          detail: `Average ${Math.round(courseworkAvg)}% across ${coursework.length} assignments`,
        },
        {
          key: "diagnostics",
          label: "Diagnostic assessments",
          weightPercent: DIAGNOSTIC_WEIGHT,
          earnedPercent: Math.round(diagnosticsEarned * 10) / 10,
          detail: `${passedCount} of ${reasoning.length} assessments passed`,
        },
      ],
      coursework,
      reasoning,
    }),
  );
});

export default router;
