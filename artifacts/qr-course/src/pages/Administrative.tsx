import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ShieldCheck, Loader2 } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type SeriesPoint = { label: string; count: number };

type AdminVisits = {
  stats: {
    allTime: number;
    last24Hours: number;
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
  };
  series: {
    last24Hours: SeriesPoint[];
    lastWeek: SeriesPoint[];
    lastMonth: SeriesPoint[];
    lastYear: SeriesPoint[];
    allTime: SeriesPoint[];
  };
  visits: Array<{ id: number; email: string | null; visitedAt: string }>;
};

const PERIODS = [
  { key: "last24Hours", label: "Last Day" },
  { key: "lastWeek", label: "Last Week" },
  { key: "lastMonth", label: "Last Month" },
  { key: "lastYear", label: "Last Year" },
  { key: "allTime", label: "All Time" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

export default function Administrative() {
  const [period, setPeriod] = useState<PeriodKey>("lastWeek");

  const { data, isLoading, error } = useQuery<AdminVisits>({
    queryKey: ["admin-visits"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/admin/visits`, {
        credentials: "include",
      });
      if (res.status === 403) throw new Error("forbidden");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    retry: false,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    const forbidden = (error as Error).message === "forbidden";
    return (
      <div className="p-8 max-w-xl">
        <h1 className="font-serif text-2xl font-semibold mb-2">Administrative</h1>
        <p className="text-muted-foreground" data-testid="text-admin-error">
          {forbidden
            ? "This page is restricted to the site owner."
            : "Failed to load login data. Try again in a moment."}
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold">Administrative</h1>
          <p className="text-sm text-muted-foreground">
            Google logins — who signed in, when, and how often.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {PERIODS.map((p) => (
          <div
            key={p.key}
            className="border border-border rounded-lg p-4 bg-card"
            data-testid={`stat-${p.key}`}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {p.label}
            </div>
            <div className="text-2xl font-semibold mt-1">
              {data.stats[p.key].toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">logins</div>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg bg-card">
        <div className="flex items-center justify-between px-4 pt-4 flex-wrap gap-2">
          <h2 className="font-medium">Logins over time</h2>
          <div className="flex gap-1 flex-wrap">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1 rounded-md text-sm ${
                  period === p.key
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-secondary"
                }`}
                data-testid={`button-period-${p.key}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.series[period]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar
                dataKey="count"
                name="Logins"
                fill="hsl(222 47% 30%)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-medium">
          Login history{" "}
          <span className="text-sm text-muted-foreground font-normal">
            (most recent {data.visits.length})
          </span>
        </div>
        {data.visits.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No logins recorded yet.
          </div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Gmail</th>
                  <th className="px-4 py-2 font-medium">Signed in at</th>
                </tr>
              </thead>
              <tbody>
                {data.visits.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-border"
                    data-testid={`row-visit-${v.id}`}
                  >
                    <td className="px-4 py-2">{v.email ?? "—"}</td>
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
        )}
      </div>
    </div>
  );
}
