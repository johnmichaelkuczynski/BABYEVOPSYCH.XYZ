import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

// Key/value bookkeeping for the seeder. Stores the content version of the
// currently-seeded curriculum so that a republished build whose seed content
// changed can detect the mismatch on boot and re-seed automatically, instead
// of relying solely on the presence of a marker topic.
export const seedMetaTable = pgTable("seed_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  blurb: text("blurb"),
  position: integer("position").notNull().default(0),
});

export const lecturesTable = pgTable("lectures", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topicsTable.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  bodyMedium: text("body_medium"),
  bodyLong: text("body_long"),
  bodyCustom: text("body_custom"),
  customInstruction: text("custom_instruction"),
});

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // homework | test | midterm | final
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  position: integer("position").notNull().default(0),
  isTimed: boolean("is_timed").notNull().default(false),
  timeLimitMinutes: integer("time_limit_minutes"),
  instructions: text("instructions"),
});

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topicsTable.id),
  position: integer("position").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  hint: text("hint"),
});

export const attemptsTable = pgTable("attempts", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  scorePercent: doublePrecision("score_percent"),
});

export const answersTable = pgTable("answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => attemptsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problemsTable.id, { onDelete: "cascade" }),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  keystrokeCount: integer("keystroke_count").notNull().default(0),
  eraseCount: integer("erase_count").notNull().default(0),
  bulkInsertCount: integer("bulk_insert_count").notNull().default(0),
  longestBulkInsertChars: integer("longest_bulk_insert_chars").notNull().default(0),
  rewriteSegments: integer("rewrite_segments").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  aiScore: doublePrecision("ai_score"),
  aiFlagged: boolean("ai_flagged"),
  diachronicScore: doublePrecision("diachronic_score"),
  diachronicFlagged: boolean("diachronic_flagged"),
  detectionRationale: text("detection_rationale"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceSessionsTable = pgTable("practice_sessions", {
  id: serial("id").primaryKey(),
  weekNumber: integer("week_number"),
  topicId: integer("topic_id"),
  // When set, this session is an infinite practice version of a specific graded
  // assignment (homework/test/midterm/final) rather than open topic practice.
  assignmentId: integer("assignment_id").references(() => assignmentsTable.id, {
    onDelete: "cascade",
  }),
  mode: text("mode").notNull().default("topic"), // topic | assignment
  tutorEnabled: boolean("tutor_enabled").notNull().default(false),
  focusOnWeaknesses: boolean("focus_on_weaknesses").notNull().default(true),
  difficulty: doublePrecision("difficulty").notNull().default(2.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceProblemsTable = pgTable("practice_problems", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => practiceSessionsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceAttemptsTable = pgTable("practice_attempts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => practiceSessionsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => practiceProblemsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull(),
  answer: text("answer").notNull(),
  correct: boolean("correct").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  trace: jsonb("trace"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Diagnostic reasoning assessments (embedded program-level instruments).
// Two kinds — Subject-Specific (evolutionary psychology, generated from the
// course lecture content) and General Reasoning (genuine reasoning) — each
// offered at four phases (before the course, one-third through, two-thirds
// through, and after). Every attempt is freshly generated so no question is
// ever repeated, and diagnostics NEVER affect the course grade.
// ---------------------------------------------------------------------------

export const diagnosticAssessmentsTable = pgTable("diagnostic_assessments", {
  id: serial("id").primaryKey(),
  instrument: text("instrument").notNull(), // subject | reasoning
  phase: text("phase").notNull(), // before | during1 | during2 | after
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  instructions: text("instructions").notNull(),
  position: integer("position").notNull().default(0),
});

export const diagnosticItemsTable = pgTable("diagnostic_items", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id")
    .notNull()
    .references(() => diagnosticAssessmentsTable.id, { onDelete: "cascade" }),
  // Every item is freshly generated per attempt and tagged with that attempt's
  // id, so no question is ever shown twice. These cascade-delete with their
  // attempt. (No seeded "template" items exist any more.)
  attemptId: integer("attempt_id").references(
    () => diagnosticAttemptsTable.id,
    { onDelete: "cascade" },
  ),
  position: integer("position").notNull(),
  type: text("type").notNull(), // mcq | short_answer
  prompt: text("prompt").notNull(),
  // Public payload sent to the client: for mcq -> { options: string[] };
  // for short_answer -> {}.
  payload: jsonb("payload").notNull(),
  // Hidden scoring key, never sent to the client: for mcq -> { correctIndex };
  // for short_answer -> { referenceAnswer, keyPoints? }.
  scoring: jsonb("scoring").notNull(),
});

export const diagnosticAttemptsTable = pgTable("diagnostic_attempts", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id")
    .notNull()
    .references(() => diagnosticAssessmentsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  // The response format chosen for this attempt: mc | hybrid | written.
  format: text("format").notNull().default("mc"),
  // The length chosen for this attempt: short | medium | long (question count).
  length: text("length").notNull().default("medium"),
  passed: boolean("passed"),
  feedback: text("feedback"),
  responses: jsonb("responses"),
  scoreSummary: jsonb("score_summary"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

// Per-item responses for a submitted attempt. The full response set is also
// stored as JSON on the attempt for convenience, but this normalized table
// keeps one row per answered item so responses can be queried per item.
// Rows cascade-delete with their parent attempt (and with the item).
export const diagnosticResponsesTable = pgTable("diagnostic_responses", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => diagnosticAttemptsTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => diagnosticItemsTable.id, { onDelete: "cascade" }),
  selectedIndex: integer("selected_index"), // mcq — chosen option index
  answerText: text("answer_text"), // short_answer — the student's written response
  note: text("note"), // hybrid mcq — optional written justification
  isCorrect: boolean("is_correct"), // mcq/short_answer — judged correctness
});
