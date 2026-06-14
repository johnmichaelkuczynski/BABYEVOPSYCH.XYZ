import React from "react";
import { useGetWeek } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import { ReasoningCallout } from "@/components/ReasoningCallout";

const UNIT_PHASES = ["after"] as const;

export default function WeekView() {
  const params = useParams();
  const weekNumber = Number(params.weekNumber);
  const { data: week, isLoading } = useGetWeek(weekNumber);

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        {isLoading ? (
          <div>
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-full max-w-2xl" />
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">Unit {week?.weekNumber}: {week?.title}</h1>
            <p className="text-lg text-muted-foreground">{week?.summary}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-serif font-semibold border-b pb-2">Lectures</h2>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : week?.lectures.length === 0 ? (
            <div className="text-muted-foreground">No lectures for this unit.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {week?.lectures.map(lecture => (
                <Link key={lecture.id} href={`/lectures/${lecture.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-lg">{lecture.title}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-serif font-semibold border-b pb-2">Assignments</h2>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : week?.assignments.length === 0 ? (
            <div className="text-muted-foreground">No assignments for this unit.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {week?.assignments.map(item => (
                <Card key={item.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {item.kind}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="text-sm text-muted-foreground flex gap-4">
                      <span>{item.problemCount} problems</span>
                    </div>
                    <Link href={`/assignments/${item.id}`}>
                      <div className="w-full text-center py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
                        Open
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {!isLoading && weekNumber === 1 && (
          <ReasoningCallout phase={UNIT_PHASES[0]} />
        )}
      </div>
    </Layout>
  );
}
