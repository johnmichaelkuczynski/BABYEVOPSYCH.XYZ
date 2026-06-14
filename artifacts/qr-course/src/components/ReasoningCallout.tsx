import React from "react";
import { useListReasoningAssessments } from "@workspace/api-client-react";
import type { ReasoningAssessmentSummary } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Lightbulb, Brain, CheckCircle2 } from "lucide-react";

type Phase = "before" | "during1" | "during2" | "after";

const HEADINGS: Record<Phase, string> = {
  before: "Start here: try a practice diagnostic",
  during1: "Checkpoint: a practice diagnostic at one-third",
  during2: "Checkpoint: a practice diagnostic at two-thirds",
  after: "Finish up: take a practice diagnostic",
};

const BLURBS: Record<Phase, string> = {
  before:
    "Try a subject or reasoning self-check before you begin so you can see how you grow. It's practice only — it never affects your grade.",
  during1:
    "Check how the early lectures are landing with a quick self-check. Practice only — it never affects your grade.",
  during2:
    "See how the material is sticking with a quick self-check. Practice only — it never affects your grade.",
  after:
    "Take a self-check one last time to see your end-of-course growth. Practice only — it never affects your grade.",
};

function Row({ a }: { a: ReasoningAssessmentSummary }) {
  const isSubject = a.instrument === "subject";
  const Icon = isSubject ? Brain : Lightbulb;
  const passed = a.status === "passed";
  return (
    <Link href={`/reasoning/${a.id}`}>
      <div
        className="flex items-center justify-between gap-4 p-3 rounded-md border border-border bg-background hover:bg-secondary/50 cursor-pointer"
        data-testid={`callout-reasoning-${a.id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">
            {isSubject ? "Subject knowledge" : "General reasoning"}
          </span>
        </div>
        {passed ? (
          <span className="inline-flex items-center gap-1 text-xs text-chart-2 font-medium shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        ) : (
          <Button size="sm" variant="default" className="shrink-0">
            {a.status === "in_progress" ? "Resume" : "Begin"}
          </Button>
        )}
      </div>
    </Link>
  );
}

export function ReasoningCallout({ phase }: { phase: Phase }) {
  const { data } = useListReasoningAssessments();
  const items = (data ?? []).filter((a) => a.phase === phase);
  if (items.length === 0) return null;

  const rank = (a: ReasoningAssessmentSummary) => (a.instrument === "subject" ? 0 : 1);
  const sorted = items.slice().sort((x, y) => rank(x) - rank(y));

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif font-semibold">{HEADINGS[phase]}</h3>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            practice only
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{BLURBS[phase]}</p>
        <div className="flex flex-col gap-2">
          {sorted.map((a) => (
            <Row key={a.id} a={a} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
