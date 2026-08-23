import { dateKey, dayStats, todaysTasks, type CompletedSession, type Task } from "@/lib/store";

export interface DayPerformance {
  date: string;
  label: string;
  pct: number;
  total: number;
  done: number;
  dismissed: number;
  pending: number;
}

export interface PerformanceReport {
  days: DayPerformance[];
  average: number;
  best: DayPerformance | null;
  worst: DayPerformance | null;
  totalDone: number;
  totalDismissed: number;
  totalPending: number;
  analyzedDays: number;
  weeks: { label: string; pct: number }[];
  trend: "up" | "flat" | "down";
}

const shortLabel = (date: string, range: number) => {
  const d = new Date(date + "T12:00:00");
  if (range <= 7) return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

/** Desempenho real por dia, considerando tarefas concluídas e dispensadas. */
export const buildPerformance = (
  tasks: Task[],
  sessions: CompletedSession[],
  dismissedMissed: string[],
  range: 7 | 30 | 90,
): PerformanceReport => {
  const dismissedSet = new Set(dismissedMissed);
  const days: DayPerformance[] = [];

  for (let i = range - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = dateKey(d);
    const { total, done } = dayStats(tasks, sessions, date);
    const list = todaysTasks(tasks, date);
    const dismissed = list.filter((t) => dismissedSet.has(`${t.id}|${date}`)).length;
    const pending = Math.max(total - done - dismissed, 0);
    days.push({
      date,
      label: shortLabel(date, range),
      pct: total === 0 ? 0 : Math.round((done / total) * 100),
      total,
      done,
      dismissed,
      pending,
    });
  }

  const active = days.filter((d) => d.total > 0);
  const average = active.length ? Math.round(active.reduce((a, d) => a + d.pct, 0) / active.length) : 0;
  const best = active.length ? active.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
  const worst = active.length ? active.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;

  // Evolução semanal (blocos de 7 dias)
  const weeks: { label: string; pct: number }[] = [];
  const blocks = Math.ceil(days.length / 7);
  for (let b = 0; b < blocks; b++) {
    const chunk = days.slice(b * 7, b * 7 + 7).filter((d) => d.total > 0);
    if (chunk.length === 0) continue;
    weeks.push({
      label: `Semana ${b + 1}`,
      pct: Math.round(chunk.reduce((a, d) => a + d.pct, 0) / chunk.length),
    });
  }

  let trend: PerformanceReport["trend"] = "flat";
  if (weeks.length >= 2) {
    const diff = weeks[weeks.length - 1]!.pct - weeks[weeks.length - 2]!.pct;
    trend = diff >= 5 ? "up" : diff <= -5 ? "down" : "flat";
  }

  return {
    days,
    average,
    best,
    worst,
    totalDone: days.reduce((a, d) => a + d.done, 0),
    totalDismissed: days.reduce((a, d) => a + d.dismissed, 0),
    totalPending: days.reduce((a, d) => a + d.pending, 0),
    analyzedDays: active.length,
    weeks,
    trend,
  };
};
