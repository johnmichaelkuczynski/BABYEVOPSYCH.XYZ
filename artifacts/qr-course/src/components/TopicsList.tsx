import { FileDown, FileText } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Plain topic titles — deliberately NO meta-markers (no "Unit 1", "Week 3",
// "Topic 1.2"). User mandate.
const TOPICS = [
  "The mind has a history",
  "Built to survive: cravings, fears, and beauty",
  "The logic of attraction",
  "Love, jealousy, and keeping a mate",
  "Why we cooperate",
  "Why we fight — and believe",
];

/**
 * Small, unobtrusive vertical topics list for the top-left of the Landing
 * page and the Dashboard, with course download links underneath.
 */
export function TopicsList() {
  return (
    <aside className="w-56 shrink-0 pt-6 pl-6 pr-4 hidden md:block">
      <h2 className="font-serif font-semibold text-base leading-snug mb-1">
        Topics Covered in This Course
      </h2>
      <p className="text-xs text-muted-foreground mb-3">6 topics</p>
      <ul className="space-y-2.5 mb-5">
        {TOPICS.map((t) => (
          <li
            key={t}
            className="text-xs text-muted-foreground leading-snug"
            data-testid={`text-topic-${TOPICS.indexOf(t)}`}
          >
            {t}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <a
          href={`${basePath}/api/course/download.pdf`}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          data-testid="link-download-pdf"
        >
          <FileDown className="w-3.5 h-3.5" />
          Download Course (PDF)
        </a>
        <a
          href={`${basePath}/api/course/download.txt`}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium border border-border hover:bg-secondary transition-colors"
          data-testid="link-download-txt"
        >
          <FileText className="w-3.5 h-3.5" />
          Download Course (TXT)
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
        Every lecture (short version) plus practice homework and exam
        questions.
      </p>
    </aside>
  );
}
