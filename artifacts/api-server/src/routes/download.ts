import { Router, type IRouter } from "express";
import { asc, eq, inArray } from "drizzle-orm";
import {
  db,
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
} from "@workspace/db";
import PDFDocument from "pdfkit";

const router: IRouter = Router();

const COURSE_TITLE = "Basic Evolutionary Psychology";

type CoursePack = {
  topics: Array<{
    code: string;
    title: string;
    lectureTitle: string;
    lectureBody: string;
  }>;
  assignments: Array<{
    kind: string;
    title: string;
    problems: Array<{ position: number; prompt: string }>;
  }>;
};

// Strip markdown decoration so the export reads as clean prose.
function plain(md: string): string {
  return md
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function buildCoursePack(): Promise<CoursePack> {
  const topics = await db
    .select()
    .from(topicsTable)
    .orderBy(asc(topicsTable.id));

  const lectures = await db
    .select()
    .from(lecturesTable)
    .orderBy(asc(lecturesTable.id));

  const lectureByTopic = new Map<number, (typeof lectures)[number]>();
  for (const l of lectures) {
    if (!lectureByTopic.has(l.topicId)) lectureByTopic.set(l.topicId, l);
  }

  const assignments = await db
    .select()
    .from(assignmentsTable)
    .orderBy(asc(assignmentsTable.id));

  // A few practice homeworks and exams: both homework sets, the unit test,
  // and the final — with a handful of problems each.
  const picked = [
    ...assignments.filter((a) => a.kind === "homework").slice(0, 2),
    ...assignments.filter((a) => a.kind === "test").slice(0, 1),
    ...assignments.filter((a) => a.kind === "final").slice(0, 1),
  ];

  const problems = picked.length
    ? await db
        .select()
        .from(problemsTable)
        .where(
          inArray(
            problemsTable.assignmentId,
            picked.map((a) => a.id),
          ),
        )
        .orderBy(asc(problemsTable.position))
    : [];

  return {
    topics: topics.map((t, i) => {
      const lec = lectureByTopic.get(t.id);
      return {
        code: `1.${i + 1}`,
        title: t.title,
        lectureTitle: lec?.title ?? t.title,
        lectureBody: plain(lec?.body ?? ""),
      };
    }),
    assignments: picked.map((a) => ({
      kind: a.kind,
      title: a.title,
      problems: problems
        .filter((p) => p.assignmentId === a.id)
        .slice(0, 6)
        .map((p) => ({ position: p.position, prompt: p.prompt })),
    })),
  };
}

function packToText(pack: CoursePack): string {
  const lines: string[] = [];
  lines.push(COURSE_TITLE.toUpperCase());
  lines.push("A complete ground-up introduction to evolutionary psychology");
  lines.push("");
  lines.push("TOPICS COVERED");
  for (const t of pack.topics) lines.push(`  ${t.code}  ${t.title}`);
  lines.push("");
  lines.push("=".repeat(72));
  lines.push("LECTURES (SHORT VERSIONS)");
  lines.push("=".repeat(72));
  for (const t of pack.topics) {
    lines.push("");
    lines.push(`TOPIC ${t.code} — ${t.lectureTitle}`);
    lines.push("-".repeat(72));
    lines.push(t.lectureBody);
  }
  lines.push("");
  lines.push("=".repeat(72));
  lines.push("PRACTICE HOMEWORK AND EXAMS (SAMPLE QUESTIONS)");
  lines.push("=".repeat(72));
  for (const a of pack.assignments) {
    lines.push("");
    lines.push(`${a.title} (${a.kind.toUpperCase()})`);
    lines.push("-".repeat(72));
    a.problems.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.prompt}`);
      lines.push("");
    });
  }
  lines.push("");
  lines.push(`© ${COURSE_TITLE} — https://babyevopsych.xyz/`);
  return lines.join("\n");
}

router.get("/course/download.txt", async (_req, res): Promise<void> => {
  const pack = await buildCoursePack();
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="basic-evolutionary-psychology-course.txt"',
  );
  res.send(packToText(pack));
});

router.get("/course/download.pdf", async (_req, res): Promise<void> => {
  const pack = await buildCoursePack();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="basic-evolutionary-psychology-course.pdf"',
  );

  const doc = new PDFDocument({ size: "LETTER", margin: 64 });
  doc.pipe(res);

  doc.font("Times-Bold").fontSize(24).text(COURSE_TITLE);
  doc.moveDown(0.3);
  doc
    .font("Times-Roman")
    .fontSize(12)
    .fillColor("#444444")
    .text("A complete ground-up introduction to evolutionary psychology");
  doc.moveDown(1.2);

  doc.fillColor("#000000").font("Times-Bold").fontSize(15).text("Topics Covered");
  doc.moveDown(0.4);
  doc.font("Times-Roman").fontSize(12);
  for (const t of pack.topics) {
    doc.text(`${t.code}   ${t.title}`);
  }

  for (const t of pack.topics) {
    doc.addPage();
    doc
      .font("Times-Bold")
      .fontSize(16)
      .text(`Topic ${t.code} — ${t.lectureTitle}`);
    doc.moveDown(0.6);
    doc.font("Times-Roman").fontSize(11.5);
    for (const para of t.lectureBody.split(/\n\n+/)) {
      doc.text(para.replace(/\n/g, " "), { lineGap: 2 });
      doc.moveDown(0.5);
    }
  }

  doc.addPage();
  doc
    .font("Times-Bold")
    .fontSize(16)
    .text("Practice Homework and Exams (Sample Questions)");
  doc.moveDown(0.6);
  for (const a of pack.assignments) {
    doc.font("Times-Bold").fontSize(13).text(`${a.title} (${a.kind})`);
    doc.moveDown(0.3);
    doc.font("Times-Roman").fontSize(11.5);
    a.problems.forEach((p, i) => {
      doc.text(`${i + 1}. ${p.prompt}`, { lineGap: 2 });
      doc.moveDown(0.35);
    });
    doc.moveDown(0.6);
  }

  doc
    .moveDown(1)
    .fontSize(10)
    .fillColor("#666666")
    .text(`© ${COURSE_TITLE} — https://babyevopsych.xyz/`);

  doc.end();
});

export default router;
