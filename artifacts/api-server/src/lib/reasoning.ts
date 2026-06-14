import { chatText, chatJson } from "./ai";
import { logger } from "./logger";
import {
  SUBJECT_FALLBACK,
  REASONING_FALLBACK,
  type Instrument,
  type FallbackMcq,
} from "./diagnosticContent";

// The response format chosen per attempt:
//   mc      = multiple-choice only
//   hybrid  = multiple-choice plus an optional short written note
//   written = brief open written responses
export type Format = "mc" | "hybrid" | "written";

// How many questions an attempt contains.
export type Length = "short" | "medium" | "long";

export type ItemType = "mcq" | "short_answer";

export type { Instrument } from "./diagnosticContent";

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
  instrument: Instrument;
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
}
interface ShortAnswerScoring {
  referenceAnswer: string;
  keyPoints?: string[];
}

// --- Scoring (mcq + short_answer) ----------------------------------------

function scoreGeneral(
  instrument: Instrument,
  items: DiagnosticItemRow[],
  responses: ResponseInput[],
  judged: Map<number, number>,
  written: Map<number, WrittenGrade>,
): ScoreSummary {
  const byItem = new Map(responses.map((r) => [r.itemId, r]));
  let credit = 0; // weighted (1 / 0.5 / 0)
  let fullyCorrect = 0; // count of fully-correct items, for the headline
  const total = items.length;
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
    } else {
      const grade = written.get(item.id) ?? {
        verdict: "incorrect" as WrittenVerdict,
        rationale: "No response.",
      };
      writtenByItem[item.id] = grade;
      const value = grade.verdict === "correct" ? 1 : grade.verdict === "partial" ? 0.5 : 0;
      credit += value;
      if (grade.verdict === "correct") fullyCorrect += 1;
    }
  }

  const percent = total > 0 ? Math.round((credit / total) * 100) : 0;
  const metrics: ReasoningMetric[] = [
    { label: "Overall", value: `${fullyCorrect} / ${total} (${percent}%)` },
  ];
  const headline = `You answered ${fullyCorrect} of ${total} correctly (${percent}%).`;
  return { instrument, headline, metrics, correctByItem, writtenByItem };
}

export function scoreAssessment(
  instrument: Instrument,
  items: DiagnosticItemRow[],
  responses: ResponseInput[],
  judged?: Map<number, number>,
  written?: Map<number, WrittenGrade>,
): ScoreSummary {
  return scoreGeneral(
    instrument,
    items,
    responses,
    judged ?? new Map(),
    written ?? new Map(),
  );
}

// Independently determine the genuinely correct option for each MCQ, using the
// model's own reasoning rather than trusting the stored answer key. The stored
// key is passed only as a fallible hint. Returns a map of item id -> correct
// option index; on any failure it falls back to the stored key per item.
//
// Only meaningful for GENERAL-REASONING MCQs, whose answers follow from the
// question itself. Subject-specific MCQs depend on the course's own lecture
// content (not generic knowledge), so those trust the generated key instead.
export async function judgeMcq(
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
        "You are an expert in reasoning, logic, and problem-solving. For each multiple-choice question, determine which single option is GENUINELY correct, reasoning carefully from the information in the question itself.",
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
    logger.warn({ err }, "judgeMcq failed; falling back to stored keys");
  }
  return result;
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
  instrument: Instrument,
  summary: ScoreSummary,
): string {
  const overall = summary.metrics.find((m) => m.label === "Overall");
  const scoreLine = overall?.value ? `You answered ${overall.value}. ` : "";
  if (instrument === "subject") {
    return `Thanks for taking this evolutionary-psychology check. ${scoreLine}Use it to see which ideas from the lectures are sticking and which ones are worth a second look. It's practice only and never affects your course grade.`;
  }
  return `Thanks for taking this reasoning check. ${scoreLine}It measures how you work through unfamiliar problems, not what you've memorized. It's practice only and never affects your course grade.`;
}

export async function generateFeedback(
  instrument: Instrument,
  assessmentTitle: string,
  summary: ScoreSummary,
): Promise<string> {
  const metricsText = summary.metrics
    .map((m) => `- ${m.label}: ${m.value}${m.detail ? ` (${m.detail})` : ""}`)
    .join("\n");
  const system =
    instrument === "subject"
      ? "You are an encouraging instructor giving warm, specific feedback on a student's evolutionary-psychology knowledge check. 2-3 sentences. Use only the metrics provided; do not invent numbers. Note that this is practice and never affects their course grade. Plain prose, no markdown headings."
      : "You are an encouraging instructor giving warm, specific feedback on a student's general-reasoning check (genuine reasoning, not memorization or fallacy-spotting). 2-3 sentences. Use only the metrics provided; do not invent numbers. Note that this is practice and never affects their course grade. Plain prose, no markdown headings.";
  const user = `Assessment: ${assessmentTitle}\nResult summary: ${summary.headline}\nMetrics:\n${metricsText}`;
  try {
    const text = await chatText(system, user);
    if (text && text.length > 20) return text;
  } catch {
    // fall through to deterministic feedback
  }
  return deterministicFeedback(instrument, summary);
}

// --- Attempt item generation --------------------------------------------
// Every attempt's items are generated fresh (so no question ever repeats). The
// caller passes the chosen format/length, the subject lecture context (for
// subject assessments), and the prompts already used by prior attempts so the
// generator can avoid repeats. On any failure we fall back to a static bank so
// an attempt is never blocked.

// Content of an item ready to be inserted (no id / attemptId / position yet).
export interface GeneratedItemContent {
  type: ItemType;
  prompt: string;
  payload: unknown;
  scoring: unknown;
}

function rotateOptions(options: string[]): { options: string[]; correctIndex: number } {
  const n = options.length;
  const off = Math.floor(Math.random() * n);
  const rotated = new Array<string>(n);
  for (let k = 0; k < n; k++) {
    rotated[(k + off) % n] = options[k]!;
  }
  return { options: rotated, correctIndex: off };
}

// How many questions to present for a chosen length.
function targetCount(length: Length): number {
  if (length === "short") return 4;
  if (length === "long") return 14;
  return 8;
}

interface GenParams {
  instrument: Instrument;
  count: number;
  subjectContext?: string;
  excludePrompts: string[];
}

const SUBJECT_MCQ_SYSTEM = [
  "You are an assessment author writing ORIGINAL multiple-choice questions that test a student's understanding of the evolutionary-psychology course material provided.",
  "Every question MUST be answerable from the provided material and measure understanding of its ideas (not obscure trivia). Each has exactly four answer options with one unambiguously best answer.",
  "List the CORRECT option FIRST, followed by three plausible but wrong distractors.",
  "Write the questions in plain, friendly language suitable for a general audience.",
  'Respond ONLY as JSON: {"items":[{"prompt":"...","options":["correct","wrong","wrong","wrong"]}]}.',
].join("\n");

const SUBJECT_WRITTEN_SYSTEM = [
  "You are an assessment author writing ORIGINAL short open-ended questions that test understanding of the evolutionary-psychology course material provided.",
  "Every question MUST be answerable from the provided material in ONE or TWO sentences and measure understanding (not recall of obscure detail).",
  "Provide a concise model answer and 1-3 key points a correct answer should contain.",
  "Write in plain, friendly language. Keep prompts short and concrete.",
  'Respond ONLY as JSON: {"items":[{"prompt":"...","referenceAnswer":"...","keyPoints":["..."]}]}.',
].join("\n");

const REASONING_MCQ_SYSTEM = [
  "You are an assessment author writing ORIGINAL general-reasoning multiple-choice questions that measure GENUINE reasoning: drawing valid conclusions from given information, working through multi-step logical or quantitative problems, recognizing structure and relationships, and reasoning carefully about novel everyday situations.",
  "Do NOT write 'critical thinking' questions about spotting logical fallacies, judging source credibility, media literacy, or being appropriately skeptical. Do NOT test recall, general knowledge, or course content. Every question must be fully solvable using only the information stated in the question.",
  "Each question has exactly four answer options with one unambiguously correct answer that follows by reasoning.",
  "List the CORRECT option FIRST, followed by three plausible but wrong distractors. Use varied, fresh scenarios.",
  'Respond ONLY as JSON: {"items":[{"prompt":"...","options":["correct","wrong","wrong","wrong"]}]}.',
].join("\n");

const REASONING_WRITTEN_SYSTEM = [
  "You are an assessment author writing ORIGINAL general-reasoning open-ended questions that measure GENUINE reasoning: drawing valid conclusions, working through multi-step problems, and reasoning carefully about novel situations.",
  "Do NOT write 'critical thinking' questions about logical fallacies, source credibility, media literacy, or skepticism. Do NOT test recall or general knowledge. Every question must be solvable using only the information stated, answerable in ONE or TWO sentences.",
  "Provide a concise model answer and 1-3 key points a correct answer should contain. Use varied, fresh scenarios.",
  'Respond ONLY as JSON: {"items":[{"prompt":"...","referenceAnswer":"...","keyPoints":["..."]}]}.',
].join("\n");

function buildUserPrompt(p: GenParams): string {
  const parts: string[] = [];
  if (p.instrument === "subject" && p.subjectContext) {
    parts.push(`COURSE MATERIAL (base every question on this):\n${p.subjectContext}`);
  }
  parts.push(`Write exactly ${p.count} questions.`);
  if (p.excludePrompts.length > 0) {
    parts.push(
      "Do NOT duplicate or paraphrase any of these already-used questions:\n" +
        JSON.stringify(p.excludePrompts.slice(-40)),
    );
  }
  return parts.join("\n\n");
}

async function generateMcqItems(
  p: GenParams,
  allowNote: boolean,
): Promise<GeneratedItemContent[]> {
  const system = p.instrument === "subject" ? SUBJECT_MCQ_SYSTEM : REASONING_MCQ_SYSTEM;
  const out = await chatJson<{
    items?: { prompt?: unknown; options?: unknown }[];
  }>(system, buildUserPrompt(p));
  const raw = out.items;
  if (!Array.isArray(raw) || raw.length < p.count) {
    throw new Error("mcq generation: too few items");
  }
  return raw.slice(0, p.count).map((q) => {
    const prompt = q.prompt;
    const options = q.options;
    if (typeof prompt !== "string" || prompt.trim().length < 8) {
      throw new Error("mcq generation: bad prompt");
    }
    if (
      !Array.isArray(options) ||
      options.length !== 4 ||
      !options.every((o) => typeof o === "string" && o.trim().length > 0)
    ) {
      throw new Error("mcq generation: bad options");
    }
    const { options: rotated, correctIndex } = rotateOptions(
      (options as string[]).map((o) => o.trim()),
    );
    return {
      type: "mcq" as const,
      prompt: prompt.trim(),
      payload: { options: rotated, allowNote },
      scoring: { correctIndex },
    };
  });
}

async function generateWrittenItems(p: GenParams): Promise<GeneratedItemContent[]> {
  const system =
    p.instrument === "subject" ? SUBJECT_WRITTEN_SYSTEM : REASONING_WRITTEN_SYSTEM;
  const out = await chatJson<{
    items?: { prompt?: unknown; referenceAnswer?: unknown; keyPoints?: unknown }[];
  }>(system, buildUserPrompt(p));
  const raw = out.items;
  if (!Array.isArray(raw) || raw.length < p.count) {
    throw new Error("written generation: too few items");
  }
  return raw.slice(0, p.count).map((q) => {
    const prompt = q.prompt;
    const reference = q.referenceAnswer;
    if (typeof prompt !== "string" || prompt.trim().length < 8) {
      throw new Error("written generation: bad prompt");
    }
    if (typeof reference !== "string" || reference.trim().length < 4) {
      throw new Error("written generation: bad reference answer");
    }
    const keyPoints = Array.isArray(q.keyPoints)
      ? q.keyPoints
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim())
      : undefined;
    return {
      type: "short_answer" as const,
      prompt: prompt.trim(),
      payload: {},
      scoring: {
        referenceAnswer: reference.trim(),
        keyPoints: keyPoints && keyPoints.length > 0 ? keyPoints : undefined,
      },
    };
  });
}

function bankFor(instrument: Instrument): FallbackMcq[] {
  return instrument === "subject" ? SUBJECT_FALLBACK : REASONING_FALLBACK;
}

function mcqFallback(
  instrument: Instrument,
  count: number,
  allowNote: boolean,
): GeneratedItemContent[] {
  const bank = bankFor(instrument);
  const out: GeneratedItemContent[] = [];
  for (let i = 0; i < count; i++) {
    const b = bank[i % bank.length]!;
    const { options, correctIndex } = rotateOptions(b.options);
    out.push({
      type: "mcq",
      prompt: b.prompt,
      payload: { options, allowNote },
      scoring: { correctIndex },
    });
  }
  return out;
}

function writtenFallback(instrument: Instrument, count: number): GeneratedItemContent[] {
  const bank = bankFor(instrument);
  const out: GeneratedItemContent[] = [];
  for (let i = 0; i < count; i++) {
    const b = bank[i % bank.length]!;
    out.push({
      type: "short_answer",
      prompt: `${b.prompt}\n\nAnswer in one or two sentences and briefly explain your reasoning.`,
      payload: {},
      scoring: { referenceAnswer: b.options[0]!, keyPoints: [b.options[0]!] },
    });
  }
  return out;
}

// Build the items a student attempts. Always returns exactly `count` usable
// items, generated fresh (falling back to the static bank on any failure).
export async function buildAttemptItems(params: {
  instrument: Instrument;
  format: Format;
  length: Length;
  subjectContext?: string;
  excludePrompts?: string[];
}): Promise<GeneratedItemContent[]> {
  const { instrument, format, length, subjectContext } = params;
  const count = targetCount(length);
  const gen: GenParams = {
    instrument,
    count,
    subjectContext,
    excludePrompts: params.excludePrompts ?? [],
  };

  if (format === "written") {
    try {
      const written = await generateWrittenItems(gen);
      if (written.length === count) return written;
    } catch (err) {
      logger.warn(
        { instrument, err: err instanceof Error ? err.message : String(err) },
        "written generation failed; using fallback bank",
      );
    }
    return writtenFallback(instrument, count);
  }

  const allowNote = format === "hybrid";
  try {
    const mcqs = await generateMcqItems(gen, allowNote);
    if (mcqs.length === count) return mcqs;
  } catch (err) {
    logger.warn(
      { instrument, err: err instanceof Error ? err.message : String(err) },
      "mcq generation failed; using fallback bank",
    );
  }
  return mcqFallback(instrument, count, allowNote);
}

// --- Review + public projection ------------------------------------------

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
        isCorrect: selectedIndex === null ? null : selectedIndex === correctIndex,
        note: typeof resp?.note === "string" && resp.note.trim() ? resp.note : null,
      };
    }
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
  return base;
}
