import { Link } from "wouter";
import {
  BarChart3,
  BookOpen,
  MessagesSquare,
  Target,
  ClipboardCheck,
  ShieldCheck,
  Search,
  LogIn,
  FileDown,
  FileText,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const features = [
  {
    icon: BookOpen,
    title: "Three-Depth Lessons",
    body: "Read any topic Short, Medium, or Long — same ideas, your pace.",
  },
  {
    icon: MessagesSquare,
    title: "Section-Scoped Tutor",
    body: "Ask about the exact passage you're on and get a live, grounded answer.",
  },
  {
    icon: Target,
    title: "Adaptive Practice",
    body: "Questions that get harder on a streak and ease off after a miss.",
  },
  {
    icon: ClipboardCheck,
    title: "AI-Graded Work",
    body: "Homework, a unit test, and a final — each with written feedback.",
  },
  {
    icon: ShieldCheck,
    title: "Built-In Integrity",
    body: "Every submission is screened for AI authorship, with a clear verdict.",
  },
  {
    icon: BarChart3,
    title: "One Unit, 6 Topics",
    body: "From why your mind has a history all the way to why we fight — and believe.",
  },
];

// The full curriculum, listed point-blank: every topic with the sections
// actually taught in its lecture (mirrors the seeded course content).
const curriculum = [
  {
    n: "TOPIC 1.1",
    title: "The mind has a history",
    sections: [
      "The brain is an organ with a job",
      "Not a blank slate",
      "Feelings are tools, not accidents",
      'Why "shaped over time"?',
      "In the real world",
    ],
  },
  {
    n: "TOPIC 1.2",
    title: "Built to survive",
    sections: [
      "Why sweet and fatty food tastes amazing",
      "Fearing the right things (and the wrong ones)",
      "Why certain places feel beautiful",
      "The mind can be a little out of date",
      "In the real world",
    ],
  },
  {
    n: "TOPIC 1.3",
    title: "The logic of attraction",
    sections: [
      "Beauty is really a bunch of clues",
      "Why faces matter so much",
      "It's not only looks",
      "Different clues for different jobs",
      "In the real world",
    ],
  },
  {
    n: "TOPIC 1.4",
    title: "Love, jealousy, and keeping a mate",
    sections: [
      "Love as glue",
      "Jealousy as an alarm",
      "Tools can misfire",
      "Strategies, not scripts",
      "In the real world",
    ],
  },
  {
    n: "TOPIC 1.5",
    title: "Why we cooperate",
    sections: [
      "Helping family first",
      'Taking turns: "I help you, you help me"',
      "Why fairness and gratitude feel so strong",
      "Friendship and status",
      "In the real world",
    ],
  },
  {
    n: "TOPIC 1.6",
    title: "Why we fight — and believe",
    sections: [
      "Us and them",
      "Status and conflict",
      "Where culture comes from",
      "Even religion?",
      "The biggest questions stay open",
      "In the real world",
    ],
  },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Search className="w-4 h-4" />
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight">
            Basic Evolutionary Psychology
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${basePath}/api/auth/google`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-secondary transition-colors"
            data-testid="link-landing-sign-in"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Google
          </a>
          <Link href="/dashboard">
            <button
              className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              data-testid="button-enter-course"
            >
              Enter course
            </button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-6">
            <BarChart3 className="w-3.5 h-3.5" />
            A complete ground-up introduction to evolutionary psychology
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary leading-tight mb-5">
            Your mind has a history. Start reading it.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            A self-paced course that teaches, tutors, drills, and grades you across
            a full six-topic unit — lessons at three depths, a section-scoped AI
            tutor, adaptive practice, and AI-graded homework, a unit test, and a
            final, all with built-in academic-integrity checks.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard">
              <button
                className="px-6 py-3 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                data-testid="button-cta-start"
              >
                Start the course
              </button>
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-card p-6 flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-primary">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="rounded-xl border border-border bg-card p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
              <div>
                <h2 className="font-serif font-semibold text-2xl mb-1">
                  Topics Covered in This Course
                </h2>
                <p className="text-muted-foreground">
                  Week 1 — one unit, six topics, from why your mind has a
                  history to why we fight and believe.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${basePath}/api/course/download.pdf`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  data-testid="link-download-pdf"
                >
                  <FileDown className="w-4 h-4" />
                  Download Course (PDF)
                </a>
                <a
                  href={`${basePath}/api/course/download.txt`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-secondary transition-colors"
                  data-testid="link-download-txt"
                >
                  <FileText className="w-4 h-4" />
                  TXT
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
              {curriculum.map((t) => (
                <div key={t.n}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                    {t.n}
                  </div>
                  <div className="font-semibold mb-3">{t.title}</div>
                  <ul className="space-y-2">
                    {t.sections.map((s) => (
                      <li
                        key={s}
                        className="text-sm text-muted-foreground leading-snug"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-border mt-10 pt-5 text-sm text-muted-foreground">
              The download includes the short version of every lecture plus
              practice homework and exam questions.
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        Basic Evolutionary Psychology — where the curriculum, the tutor, the grader, and the
        integrity check all live in one room.
      </footer>
    </div>
  );
}
