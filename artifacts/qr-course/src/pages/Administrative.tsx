import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/components/AuthGate";
import { ShieldCheck, Users } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type SeriesPoint = { label: string; count: number };

type VisitsResponse = {
  stats: {
    allTime: number;
    last24Hours: number;
    lastMonth: number;
    lastYear: number;
  };
  series: {
    last24Hours: SeriesPoint[];
    lastMonth: SeriesPoint[];
    lastYear: SeriesPoint[];
    allTime: SeriesPoint[];
  };
  visits: Array<{ id: number; email: string | null; visitedAt: string }>;
};

function buildWeekSeries(visits: VisitsResponse["visits"]): SeriesPoint[] {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const start = now - 7 * DAY;
  const counts = new Array(7).fill(0) as number[];
  for (const v of visits) {
    const t = new Date(v.visitedAt).getTime();
    if (t >= start) {
      const idx = Math.min(Math.floor((t - start) / DAY), 6);
      counts[idx]++;
    }
  }
  return counts.map((count, i) => ({
    label: new Date(start + i * DAY).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count,
  }));
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-3xl font-semibold mt-1" data-testid={`stat-${label.replace(/\s+/g, "-").toLowerCase()}`}>
        {value}
      </div>
    </div>
  );
}

function LoginChart({ title, data }: { title: string; data: SeriesPoint[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: number) => [value, "Logins"]}
              labelStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Administrative() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  const { data, isLoading, isError, error } = useQuery<VisitsResponse>({
    queryKey: ["admin-visits"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/admin/visits`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: isAdmin,
  });

  if (!authLoading && !isAdmin) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="text-center text-muted-foreground">
            <ShieldCheck className="w-8 h-8 mx-auto mb-3" />
            <p>This page is restricted to the site owner.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const weekSeries = data ? buildWeekSeries(data.visits) : [];
  const lastWeekCount = weekSeries.reduce((s, p) => s + p.count, 0);

  return (
    <Layout>
      <div className="p-8 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="font-serif text-2xl font-semibold">Administrative</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Google sign-in activity for this site. Visible only to the owner.
        </p>

        {isLoading && (
          <div className="text-muted-foreground py-10 text-center">
            Loading login analytics…
          </div>
        )}
        {isError && (
          <div className="text-destructive py-10 text-center" data-testid="text-admin-error">
            Failed to load login data: {(error as Error)?.message}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <StatCard label="Last day" value={data.stats.last24Hours} />
              <StatCard label="Last week" value={lastWeekCount} />
              <StatCard label="Last month" value={data.stats.lastMonth} />
              <StatCard label="Last year" value={data.stats.lastYear} />
              <StatCard label="All time" value={data.stats.allTime} />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-10">
              <LoginChart title="Logins — last 24 hours" data={data.series.last24Hours} />
              <LoginChart title="Logins — last 7 days (from 500 most recent)" data={weekSeries} />
              <LoginChart title="Logins — last 30 days" data={data.series.lastMonth} />
              <LoginChart title="Logins — last year" data={data.series.lastYear} />
              <LoginChart title="Logins — all time" data={data.series.allTime} />
            </div>

            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">
                  Login history ({data.visits.length} most recent)
                </h2>
              </div>
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                      <th className="px-4 py-2 font-medium">Google account</th>
                      <th className="px-4 py-2 font-medium">Signed in at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.visits.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                          No logins recorded yet.
                        </td>
                      </tr>
                    )}
                    {data.visits.map((v) => (
                      <tr key={v.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2" data-testid={`row-visit-email-${v.id}`}>
                          {v.email ?? "(no email)"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {new Date(v.visitedAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
