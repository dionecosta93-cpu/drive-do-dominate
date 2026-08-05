import { dateKey, taskAppearsOn, taskCompletedOn, type CompletedSession, type Task } from "@/lib/store";

const sessionDate = (s: CompletedSession) => s.scheduledDate ?? dateKey(new Date(s.completedAt));
const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export interface Report {
  topTask: { name: string; count: number } | null;
  bestHour: { hour: number; count: number } | null;
  bestWeekday: { name: string; count: number } | null;
  worstCategory: { category: string; rate: number } | null;
  minutesByCategory: [string, number][];
  totalMinutes: number;
  savedMinutes: number;
  weekly: { label: string; value: number }[];
  monthly: { label: string; value: number }[];
  dayColors: { date: string; pct: number }[];
}

export const buildReport = (tasks: Task[], sessions: CompletedSession[]): Report => {
  const count = <T extends string | number>(vals: T[]) => {
    const m = new Map<T, number>();
    for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const byName = count(sessions.map((s) => s.taskName));
  const byHour = count(sessions.map((s) => s.hourOfDay));
  const byWeekday = count(sessions.map((s) => new Date(sessionDate(s) + "T12:00:00").getDay()));

  // Taxa de abandono por categoria (últimos 30 dias)
  const days: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dateKey(d));
  }
  const planned = new Map<string, number>();
  const done = new Map<string, number>();
  for (const d of days) {
    for (const t of tasks) {
      if (!taskAppearsOn(t, d)) continue;
      planned.set(t.category, (planned.get(t.category) ?? 0) + 1);
      if (taskCompletedOn(t.id, sessions, d)) done.set(t.category, (done.get(t.category) ?? 0) + 1);
    }
  }
  let worstCategory: Report["worstCategory"] = null;
  for (const [cat, total] of planned) {
    const rate = Math.round(100 - ((done.get(cat) ?? 0) / total) * 100);
    if (!worstCategory || rate > worstCategory.rate) worstCategory = { category: cat, rate };
  }

  const minutesMap = new Map<string, number>();
  for (const s of sessions) minutesMap.set(s.category, (minutesMap.get(s.category) ?? 0) + s.spentSeconds / 60);
  const minutesByCategory = [...minutesMap.entries()]
    .map(([k, v]) => [k, Math.round(v)] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const totalMinutes = Math.round(sessions.reduce((a, s) => a + s.spentSeconds, 0) / 60);
  const savedMinutes = Math.max(
    0,
    Math.round(sessions.reduce((a, s) => a + (s.estimatedMinutes * 60 - s.spentSeconds), 0) / 60),
  );

  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    weekly.push({
      label: weekdayNames[d.getDay()]!.slice(0, 3),
      value: sessions.filter((s) => sessionDate(s) === k).length,
    });
  }

  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.push({
      label: d.toLocaleDateString("pt-BR", { month: "short" }),
      value: sessions.filter((s) => sessionDate(s).startsWith(prefix)).length,
    });
  }

  const dayColors = days
    .slice()
    .reverse()
    .map((d) => {
      const list = tasks.filter((t) => taskAppearsOn(t, d));
      const doneCount = list.filter((t) => taskCompletedOn(t.id, sessions, d)).length;
      return { date: d, pct: list.length ? Math.round((doneCount / list.length) * 100) : 0 };
    });

  return {
    topTask: byName[0] ? { name: byName[0][0], count: byName[0][1] } : null,
    bestHour: byHour[0] ? { hour: byHour[0][0], count: byHour[0][1] } : null,
    bestWeekday: byWeekday[0] ? { name: weekdayNames[byWeekday[0][0]]!, count: byWeekday[0][1] } : null,
    worstCategory,
    minutesByCategory,
    totalMinutes,
    savedMinutes,
    weekly,
    monthly,
    dayColors,
  };
};

export interface Suggestion {
  id: string;
  title: string;
  detail: string;
  taskId?: string;
  patch?: Partial<Task>;
}

/** IA heurística: aprende padrões e sugere ajustes — nunca aplica sozinha. */
export const buildSuggestions = (tasks: Task[], sessions: CompletedSession[]): Suggestion[] => {
  const out: Suggestion[] = [];
  const active = tasks.filter((t) => !t.archived && t.status !== "cancelada");

  // 1) Tarefas que nunca são concluídas no horário marcado
  for (const t of active) {
    const ts = sessions.filter((s) => s.taskId === t.id);
    const planned = (() => {
      let n = 0;
      for (let i = 0; i < 21; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (taskAppearsOn(t, dateKey(d))) n += 1;
      }
      return n;
    })();
    if (planned >= 5 && ts.length === 0) {
      out.push({
        id: `never-${t.id}`,
        title: `"${t.name}" nunca é concluída às ${t.time}`,
        detail: "Sugestão: mover para um horário em que você costuma render mais.",
        taskId: t.id,
      });
      continue;
    }
    if (ts.length >= 3) {
      const avgHour = Math.round(ts.reduce((a, s) => a + s.hourOfDay, 0) / ts.length);
      const plannedHour = Number(t.time.split(":")[0] ?? 0);
      if (Math.abs(avgHour - plannedHour) >= 2) {
        out.push({
          id: `shift-${t.id}`,
          title: `Você costuma fazer "${t.name}" por volta das ${String(avgHour).padStart(2, "0")}:00`,
          detail: `Está marcada para ${t.time}. Quer mover para ${String(avgHour).padStart(2, "0")}:00?`,
          taskId: t.id,
          patch: { time: `${String(avgHour).padStart(2, "0")}:00` },
        });
      }
    }
  }

  // 2) Conflitos de horário hoje
  const today = dateKey();
  const dayList = active
    .filter((t) => taskAppearsOn(t, today))
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));
  for (let i = 1; i < dayList.length; i++) {
    const prev = dayList[i - 1]!;
    const cur = dayList[i]!;
    const toMin = (x: string) => Number(x.split(":")[0]) * 60 + Number(x.split(":")[1]);
    if (toMin(prev.time) + prev.estimatedMinutes > toMin(cur.time)) {
      const newMin = toMin(prev.time) + prev.estimatedMinutes;
      const hh = String(Math.floor(newMin / 60) % 24).padStart(2, "0");
      const mm = String(newMin % 60).padStart(2, "0");
      out.push({
        id: `conflict-${cur.id}`,
        title: `Conflito: "${prev.name}" invade "${cur.name}"`,
        detail: `Sugestão: mover "${cur.name}" para ${hh}:${mm}.`,
        taskId: cur.id,
        patch: { time: `${hh}:${mm}` },
      });
    }
  }

  // 3) Excesso de tarefas no mesmo período
  const buckets = new Map<string, Task[]>();
  for (const t of dayList) {
    const h = Number(t.time.split(":")[0] ?? 0);
    const b = h < 12 ? "manhã" : h < 18 ? "tarde" : "noite";
    buckets.set(b, [...(buckets.get(b) ?? []), t]);
  }
  for (const [b, list] of buckets) {
    if (list.length >= 5) {
      out.push({
        id: `overload-${b}`,
        title: `${list.length} tarefas concentradas na ${b}`,
        detail: "Sugestão: distribuir algumas ao longo do dia para não sobrecarregar.",
      });
    }
  }

  return out.slice(0, 8);
};

/** Mensagens de motivação inteligente baseadas no comportamento recente. */
export const buildNudges = (
  tasks: Task[],
  sessions: CompletedSession[],
  streak: number,
): string[] => {
  const out: string[] = [];
  const today = dateKey();
  const doneToday = sessions.filter((s) => sessionDate(s) === today).length;
  const dayTasks = tasks.filter((t) => taskAppearsOn(t, today));
  const pending = dayTasks.filter((t) => !taskCompletedOn(t.id, sessions, today)).length;

  if (streak > 0 && doneToday === 0) out.push(`Falta apenas uma tarefa para manter sua sequência de ${streak} dias.`);
  if (pending === 1) out.push("Falta apenas 1 missão para fechar o dia inteiro.");

  const lastStudy = sessions.filter((s) => s.category === "estudo").sort((a, b) => b.completedAt - a.completedAt)[0];
  if (lastStudy) {
    const days = Math.floor((Date.now() - lastStudy.completedAt) / 86400000);
    if (days >= 3) out.push(`Você está há ${days} dias sem estudar. Vamos retomar?`);
  }

  if (sessions.length > 0 && sessions.length % 10 >= 8) out.push("Você está perto de desbloquear uma nova conquista.");

  return out.slice(0, 3);
};
