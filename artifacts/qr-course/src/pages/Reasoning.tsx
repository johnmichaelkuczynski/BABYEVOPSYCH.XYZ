import React from "react";
import { useListReasoningAssessments } from "@workspace/api-client-react";
import type { ReasoningAssessmentSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Lightbulb, Brain } from "lucide-react";

const PHASE_LABELS: Record<string, string> = {
  before: "Before you begin the course",
  during1: "Checkpoint — about one-third through",
  during2: "Checkpoint — about two-thirds through",
  after: "After finishing the course",
};

const PHASE_ORDER = ["before", "during1", "during2", "after"];

function statusBadge(status: string) {
  const cls =
    status === "passed"
      ? "bg-chart-2/15 text-chart-2"
      : status === "in_progress"
      ? "bg-chart-4/20 text-chart-4"
      : "bg-secondary text-secondary-foreground";
  const label =
    status === "passed" ? "completed" : status === "in_progress" ? "in progress" : "not started";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

function InstrumentCard({ a }: { a: ReasoningAssessmentSummary }) {
  const isSubject = a.instrument === "subject";
  const Icon = isSubject ? Brain : Lightbulb;
  return (
    <Card className="flex flex-col justify-between" data-testid={`card-reasoning-${a.id}`}>
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Icon className="w-3.5 h-3.5" />
            {isSubject ? "Subject knowledge" : "General reasoning"}
          </span>
          {statusBadge(a.status)}
        </div>
        <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {isSubject
            ? "Evolutionary-psychology questions drawn from the lectures. Pick a format and length — every attempt is freshly generated, so questions never repeat."
            : "Genuine reasoning questions you can solve by thinking carefully — no course knowledge needed. Pick a format and length; every attempt is freshly generated."}
        </p>
        <Link href={`/reasoning/${a.id}`}>
          <Button
            className="w-full"
            variant={a.status === "passed" ? "outline" : "default"}
            data-testid={`button-open-reasoning-${a.id}`}
          >
            {a.status === "passed" ? "Take again" : a.status === "in_progress" ? "Resume" : "Begin"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function Reasoning() {
  const { data: assessments, isLoading } = useListReasoningAssessments();

  const byPhase = (assessments ?? []).reduce((acc, a) => {
    (acc[a.phase] ||= []).push(a);
    return acc;
  }, {} as Record<string, ReasoningAssessmentSummary[]>);

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">
            Practice Diagnostics
          </h1>
          <p className="text-muted-foreground">
            Two kinds of self-check — Subject Knowledge and General Reasoning — offered
            before, during, and after the course. Choose a format and length each time;
            every attempt is freshly generated so a question never repeats. These are
            practice only and never affect your course grade.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {PHASE_ORDER.filter((p) => byPhase[p]?.length).map((phase) => (
              <div key={phase} className="flex flex-col gap-4">
                <h2 className="text-xl font-serif font-semibold border-b pb-2">
                  {PHASE_LABELS[phase] ?? phase}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {byPhase[phase]!
                    .slice()
                    .sort((x, y) => (x.instrument === "subject" ? -1 : 1) - (y.instrument === "subject" ? -1 : 1))
                    .map((a) => (
                      <InstrumentCard key={a.id} a={a} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
