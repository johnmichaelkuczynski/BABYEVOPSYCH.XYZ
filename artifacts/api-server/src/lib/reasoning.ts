import { chatText, chatJson } from "./ai";
import { logger } from "./logger";
import type { Stage, SkillArea } from "./diagnosticContent";

// The response format chosen per attempt:
//   mc      = multiple-choice only
//   hybrid  = multiple-choice plus an optional short written note
//   written = brief open written responses
export type Format = "mc" | "hybrid" | "written";

export type ItemType = "dilemma" | "mcq" | "short_answer";

// Shape of a persisted diagnostic item row (payload/scoring are jsonb).
export interface DiagnosticItemRow {
  id: number;
  position: number;
  type: ItemType;
  prompt: string;
  payload: unknown;
  scoring: unknown;
}

// One student response (matches ReasoningResponseInput in the OpenAPI spec).
export interface ResponseInput {
  itemId: number;
  selectedIndex?: number | null;
  text?: string | null;
  note?: string | null;
  decisionIndex?: number | null;
  ratings?: number[] | null;
  ranking?: number[] | null;
}

export interface ReasoningMetric {
  label: string;
  value: string;
  detail?: string | null;
}

export type WrittenVerdict = "correct" | "partial" | "incorrect";

export interface WrittenGrade {
  verdict: WrittenVerdict;
  rationale: string;
}

export interface ScoreSummary {
  instrument: "ethical" | "critical";
  headline: string;
  metrics: ReasoningMetric[];
  // For MCQ items: the model-judged correct option index per item id,
  // determined independently rather than from the stored answer key.
  // Persisted so a later review shows the same judged answers.
  correctByItem?: Record<number, number>;
  // For short_answer items: the grader's verdict + rationale per item id.
  // Persisted so a later review shows the same grades.
  writtenByItem?: Record<number, WrittenGrade>;
}

interface McqScoring {
  correctIndex: number;
  skillArea?: SkillArea;
}
interface ShortAnswerScoring {
  referenceAnswer: string;
  keyPoints?: string[];
  skillArea?: SkillArea;
}
interface DilemmaScoring {
  stages: Stage[];
  rankCount: number;
}
interface DilemmaPayload {
  decisionOptions: string[];
  considerations: string[];
  rankCount: number;
}

const SKILL_LABELS: Record<SkillArea, string> = {
  analysis: "Analysis",
  inference: "Inference",
  evaluation: "Evaluation",
  deduction: "Deduction",
  induction: "Induction",
};

// --- Generalized scoring (mcq + short_answer) -----------------------------
// Used for both instruments in the mc / hybrid / written formats. Dilemma
// (legacy rate-and-rank) items are scored separately by scoreEthical.

function scoreGeneral(
  instrument: "ethical" | "critical",
  items: DiagnosticItemRow[],
  responses: ResponseInput[],
  judged: Map<number, number>,
  written: Map<number, WrittenGrade>,
): ScoreSummary {
  const byItem = new Map(responses.map((r) => [r.itemId, r]));
  let credit = 0; // weighted (1 / 0.5 / 0)
  let fullyCorrect = 0; // count of fully-correct items, for the headline
  const total = items.length;
  const perSkill = new Map<SkillArea, { correct: number; total: number }>();
  const correctByItem: Record<number, number> = {};
  const writtenByItem: Record<number, WrittenGrade> = {};

  for (const item of items) {
    if (item.type === "mcq") {
      const scoring = item.scoring as McqScoring;
      const correctIndex = judged.get(item.id) ?? scoring.correctIndex;
      correctByItem[item.id] = correctIndex;
      const resp = byItem.get(item.id);
      const ok = !!resp && resp.selectedIndex === correctIndex;
      if (ok) {
        credit += 1;
        fullyCorrect += 1;
      }
      if (scoring.skillArea) {
        const bucket = perSkill.get(scoring.skillArea) ?? { correct: 0, total: 0 };
        bucket.total += 1;
        if (ok) bucket.correct += 1;
        perSkill.set(scoring.skillArea, bucket);
      }
    } else if (item.type === "short_answer") {
      const scoring = item.scoring as ShortAnswerScoring;
      const grade = written.get(item.id) ?? {
        verdict: "incorrect" as WrittenVerdict,
        rationale: "No response.",
      };
      writtenByItem[item.id] = grade;
      const value = grade.verdict === "correct" ? 1 : grade.verdict === "partial" ? 0.5 : 0;
      credit += value;
      if (grade.verdict === "correct") fullyCorrect += 1;
      if (scoring.skillArea) {
        const bucket = perSkill.get(scoring.skillArea) ?? { correct: 0, total: 0 };
        bucket.total += 1;
        if (grade.verdict === "correct") bucket.correct += 1;
        perSkill.set(scoring.skillArea, bucket);
      }
    }
  }

  const percent = total > 0 ? Math.round((credit / total) * 100) : 0;
  const metrics: ReasoningMetric[] = [
    { label: "Overall", value: `${fullyCorrect} / ${total} (${percent}%)` },
  ];
  for (const skill of Object.keys(SKILL_LABELS) as SkillArea[]) {
    const b = perSkill.get(skill);
    if (!b) continue;
    metrics.push({ label: SKILL_LABELS[skill], value: `${b.correct} / ${b.total}` });
  }

  const headline =
    instrument === "critical"
      ? `You answered ${fullyCorrect} of ${total} soundly (${percent}%).`
      : `Your reasoning was principled on ${fullyCorrect} of ${total} (${percent}%).`;

  return { instrument, headline, metrics, correctByItem, writtenByItem };
}

// Independently determine the genuinely correct option for each MCQ, using the
// model's own reasoning rather than trusting the stored answer key. The stored
// key is passed only as a fallible hint. Returns a map of item id -> correct
// option index; on any failure it falls back to the stored key per item.
export async function judgeCritical(
  items: DiagnosticItemRow[],
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  const mcq = items.filter((it) => it.type === "mcq");
  for (const it of mcq) {
    result.set(it.id, (it.scoring as McqScoring).correctIndex);
  }
  if (mcq.length === 0) return result;

  try {
    const out = await chatJson<{
      answers: { id: number; correctIndex: number }[];
    }>(
      [
        "You are an expert in critical reasoning, logic, and argument analysis. For each multiple-choice question, determine which single option is GENUINELY correct, reasoning from first principles.",
        "A `hint_index` is provided per question — it is the answer key currently stored in the system, but it MAY BE WRONG. Treat it only as a fallible hint; if your own analysis shows a different option is correct, return that index instead.",
        "Return exactly one 0-based option index per question id.",
        'Output strict JSON {"answers": [{"id": number, "correctIndex": number}]} with one entry for every question id provided.',
      ].join("\n"),
      JSON.stringify({
        questions: mcq.map((it) => ({
          id: it.id,
          question: it.prompt,
          options: (it.payload as { options: string[] }).options,
          hint_index: (it.scoring as McqScoring).correctIndex,
        })),
      }),
    );
    for (const a of out.answers ?? []) {
      const item = mcq.find((it) => it.id === a.id);
      if (!item) continue;
      const optCount = (item.payload as { options: string[] }).options.length;
      if (
        typeof a.correctIndex === "number" &&
        a.correctIndex >= 0 &&
        a.correctIndex < optCount
      ) {
        result.set(a.id, a.correctIndex);
      }
    }
  } catch (err) {
    logger.warn({ err }, "judgeCritical failed; falling back to stored keys");
  }
  return result;
}

// --- Ethical reasoning (DIT-style) scoring --------------------------------
// Principled-reasoning ("P") index: weight the ranked postconventional
// considerations. Top rank gets the most weight; P-index is the share of the
// maximum possible postconventional weight, scaled 0–100.

function scoreEthical(
  items: DiagnosticItemRow[],
  responses: ResponseInput[],
): ScoreSummary {
  const byItem = new Map(responses.map((r) => [r.itemId, r]));
  let pcWeight = 0;
  let maxWeight = 0;
  let mWeight = 0;
  let pWeight = 0;
  let xRankedHigh = false;
  let totalDilemmas = 0;
  let decided = 0;

  for (const item of items) {
    if (item.type !== "dilemma") continue;
    totalDilemmas += 1;
    const scoring = item.scoring as DilemmaScoring;
    const rankCount = scoring.rankCount;
    const stages = scoring.stages;
    const resp = byItem.get(item.id);

    if (resp && typeof resp.decisionIndex === "number") decided += 1;

    // Weights for the ranked slots: rankCount, rankCount-1, ... 1.
    for (let slot = 0; slot < rankCount; slot++) {
      maxWeight += rankCount - slot;
    }

    const ranking = (resp?.ranking ?? []).slice(0, rankCount);
    ranking.forEach((consIndex, slot) => {
      const weight = rankCount - slot;
      const stage = stages[consIndex];
      if (stage === "PC") pcWeight += weight;
      else if (stage === "M") mWeight += weight;
      else if (stage === "P") pWeight += weight;
      else if (stage === "X") xRankedHigh = true;
    });
  }

  const pIndex = maxWeight > 0 ? Math.round((pcWeight / maxWeight) * 100) : 0;
  const norms = maxWeight > 0 ? Math.round((mWeight / maxWeight) * 100) : 0;
  const personal = maxWeight > 0 ? Math.round((pWeight / maxWeight) * 100) : 0;

  const metrics: ReasoningMetric[] = [
    {
      label: "Principled-judgment index",
      value: `${pIndex} / 100`,
      detail: "Weight you gave to principle-based considerations when ranking.",
    },
    { label: "Maintaining-norms emphasis", value: `${norms}%` },
    { label: "Personal-interest emphasis", value: `${personal}%` },
    {
      label: "Scenarios decided",
      value: `${decided} / ${totalDilemmas}`,
    },
  ];
  if (xRankedHigh) {
    metrics.push({
      label: "Reliability check",
      value: "Review",
      detail:
        "A non-substantive consideration was ranked among your top items — read each consideration carefully.",
    });
  }

  return {
    instrument: "ethical",
    headline:
      pIndex >= 60
        ? `Your principled-judgment index is ${pIndex}/100 — you weighted principle-based considerations heavily.`
        : `Your principled-judgment index is ${pIndex}/100.`,
    metrics,
  };
}

export function scoreAssessment(
  instrument: "ethical" | "critical",
  items: DiagnosticItemRow[],
  responses: ResponseInput[],
  judged?: Map<number, number>,
  written?: Map<number, WrittenGrade>,
): ScoreSummary {
  // Legacy rate-and-rank dilemma attempts keep their original DIT-style scoring.
  if (items.some((it) => it.type === "dilemma")) {
    return scoreEthical(items, responses);
  }
  return scoreGeneral(
    instrument,
    items,
    responses,
    judged ?? new Map(),
    written ?? new Map(),
  );
}

// --- Written (short_answer) grading --------------------------------------
// Grade each open written response against its model answer/key points. Lenient
// by design: a brief answer that captures the core idea is correct. Empty
// answers are marked incorrect without calling the model; if the model is
// unavailable, non-empty answers default to correct so a submission never
// blocks.
export async function gradeWritten(
  items: DiagnosticItemRow[],
  responses: ResponseInput[],
): Promise<Map<number, WrittenGrade>> {
  const result = new Map<number, WrittenGrade>();
  const byItem = new Map(responses.map((r) => [r.itemId, r]));
  const shortItems = items.filter((it) => it.type === "short_answer");
  if (shortItems.length === 0) return result;

  const toGrade: {
    id: number;
    question: string;
    referenceAnswer: string;
    keyPoints: string[];
    studentAnswer: string;
  }[] = [];
  for (const it of shortItems) {
    const sc = it.scoring as ShortAnswerScoring;
    const text = (byItem.get(it.id)?.text ?? "").trim();
    if (text.length === 0) {
      result.set(it.id, { verdict: "incorrect", rationale: "No response was given." });
      continue;
    }
    toGrade.push({
      id: it.id,
      question: it.prompt,
      referenceAnswer: sc.referenceAnswer,
      keyPoints: sc.keyPoints ?? [],
      studentAnswer: text,
    });
  }
  if (toGrade.length === 0) return result;

  try {
    const out = await chatJson<{
      grades: { id: number; verdict: string; rationale?: string }[];
    }>(
      [
        "You are a fair, generous grader of brief written reasoning answers from busy students. For each answer, decide whether it captures the core idea of the model answer.",
        "Grade leniently: a short answer that gets the main point right is 'correct' even if it omits detail or is informally worded. Use 'partial' when the answer is on the right track but misses or muddles the key point. Use 'incorrect' only when it is clearly wrong, off-topic, or empty. Reward reasoning over keywords.",
        "Return a one-sentence rationale per answer.",
        'Output strict JSON {"grades":[{"id":number,"verdict":"correct"|"partial"|"incorrect","rationale":string}]} with one entry per id provided.',
      ].join("\n"),
      JSON.stringify({ answers: toGrade }),
    );
    for (const g of out.grades ?? []) {
      const item = toGrade.find((t) => t.id === g.id);
      if (!item) continue;
      const verdict: WrittenVerdict =
        g.verdict === "correct" || g.verdict === "partial" || g.verdict === "incorrect"
          ? g.verdict
          : "partial";
      result.set(g.id, {
        verdict,
        rationale:
          typeof g.rationale === "string" && g.rationale.trim().length > 0
            ? g.rationale.trim()
            : "Graded.",
      });
    }
  } catch (err) {
    logger.warn({ err }, "gradeWritten failed; defaulting non-empty answers to correct");
  }
  // Any answered item the model did not return a grade for defaults to correct
  // (lenient) so a submission is never blocked by a grading hiccup.
  for (const t of toGrade) {
    if (!result.has(t.id)) {
      result.set(t.id, { verdict: "correct", rationale: "Answer accepted." });
    }
  }
  return result;
}

// --- Written feedback (AI with deterministic fallback) --------------------

function deterministicFeedback(
  instrument: "ethical" | "critical",
  summary: ScoreSummary,
): string {
  if (instrument === "critical") {
    const overall = summary.metrics.find((m) => m.label === "Overall");
    const weak = summary.metrics
      .filter((m) => m.label !== "Overall")
      .filter((m) => {
        const [c, t] = m.value.split(" / ").map((n) => parseInt(n, 10));
        return Number.isFinite(c) && Number.isFinite(t) && t > 0 && c / t < 0.5;
      })
      .map((m) => m.label);
    const weakLine =
      weak.length > 0
        ? ` Your strongest opportunity for growth is in ${weak.join(", ")}; revisit how to spot assumptions and what conclusions the evidence actually licenses.`
        : " Your reasoning was solid across the analysis, inference, evaluation, deduction, and induction items.";
    return `Thank you for completing this critical-reasoning checkpoint. ${overall?.value ? `You scored ${overall.value}.` : ""}${weakLine} Remember that a strong answer follows only from the reasons given — distinguish what is stated, what is assumed, and what is merely plausible.`;
  }
  const overall = summary.metrics.find((m) => m.label === "Overall");
  const p = summary.metrics.find((m) => m.label.startsWith("Principled"));
  if (p) {
    // Legacy rate-and-rank attempt.
    return `Thank you for working through this everyday-judgment scenario. Your principled-judgment index was ${p.value}. A high index means you gave the most weight to considerations about honesty, fairness, and the people affected by your choice rather than to convenience or self-interest. There is no single correct answer here — what matters is whether your decision rests on reasons you could defend to anyone affected by it.`;
  }
  return `Thank you for working through this everyday-judgment scenario. ${overall?.value ? `You reasoned soundly on ${overall.value} of the prompts. ` : ""}What matters most is whether your choice rests on reasons you could defend to anyone affected by it — honesty, fairness, and the people involved — rather than convenience or self-interest.`;
}

export async function generateFeedback(
  instrument: "ethical" | "critical",
  assessmentTitle: string,
  summary: ScoreSummary,
): Promise<string> {
  const metricsText = summary.metrics
    .map((m) => `- ${m.label}: ${m.value}${m.detail ? ` (${m.detail})` : ""}`)
    .join("\n");
  const system =
    instrument === "ethical"
      ? "You are an instructor giving warm, specific feedback on a student's professional-judgment assessment about a realistic everyday-judgment scenario. 2-3 sentences. Comment on how principled their reasoning was and offer one concrete way to deepen it. Do not invent numbers; use only the metrics provided. Plain prose, no markdown headings."
      : "You are a critical-thinking instructor giving warm, specific feedback on a student's reasoning assessment. 2-3 sentences. Note overall performance and any skill areas to strengthen, using only the metrics provided. Plain prose, no markdown headings.";
  const user = `Assessment: ${assessmentTitle}\nResult summary: ${summary.headline}\nMetrics:\n${metricsText}`;
  try {
    const text = await chatText(system, user);
    if (text && text.length > 20) return text;
  } catch {
    // fall through to deterministic feedback
  }
  return deterministicFeedback(instrument, summary);
}

// --- Retake variant generation ------------------------------------------
// On a retake we generate a fresh set of items of the SAME KIND as the seeded
// template: same instrument, same item count, the same skill areas (critical)
// or the same distribution of consideration stages (ethical), and the same
// answer/ranking structure — but different scenarios and questions. If the
// model is unavailable or returns an unusable shape, we fall back to the
// template items so a retake never blocks.

// Content of an item ready to be inserted (no id / attemptId / position yet).
export interface GeneratedItemContent {
  type: ItemType;
  prompt: string;
  payload: unknown;
  scoring: unknown;
}

const STAGE_SET: Stage[] = ["P", "M", "PC", "X"];

function rotateOptions(options: string[]): { options: string[]; correctIndex: number } {
  const n = options.length;
  const off = Math.floor(Math.random() * n);
  const rotated = new Array<string>(n);
  for (let k = 0; k < n; k++) {
    rotated[(k + off) % n] = options[k]!;
  }
  return { options: rotated, correctIndex: off };
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// Return the template items as insertable content (used as the fallback when
// generation fails, and as the structural blueprint for generation).
function templateContent(items: DiagnosticItemRow[]): GeneratedItemContent[] {
  return items.map((it) => ({
    type: it.type,
    prompt: it.prompt,
    payload: it.payload,
    scoring: it.scoring,
  }));
}

async function generateCriticalVariant(
  items: DiagnosticItemRow[],
): Promise<GeneratedItemContent[]> {
  // Preserve the exact sequence of skill areas from the template.
  const skills = items.map((it) => (it.scoring as McqScoring).skillArea);
  const examplePrompts = items.slice(0, 3).map((it) => it.prompt);
  const system =
    "You are an assessment author writing ORIGINAL critical-thinking multiple-choice questions. " +
    "Each question must measure reasoning (not recall), have exactly four answer options with one unambiguously best answer, and target the requested skill area. " +
    "List the CORRECT option FIRST, followed by three plausible but wrong distractors. " +
    "Write fresh questions on varied everyday topics — do NOT reuse the example wording. " +
    'Respond ONLY as JSON of the form {"items":[{"prompt":"...","options":["correct","wrong","wrong","wrong"],"skillArea":"analysis"}]}.';
  const user =
    `Write ${skills.length} new questions, one per skill area in THIS exact order: ${JSON.stringify(skills)}.\n` +
    `Skill areas mean: analysis (identify assumptions/claims/conclusions), inference (what the evidence supports), evaluation (judge argument quality/sources), deduction (what necessarily follows), induction (strength of generalization/causal/analogy).\n` +
    `For style only (do NOT copy these): ${JSON.stringify(examplePrompts)}.`;
  const out = await chatJson<{
    items?: { prompt?: unknown; options?: unknown; skillArea?: unknown }[];
  }>(system, user);
  const raw = out.items;
  if (!Array.isArray(raw) || raw.length !== skills.length) {
    throw new Error("critical variant: wrong item count");
  }
  return raw.map((q, i) => {
    const expectedSkill = skills[i]!;
    const prompt = q.prompt;
    const options = q.options;
    if (typeof prompt !== "string" || prompt.trim().length < 8) {
      throw new Error("critical variant: bad prompt");
    }
    if (
      !Array.isArray(options) ||
      options.length !== 4 ||
      !options.every((o) => typeof o === "string" && o.trim().length > 0)
    ) {
      throw new Error("critical variant: bad options");
    }
    // Always pin the skill to the template position so the retake preserves
    // the exact skill-area order — never trust the model to keep it.
    const { options: rotated, correctIndex } = rotateOptions(options as string[]);
    return {
      type: "mcq" as const,
      prompt: prompt.trim(),
      payload: { options: rotated },
      scoring: { correctIndex, skillArea: expectedSkill },
    };
  });
}

async function generateEthicalVariant(
  items: DiagnosticItemRow[],
): Promise<GeneratedItemContent[]> {
  const dilemma = items.find((it) => it.type === "dilemma");
  if (!dilemma) throw new Error("ethical variant: no template dilemma");
  const scoring = dilemma.scoring as DilemmaScoring;
  const payload = dilemma.payload as DilemmaPayload;
  // Shuffle the stage order so the new item maps stages to different slots.
  const stages = shuffle(scoring.stages);
  const considerationCount = stages.length;
  const decisionCount = payload.decisionOptions.length;
  const system =
    "You are an assessment author writing an ORIGINAL everyday-judgment scenario. " +
    "Produce a realistic, self-contained scenario about a named person (e.g. a student, a friend, a teammate) facing a hard decision where legitimate considerations conflict — think honesty, fairness, loyalty, privacy, peer pressure, or owning up to a mistake. Then write a set of considerations someone might weigh. " +
    "Each consideration is tagged with a hidden stage you must honor:\n" +
    "- P = appeals to the decider's personal interest, image, convenience, or job security\n" +
    "- M = appeals to company policy, rules, a manager's request, or one's formal role (maintaining norms)\n" +
    "- PC = appeals to impartial principles: honesty, fairness, and the rights and interests of everyone affected by the decision (principled)\n" +
    "- X = a nonsensical or irrelevant statement that sounds sophisticated but says nothing (a reliability check)\n" +
    "Write a DISTINCT scenario from any example. " +
    'Respond ONLY as JSON: {"prompt":"scenario text ending with the yes/no decision question","decisionOptions":["do X","Can\'t decide","do opposite"],"considerations":[{"text":"...","stage":"PC"}]}.';
  const user =
    `Write ONE new scenario with exactly ${decisionCount} decision options (the middle one should be "Can't decide") ` +
    `and exactly ${considerationCount} considerations whose stages, IN THIS ORDER, are: ${JSON.stringify(stages)}.\n` +
    `Each consideration's "stage" must match the stage at its position. Make each consideration a single clause a person might weigh.\n` +
    `For style only (do NOT copy it): ${JSON.stringify(dilemma.prompt.slice(0, 200))}`;
  const out = await chatJson<{
    prompt?: unknown;
    decisionOptions?: unknown;
    considerations?: { text?: unknown; stage?: unknown }[];
  }>(system, user);
  const prompt = out.prompt;
  const decisionOptions = out.decisionOptions;
  const cons = out.considerations;
  if (typeof prompt !== "string" || prompt.trim().length < 40) {
    throw new Error("ethical variant: bad prompt");
  }
  if (
    !Array.isArray(decisionOptions) ||
    decisionOptions.length !== decisionCount ||
    !decisionOptions.every((o) => typeof o === "string" && o.trim().length > 0)
  ) {
    throw new Error("ethical variant: bad decisionOptions");
  }
  if (!Array.isArray(cons) || cons.length !== considerationCount) {
    throw new Error("ethical variant: wrong consideration count");
  }
  const texts: string[] = [];
  const outStages: Stage[] = [];
  cons.forEach((c, i) => {
    const text = c.text;
    if (typeof text !== "string" || text.trim().length < 4) {
      throw new Error("ethical variant: bad consideration text");
    }
    // Trust the requested stage order; honor the model's only if valid & equal.
    const stage = STAGE_SET.includes(c.stage as Stage)
      ? (c.stage as Stage)
      : stages[i]!;
    texts.push(text.trim());
    outStages.push(stage);
  });
  // Guarantee the stage multiset is preserved even if the model relabeled some.
  const want = [...stages].sort().join(",");
  const got = [...outStages].sort().join(",");
  const finalStages = want === got ? outStages : stages;
  return [
    {
      type: "dilemma",
      prompt: prompt.trim(),
      payload: {
        decisionOptions: decisionOptions.map((o) => (o as string).trim()),
        considerations: texts,
        rankCount: scoring.rankCount,
      },
      scoring: { stages: finalStages, rankCount: scoring.rankCount },
    },
  ];
}

// Generate a fresh variant of an assessment's items for a retake. Falls back to
// the template items (so the attempt is never blocked) if generation fails.
export async function generateVariantItems(
  instrument: "ethical" | "critical",
  templateItems: DiagnosticItemRow[],
): Promise<GeneratedItemContent[]> {
  if (templateItems.length === 0) return [];
  try {
    const generated =
      instrument === "critical"
        ? await generateCriticalVariant(templateItems)
        : await generateEthicalVariant(templateItems);
    if (generated.length === templateItems.length) return generated;
    logger.warn(
      { instrument, want: templateItems.length, got: generated.length },
      "Reasoning variant: count mismatch, using template",
    );
  } catch (err) {
    logger.warn(
      { instrument, err: err instanceof Error ? err.message : String(err) },
      "Reasoning variant generation failed, using template items",
    );
  }
  return templateContent(templateItems);
}

// --- Format-aware attempt items -----------------------------------------
// The generators above produce the "question bank" (critical MCQs, an ethical
// dilemma). buildAttemptItems transforms that bank into the items the student
// actually sees for the chosen response format:
//   mc      — multiple choice only
//   hybrid  — multiple choice plus an optional written note
//   written — brief open written answers

function withAllowNote(item: GeneratedItemContent, allowNote: boolean): GeneratedItemContent {
  const payload = (item.payload ?? {}) as Record<string, unknown>;
  return { ...item, payload: { ...payload, allowNote } };
}

// From a generated dilemma, build one principle-identification MCQ: the student
// picks the consideration that is the strongest, most principled basis for the
// decision. The principled (PC) consideration is correct; one each of the
// personal-interest (P), norms (M), and reliability-check (X) considerations
// serve as distractors. This is well-grounded in the stage tags (unlike the
// raw yes/no decision, which has no stored "correct" side).
function buildPrincipleMcq(dilemma: GeneratedItemContent): GeneratedItemContent {
  const payload = dilemma.payload as DilemmaPayload;
  const scoring = dilemma.scoring as DilemmaScoring;
  const cons = payload.considerations;
  const stages = scoring.stages;
  const firstOf = (s: Stage): string | undefined => {
    const i = stages.findIndex((st) => st === s);
    return i >= 0 ? cons[i] : undefined;
  };
  const correctText = firstOf("PC") ?? cons[0]!;
  const distractors = (["M", "P", "X"] as Stage[])
    .map(firstOf)
    .filter((t): t is string => !!t && t !== correctText);
  let pool = [correctText, ...distractors];
  // Pad from any remaining considerations if a stage was missing.
  for (const c of cons) {
    if (pool.length >= 4) break;
    if (!pool.includes(c)) pool.push(c);
  }
  pool = pool.slice(0, 4);
  const options = shuffle(pool);
  const correctIndex = options.indexOf(correctText);
  return {
    type: "mcq",
    prompt: `${dilemma.prompt}\n\nWhich consideration is the strongest, most principled basis for deciding what to do?`,
    payload: { options, allowNote: false },
    scoring: { correctIndex },
  };
}

// From a generated dilemma, build one open written prompt: state the decision
// and the main reason. The principled considerations are the model answer's key
// points; the grader judges leniently for principled reasoning.
function buildEthicalWritten(dilemma: GeneratedItemContent): GeneratedItemContent {
  const payload = dilemma.payload as DilemmaPayload;
  const scoring = dilemma.scoring as DilemmaScoring;
  const keyPoints = payload.considerations.filter((_, i) => scoring.stages[i] === "PC");
  return {
    type: "short_answer",
    prompt: `${dilemma.prompt}\n\nIn a sentence or two: what should they do, and what is the main reason?`,
    payload: {},
    scoring: {
      referenceAnswer:
        "A defensible choice justified by impartial principles — honesty, fairness, and the interests of everyone affected — rather than convenience, self-interest, or simply following a rule.",
      keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
    },
  };
}

// Transform template critical MCQs into open written items as a fallback when
// dedicated written-question generation is unavailable.
function criticalWrittenFallback(items: DiagnosticItemRow[]): GeneratedItemContent[] {
  return items
    .filter((it) => it.type === "mcq")
    .map((it) => {
      const payload = it.payload as { options: string[] };
      const scoring = it.scoring as McqScoring;
      const reference = payload.options[scoring.correctIndex] ?? payload.options[0]!;
      return {
        type: "short_answer" as const,
        prompt: `${it.prompt}\n\nAnswer in one or two sentences and briefly explain your reasoning.`,
        payload: {},
        scoring: {
          referenceAnswer: reference,
          keyPoints: [reference],
          skillArea: scoring.skillArea,
        },
      };
    });
}

// Generate original open-ended critical-reasoning questions (one per template
// skill area) with a short model answer and key points for grading.
async function generateCriticalWritten(
  items: DiagnosticItemRow[],
): Promise<GeneratedItemContent[]> {
  const skills = items.map((it) => (it.scoring as McqScoring).skillArea);
  const system =
    "You are an assessment author writing ORIGINAL open-ended critical-thinking questions for busy students. " +
    "Each question must measure reasoning (not recall), target the requested skill area, and be answerable in ONE or TWO sentences. " +
    "Provide a concise model answer and 1-3 key points a correct answer should contain. " +
    "Write fresh questions on varied everyday topics. " +
    'Respond ONLY as JSON: {"items":[{"prompt":"...","referenceAnswer":"...","keyPoints":["..."],"skillArea":"analysis"}]}.';
  const user =
    `Write ${skills.length} questions, one per skill area in THIS exact order: ${JSON.stringify(skills)}.\n` +
    `Skill areas mean: analysis (identify assumptions/claims/conclusions), inference (what the evidence supports), evaluation (judge argument quality/sources), deduction (what necessarily follows), induction (strength of generalization/causal/analogy).\n` +
    `Keep prompts short and concrete.`;
  const out = await chatJson<{
    items?: { prompt?: unknown; referenceAnswer?: unknown; keyPoints?: unknown; skillArea?: unknown }[];
  }>(system, user);
  const raw = out.items;
  if (!Array.isArray(raw) || raw.length !== skills.length) {
    throw new Error("critical written: wrong item count");
  }
  return raw.map((q, i) => {
    const prompt = q.prompt;
    const reference = q.referenceAnswer;
    if (typeof prompt !== "string" || prompt.trim().length < 8) {
      throw new Error("critical written: bad prompt");
    }
    if (typeof reference !== "string" || reference.trim().length < 4) {
      throw new Error("critical written: bad reference answer");
    }
    const keyPoints = Array.isArray(q.keyPoints)
      ? q.keyPoints.filter((k): k is string => typeof k === "string" && k.trim().length > 0).map((k) => k.trim())
      : undefined;
    return {
      type: "short_answer" as const,
      prompt: prompt.trim(),
      payload: {},
      scoring: {
        referenceAnswer: reference.trim(),
        keyPoints: keyPoints && keyPoints.length > 0 ? keyPoints : undefined,
        skillArea: skills[i]!,
      },
    };
  });
}

// Build the items a student attempts, given the chosen response format. Always
// returns usable items (falls back to the template/bank on any failure).
export async function buildAttemptItems(
  instrument: "ethical" | "critical",
  format: Format,
  templateItems: DiagnosticItemRow[],
): Promise<GeneratedItemContent[]> {
  if (templateItems.length === 0) return [];

  if (instrument === "critical") {
    if (format === "written") {
      try {
        const written = await generateCriticalWritten(templateItems);
        if (written.length === templateItems.length) return written;
        logger.warn(
          { want: templateItems.length, got: written.length },
          "critical written: count mismatch, using fallback",
        );
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "critical written generation failed, using fallback",
        );
      }
      return criticalWrittenFallback(templateItems);
    }
    const mcqs = await generateVariantItems("critical", templateItems);
    return mcqs.map((it) => withAllowNote(it, format === "hybrid"));
  }

  // Ethical: generate a fresh dilemma "bank" item, then present per format.
  const dilemmaItems = await generateVariantItems("ethical", templateItems);
  const dilemmas = dilemmaItems.filter((it) => it.type === "dilemma");
  if (dilemmas.length === 0) return templateContent(templateItems);
  return dilemmas.map((d) =>
    format === "written" ? buildEthicalWritten(d) : withAllowNote(buildPrincipleMcq(d), format === "hybrid"),
  );
}

// A per-question review row: the item, what the student answered, and the
// correct answer. Built after submission so the student can see their work.
export interface ReviewItem {
  itemId: number;
  type: ItemType;
  prompt: string;
  options: string[] | null;
  selectedIndex: number | null;
  correctIndex: number | null;
  isCorrect: boolean | null;
  note: string | null;
  text: string | null;
  referenceAnswer: string | null;
  verdict: WrittenVerdict | null;
  rationale: string | null;
  decisionOptions: string[] | null;
  decisionIndex: number | null;
  considerations: string[] | null;
  ranking: number[] | null;
}

const EMPTY_REVIEW = {
  options: null,
  selectedIndex: null,
  correctIndex: null,
  isCorrect: null,
  note: null,
  text: null,
  referenceAnswer: null,
  verdict: null,
  rationale: null,
  decisionOptions: null,
  decisionIndex: null,
  considerations: null,
  ranking: null,
} satisfies Omit<ReviewItem, "itemId" | "type" | "prompt">;

export function buildReview(
  items: DiagnosticItemRow[],
  responses: ResponseInput[],
  judged?: Map<number, number>,
  written?: Map<number, WrittenGrade>,
): ReviewItem[] {
  const byItem = new Map(responses.map((r) => [r.itemId, r]));
  return items.map((item) => {
    const resp = byItem.get(item.id);
    if (item.type === "mcq") {
      const payload = item.payload as { options: string[] };
      const scoring = item.scoring as McqScoring;
      // The correct option is the model-judged one; fall back to stored key.
      const correctIndex = judged?.get(item.id) ?? scoring.correctIndex;
      const selectedIndex =
        typeof resp?.selectedIndex === "number" ? resp.selectedIndex : null;
      return {
        ...EMPTY_REVIEW,
        itemId: item.id,
        type: "mcq" as const,
        prompt: item.prompt,
        options: payload.options,
        selectedIndex,
        correctIndex,
        isCorrect:
          selectedIndex === null ? null : selectedIndex === correctIndex,
        note: typeof resp?.note === "string" && resp.note.trim() ? resp.note : null,
      };
    }
    if (item.type === "short_answer") {
      const scoring = item.scoring as ShortAnswerScoring;
      const grade = written?.get(item.id);
      return {
        ...EMPTY_REVIEW,
        itemId: item.id,
        type: "short_answer" as const,
        prompt: item.prompt,
        text: typeof resp?.text === "string" && resp.text.trim() ? resp.text : null,
        referenceAnswer: scoring.referenceAnswer,
        verdict: grade?.verdict ?? null,
        rationale: grade?.rationale ?? null,
        isCorrect: grade ? grade.verdict === "correct" : null,
      };
    }
    const payload = item.payload as DilemmaPayload;
    return {
      ...EMPTY_REVIEW,
      itemId: item.id,
      type: "dilemma" as const,
      prompt: item.prompt,
      decisionOptions: payload.decisionOptions,
      decisionIndex:
        typeof resp?.decisionIndex === "number" ? resp.decisionIndex : null,
      considerations: payload.considerations,
      ranking: resp?.ranking ?? null,
    };
  });
}

// Strip the hidden scoring key before sending an item to the client.
export function publicItem(item: DiagnosticItemRow) {
  const base = {
    id: item.id,
    position: item.position,
    type: item.type,
    prompt: item.prompt,
  };
  if (item.type === "mcq") {
    const payload = item.payload as { options: string[]; allowNote?: boolean };
    return { ...base, options: payload.options, allowNote: payload.allowNote ?? false };
  }
  if (item.type === "short_answer") {
    return base;
  }
  const payload = item.payload as DilemmaPayload;
  return {
    ...base,
    decisionOptions: payload.decisionOptions,
    considerations: payload.considerations,
    rankCount: payload.rankCount,
  };
}
