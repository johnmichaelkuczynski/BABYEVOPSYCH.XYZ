// ---------------------------------------------------------------------------
// Content for the embedded diagnostic assessments.
//
// Two kinds of diagnostic, each offered at four phases of the course:
//   - Subject-Specific: evolutionary-psychology questions generated fresh from
//     the course's own lecture content (scoped to what's been covered so far).
//   - General Reasoning: genuine reasoning questions a student can solve by
//     thinking carefully — drawing valid conclusions, working multi-step
//     problems, recognizing structure. NOT "critical-thinking"/fallacy/source-
//     credibility/skepticism questions, and NOT recall.
//
// Phases: before (pre-course baseline), during1 (~one-third through),
// during2 (~two-thirds through), after (end of course).
//
// Diagnostics are PRACTICE: any test, any time, any order, unlimited retakes,
// freshly generated every attempt (so a question never repeats) and they NEVER
// affect the course grade.
//
// The seed below defines only the 8 assessment "shells" — no template items.
// Every attempt's items are generated at runtime. The fallback banks here are
// used only when AI generation is unavailable, so an attempt is never blocked.
// For every fallback MCQ the correct option is listed FIRST; it is rotated to a
// random index at attempt-build time.
// ---------------------------------------------------------------------------

export type Instrument = "subject" | "reasoning";

export type Phase = "before" | "during1" | "during2" | "after";

export type DiagnosticSeed = {
  instrument: Instrument;
  phase: Phase;
  title: string;
  subtitle: string;
  instructions: string;
};

// Bump this whenever the seed's structure/content changes so the seeder
// self-heals existing (dev) databases by replacing the old assessments.
export const DIAGNOSTIC_CONTENT_VERSION = "evopsych-subject-reasoning-2026-06-v1";

// Which course topics (by slug) a subject-specific assessment should draw from
// at each phase. before/after span the whole unit (so they're comparable);
// during1/during2 cover what a student has seen by one-third / two-thirds.
export const PHASE_TOPIC_SLUGS: Record<Phase, string[]> = {
  before: [
    "mind-has-history",
    "built-to-survive",
    "logic-of-attraction",
    "love-and-jealousy",
    "why-we-cooperate",
    "why-we-fight",
  ],
  during1: ["mind-has-history", "built-to-survive"],
  during2: [
    "mind-has-history",
    "built-to-survive",
    "logic-of-attraction",
    "love-and-jealousy",
  ],
  after: [
    "mind-has-history",
    "built-to-survive",
    "logic-of-attraction",
    "love-and-jealousy",
    "why-we-cooperate",
    "why-we-fight",
  ],
};

const SUBJECT_INSTRUCTIONS =
  "These questions are drawn from the course's evolutionary-psychology lectures. Choose a format (multiple choice, multiple choice plus a note, or short written answers) and a length, then answer at your own pace. Every attempt is freshly generated, so you'll never see the same question twice — retake it as often as you like. This is practice; it never affects your course grade.";

const REASONING_INSTRUCTIONS =
  "These are general-reasoning questions you can solve just by thinking carefully — no course knowledge or memorization needed. Choose a format and a length and work through them at your own pace. Every attempt is freshly generated, so questions never repeat — retake as often as you like. This is practice; it never affects your course grade.";

const PHASE_SUBTITLE: Record<Phase, string> = {
  before: "Before you begin the course",
  during1: "Checkpoint — about one-third through",
  during2: "Checkpoint — about two-thirds through",
  after: "After finishing the course",
};

const PHASE_TITLE_SUFFIX: Record<Phase, string> = {
  before: "Starting Point",
  during1: "Checkpoint 1",
  during2: "Checkpoint 2",
  after: "Final Check",
};

function buildSeed(): DiagnosticSeed[] {
  const phases: Phase[] = ["before", "during1", "during2", "after"];
  const seed: DiagnosticSeed[] = [];
  for (const phase of phases) {
    seed.push({
      instrument: "subject",
      phase,
      title: `Evolutionary Psychology — ${PHASE_TITLE_SUFFIX[phase]}`,
      subtitle: PHASE_SUBTITLE[phase],
      instructions: SUBJECT_INSTRUCTIONS,
    });
    seed.push({
      instrument: "reasoning",
      phase,
      title: `General Reasoning — ${PHASE_TITLE_SUFFIX[phase]}`,
      subtitle: PHASE_SUBTITLE[phase],
      instructions: REASONING_INSTRUCTIONS,
    });
  }
  return seed;
}

export const DIAGNOSTIC_SEED: DiagnosticSeed[] = buildSeed();

// ---------------------------------------------------------------------------
// Fallback question banks (used only when AI generation is unavailable).
// Correct option listed FIRST; rotated at attempt-build time.
// ---------------------------------------------------------------------------

export type FallbackMcq = {
  prompt: string;
  options: string[];
};

export const SUBJECT_FALLBACK: FallbackMcq[] = [
  {
    prompt:
      "The lectures describe the brain as best understood as which of the following?",
    options: [
      "An evolved body part with a job, shaped over many generations to help our ancestors survive",
      "A blank notebook that the surrounding world writes on entirely from scratch",
      "A computer that is identical in every person from the moment of birth",
      "A part of the body that has nothing to do with survival",
    ],
  },
  {
    prompt: "Why do sweet, fatty foods taste good to almost everyone?",
    options: [
      "Craving high-energy food helped our ancestors survive times when food was scarce",
      "Sugar has no effect on survival, so the preference is purely random",
      "People only like sugar because modern advertising teaches them to",
      "Fatty food was always abundant, so the craving carries no meaning",
    ],
  },
  {
    prompt:
      "Infants stopping at the edge of a 'visual cliff' even though no one taught them to fear heights is evidence that:",
    options: [
      "Some useful caution comes built in rather than being learned from experience",
      "Infants learn to fear heights only after falling many times",
      "Heights are not actually dangerous to infants",
      "Parents always teach their infants to avoid edges",
    ],
  },
  {
    prompt:
      "Why do people across many different cultures tend to find even, balanced faces attractive?",
    options: [
      "A balanced face can be a small clue that a body grew up healthy",
      "Balanced faces are considered beautiful only because television says so",
      "There is no real pattern; attraction is completely random",
      "Only one culture in the world prefers balanced faces",
    ],
  },
  {
    prompt: "According to the lectures, love and jealousy work together as:",
    options: [
      "A matched pair — love bonds partners together while jealousy guards that bond",
      "Two completely unrelated feelings that share no purpose",
      "Feelings invented entirely by modern culture",
      "Proof that human emotions have no evolutionary history",
    ],
  },
  {
    prompt:
      "The lectures say we are especially willing to help close relatives. The evolutionary reason is that:",
    options: [
      "Close relatives share many of our genes, so helping them helps those genes continue",
      "Relatives are the only people who can ever help us back",
      "Helping relatives has no connection to survival or genes",
      "We are taught by schools to prefer relatives over everyone else",
    ],
  },
];

export const REASONING_FALLBACK: FallbackMcq[] = [
  {
    prompt:
      "Every marble in a jar is either red or blue. Every red marble is heavy. Mara pulls out a marble that turns out to be light. What can you conclude about it?",
    options: [
      "It is blue",
      "It is red",
      "It is heavy",
      "Nothing can be concluded",
    ],
  },
  {
    prompt:
      "A train travels at a steady speed and covers 60 km in one hour. At the same speed, how far will it travel in two and a half hours?",
    options: ["150 km", "120 km", "90 km", "180 km"],
  },
  {
    prompt:
      "In a line, Sam is ahead of Tara, and Tara is ahead of Uma. Who is at the very back of the line?",
    options: ["Uma", "Sam", "Tara", "It cannot be determined"],
  },
  {
    prompt:
      "Suppose it is always true that 'whenever the alarm rings, the door is locked.' Right now the door is NOT locked. What follows?",
    options: [
      "The alarm is not ringing",
      "The alarm is ringing",
      "The door is locked after all",
      "Nothing follows",
    ],
  },
  {
    prompt:
      "Five friends share 20 apples equally. Then each friend eats 2 of their own apples. How many apples does each friend have left?",
    options: ["2", "4", "6", "3"],
  },
  {
    prompt:
      "A box is heavier than a bag, and the bag is heavier than a cup. Which statement must be true?",
    options: [
      "The box is heavier than the cup",
      "The cup is heavier than the box",
      "The bag is the heaviest of the three",
      "The box and the cup weigh the same",
    ],
  },
];
