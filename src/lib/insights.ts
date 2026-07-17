import type { CompletedSession, Task } from "./store";

export function generateInsight(sessions: CompletedSession[], tasks: Task[]): string | null {
  if (sessions.length < 3) return null;

  // best hour of day
  const byHour: Record<number, { count: number; totalXp: number }> = {};
  for (const s of sessions) {
    byHour[s.hourOfDay] ??= { count: 0, totalXp: 0 };
    byHour[s.hourOfDay].count += 1;
    byHour[s.hourOfDay].totalXp += s.xp;
  }
  const hours = Object.entries(byHour).sort((a, b) => b[1].totalXp - a[1].totalXp);
  const bestHour = hours[0] ? Number(hours[0][0]) : null;

  // pauses on hard tasks
  const hardSessions = sessions.filter((s) => s.difficulty >= 7);
  const avgPausesHard = hardSessions.length
    ? hardSessions.reduce((a, b) => a + b.pauses, 0) / hardSessions.length
    : 0;

  // procrastinated tasks (never completed)
  const completedIds = new Set(sessions.map((s) => s.taskId));
  const stale = tasks.filter((t) => !completedIds.has(t.id) && Date.now() - t.createdAt > 3 * 86400000);

  if (stale.length > 0) {
    return `Você tem ${stale.length} tarefa${stale.length > 1 ? "s" : ""} pendente${stale.length > 1 ? "s" : ""} há mais de 3 dias. Comece pela mais difícil hoje.`;
  }
  if (avgPausesHard > 2) {
    return "Você pausa muito em tarefas difíceis. Tente reduzi-las em blocos menores de 25 minutos.";
  }
  if (bestHour !== null) {
    const period = bestHour < 12 ? "manhã" : bestHour < 18 ? "tarde" : "noite";
    return `Sua melhor performance é pela ${period} (por volta das ${bestHour}h). Reserve tarefas difíceis para esse horário.`;
  }
  return null;
}
