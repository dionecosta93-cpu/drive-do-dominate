import {
  dateKey,
  taskCompletedOn,
  todaysTasks,
  type CompletedSession,
  type Task,
} from "@/lib/store";

/** Mensagens motivacionais para tarefas não concluídas (variam por tarefa/dia). */
export const MISSED_MESSAGES = [
  "Você deixou uma tarefa para trás. Ainda dá tempo de recuperar o ritmo. 🔥",
  "Um dia ruim não precisa virar uma semana ruim. Volte para a Forja. 🔥",
  "Você perdeu uma tarefa, não perdeu seu progresso. Continue.",
  "Sua sequência está em risco. Vamos recuperar o ritmo?",
  "Disciplina não é nunca falhar. É voltar depois da falha.",
  "A Forja não julga o tropeço, julga a desistência. Retome agora.",
  "Ainda há tempo hoje. Uma tarefa recuperada vale mais que uma desculpa.",
];

export const missedMessageFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return MISSED_MESSAGES[h % MISSED_MESSAGES.length]!;
};

export interface MissedTask {
  task: Task;
  date: string;
  key: string;
  message: string;
}

const minutesOfDay = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Tarefas cujo período já terminou e continuam pendentes.
 * Inclui o dia atual (horário já passado) e os dias anteriores recentes.
 */
export function missedTasks(
  tasks: Task[],
  sessions: CompletedSession[],
  dismissed: string[],
  now = new Date(),
  daysBack = 3,
): MissedTask[] {
  const out: MissedTask[] = [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = dateKey(now);

  for (let i = 0; i <= daysBack; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const date = dateKey(d);
    for (const t of todaysTasks(tasks, date)) {
      if (t.archived || t.status === "cancelada") continue;
      if (taskCompletedOn(t.id, sessions, date)) continue;
      const endMin = minutesOfDay(t.endTime || t.time) + (t.endTime ? 0 : t.estimatedMinutes || 0);
      if (date === today && nowMin < endMin) continue; // ainda dentro do período
      const key = `${t.id}|${date}`;
      if (dismissed.includes(key)) continue;
      out.push({ task: t, date, key, message: missedMessageFor(key) });
    }
  }
  return out.sort((a, b) =>
    a.date === b.date ? a.task.time.localeCompare(b.task.time) : a.date < b.date ? 1 : -1,
  );
}

export interface DailySummary {
  date: string;
  done: number;
  missed: number;
  xpToday: number;
  streak: number;
  disciplinePct: number;
  message: string;
}

export function dailySummary(
  tasks: Task[],
  sessions: CompletedSession[],
  streak: number,
  discipline: number,
  date = dateKey(),
): DailySummary {
  const list = todaysTasks(tasks, date);
  const done = list.filter((t) => taskCompletedOn(t.id, sessions, date)).length;
  const missed = Math.max(0, list.length - done);
  const xpToday = sessions
    .filter((s) => (s.scheduledDate ?? dateKey(new Date(s.completedAt))) === date)
    .reduce((a, b) => a + (b.xp || 0), 0);
  const disciplinePct = Math.round((discipline / 1000) * 100);

  const ratio = list.length ? done / list.length : 0;
  const message =
    list.length === 0
      ? "Dia sem missões cadastradas. Planeje amanhã antes de dormir."
      : ratio === 1
        ? "Dia perfeito. É assim que a disciplina vira identidade. 🔥"
        : ratio >= 0.7
          ? "Ótimo dia. Poucas pendências — amanhã você fecha tudo."
          : ratio >= 0.3
            ? "Meio caminho andado. Recupere o ritmo amanhã logo cedo."
            : "Dia difícil. Disciplina não é nunca falhar, é voltar depois da falha.";

  return { date, done, missed, xpToday, streak, disciplinePct, message };
}
